import { requireClientSession } from './shell';
import { createUserService } from '../../src/services/api/userService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import { createTransactionService } from '../../src/services/api/transactionService';
import { createMarketService } from '../../src/services/market/marketService';
import type { Profile, InvestmentPlan } from '../../src/types/database';
import { formatCurrency } from './format';
import { bucketByRecency, renderActivityList } from './walletActivity';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const userService = createUserService();
const investmentService = createInvestmentService();
const transactionService = createTransactionService();
const marketService = createMarketService();

const CARD_BACKGROUNDS = ['bg-YellowGreen bg-5', 'bg-blue-1 bg-6', 'bg-pink-1 bg-7', 'bg-Black bg-8'];

function renderProfile(profile: Profile): void {
  const avatarEl = document.getElementById('profileAvatar') as HTMLImageElement | null;
  if (avatarEl && profile.avatarUrl) avatarEl.src = profile.avatarUrl;

  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = profile.fullName || profile.email;

  const joinEl = document.getElementById('profileJoinDate');
  if (joinEl) joinEl.textContent = new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function wireProfileEdit(profile: Profile): void {
  const toggle = document.getElementById('profileEditToggle');
  const form = document.getElementById('profileEditForm') as HTMLFormElement | null;
  const cancel = document.getElementById('profileEditCancel');
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement | null;
  const avatarInput = document.getElementById('profileAvatarInput') as HTMLInputElement | null;
  const submitButton = document.getElementById('profileEditSubmit') as HTMLButtonElement | null;
  const errorEl = document.getElementById('profileEditError');
  if (!toggle || !form || !cancel || !nameInput || !avatarInput || !submitButton || !errorEl) return;

  function showError(message: string): void {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = '';
    }
  }

  function hideError(): void {
    if (errorEl) errorEl.style.display = 'none';
  }

  toggle.addEventListener('click', () => {
    nameInput.value = profile.fullName;
    avatarInput.value = '';
    hideError();
    form.style.display = 'block';
    toggle.style.display = 'none';
  });

  cancel.addEventListener('click', () => {
    form.style.display = 'none';
    toggle.style.display = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    const fullName = nameInput.value.trim();
    if (!fullName) {
      showError('Enter your name.');
      return;
    }

    const avatarFile = avatarInput.files?.[0];
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';

    const uploadStep = avatarFile ? userService.uploadAvatar(profile.id, avatarFile) : Promise.resolve(undefined);

    void uploadStep
      .then((avatarUrl) => userService.updateProfile(profile.id, { fullName, ...(avatarUrl ? { avatarUrl } : {}) }))
      .then((updated) => {
        profile.fullName = updated.fullName;
        profile.avatarUrl = updated.avatarUrl;

        const nameEl = document.getElementById('profileName');
        if (nameEl) nameEl.textContent = updated.fullName;

        const avatarEl = document.getElementById('profileAvatar') as HTMLImageElement | null;
        if (avatarEl && updated.avatarUrl) avatarEl.src = updated.avatarUrl;

        const headerAvatarEl = document.getElementById('userAvatar') as HTMLImageElement | null;
        if (headerAvatarEl && updated.avatarUrl) headerAvatarEl.src = updated.avatarUrl;

        form.style.display = 'none';
        toggle.style.display = '';
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to save your profile. Please try again.');
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Save';
      });
  });
}

interface HoldingGroup {
  planId: string;
  planName: string;
  amount: number;
  currentEarnings: number;
  rate: number;
  rateType: string;
  status: string;
  count: number;
}

async function renderHoldings(userId: string): Promise<void> {
  const [investments, plans] = await Promise.all([investmentService.listMyInvestments(userId), investmentService.listPlans()]);
  const planById = new Map<string, InvestmentPlan>(plans.map((p) => [p.id, p]));

  const active = investments.filter((inv) => inv.status === 'active' || inv.status === 'completed');

  // Multiple investments in the same plan (a client topping up "Growth"
  // more than once) get collapsed into one card showing the combined
  // amount/earnings rather than a run of near-identical boxes.
  const grouped = new Map<string, HoldingGroup>();
  for (const inv of active) {
    const existing = grouped.get(inv.planId);
    if (existing) {
      existing.amount += inv.amount;
      existing.currentEarnings += inv.currentEarnings;
      existing.count += 1;
      if (inv.status === 'active') existing.status = 'active';
    } else {
      grouped.set(inv.planId, {
        planId: inv.planId,
        planName: planById.get(inv.planId)?.name ?? 'Plan',
        amount: inv.amount,
        currentEarnings: inv.currentEarnings,
        rate: inv.rate,
        rateType: inv.rateType,
        status: inv.status,
        count: 1,
      });
    }
  }
  const holdings = Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const container = document.getElementById('investmentHoldings');
  if (!container) return;

  if (holdings.length === 0) {
    container.innerHTML = '<p class="f14-regular text-Gray">No investments yet.</p>';
    return;
  }

  container.innerHTML = holdings
    .map((holding, index) => {
      // bg-YellowGreen (rust) and bg-Black are dark enough that the default
      // dark/gray text is unreadable on them; bg-blue-1/bg-pink-1 are light
      // pastels where dark text already reads fine.
      const isDark = index === 0 || index === 3;
      const textClass = isDark ? 'text-White' : '';
      const labelClass = isDark ? 'text-White' : 'text-GrayDark';
      return `
        <div class="w-100">
          <div class="wg-card style-1 ${CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]} mb-16">
            <div class="flex items-center gap8">
              <div class="f12-bold ${textClass}">${holding.planName}${holding.count > 1 ? ` <span class="${labelClass}">(${holding.count} investments)</span>` : ''}</div>
            </div>
            <div class="content">
              <div class="flex gap2 align-items-end flex-wrap">
                <h6 class="mb-0 ${textClass}">${formatCurrency(holding.amount)}</h6>
                <div class="f12-medium ${textClass}">${holding.rate}% <span class="${labelClass}">${holding.rateType}</span></div>
              </div>
            </div>
            <div class="bottom">
              <div class="infor-number">
                <div class="flex gap4 f12-medium">
                  <span class="${labelClass}">Status</span>
                  <span class="${textClass} text-capitalize">${holding.status}</span>
                </div>
                <div class="flex gap8 f12-medium">
                  <span class="${labelClass}">Earnings</span>
                  <span class="${textClass}">${formatCurrency(holding.currentEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');
}

async function renderActivity(userId: string): Promise<void> {
  const transactions = await transactionService.list({ userId });
  const buckets = bucketByRecency(transactions);

  const week = document.getElementById('accountActivityWeek');
  const month = document.getElementById('accountActivityMonth');
  const year = document.getElementById('accountActivityYear');
  if (week) renderActivityList(week, buckets.week);
  if (month) renderActivityList(month, buckets.month);
  if (year) renderActivityList(year, buckets.year);
}

async function renderMarketTrend(): Promise<void> {
  const history = await marketService.getHistory(60);
  const container = document.querySelector('#account-market-chart');
  if (!container || history.length === 0) return;

  new ApexCharts(container, {
    chart: { height: 300, type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: ['#a8442e'],
    series: [{ name: '$', data: history.map((point) => Number(point.value.toFixed(2))) }],
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      labels: { show: false },
      categories: history.map((point) => new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

async function main() {
  const profile = await requireClientSession();
  renderProfile(profile);
  wireProfileEdit(profile);
  await Promise.all([renderHoldings(profile.id), renderActivity(profile.id), renderMarketTrend()]);
}

void main();
