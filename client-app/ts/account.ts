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
  if (!toggle || !form || !cancel || !nameInput) return;

  toggle.addEventListener('click', () => {
    nameInput.value = profile.fullName;
    form.style.display = 'block';
    toggle.style.display = 'none';
  });

  cancel.addEventListener('click', () => {
    form.style.display = 'none';
    toggle.style.display = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void userService.updateProfile(profile.id, { fullName: nameInput.value.trim() }).then(() => {
      const nameEl = document.getElementById('profileName');
      if (nameEl) nameEl.textContent = nameInput.value.trim();
      form.style.display = 'none';
      toggle.style.display = '';
    });
  });
}

async function renderHoldings(userId: string): Promise<void> {
  const [investments, plans] = await Promise.all([investmentService.listMyInvestments(userId), investmentService.listPlans()]);
  const planById = new Map<string, InvestmentPlan>(plans.map((p) => [p.id, p]));

  const active = investments.filter((inv) => inv.status === 'active' || inv.status === 'completed').slice(0, 4);
  const container = document.getElementById('investmentHoldings');
  if (!container) return;

  if (active.length === 0) {
    container.innerHTML = '<p class="f14-regular text-Gray">No investments yet.</p>';
    return;
  }

  container.innerHTML = active
    .map((inv, index) => {
      const plan = planById.get(inv.planId);
      const isDark = index === 3;
      return `
        <div class="w-100">
          <div class="wg-card style-1 ${CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]} mb-16">
            <div class="flex items-center gap8">
              <div class="f12-bold ${isDark ? 'text-White' : ''}">${plan?.name ?? 'Plan'}</div>
            </div>
            <div class="content">
              <div class="flex gap2 align-items-end flex-wrap">
                <h6 class="mb-0 ${isDark ? 'text-White' : ''}">${formatCurrency(inv.amount)}</h6>
                <div class="f12-medium ${isDark ? 'text-White' : ''}">${inv.rate}% <span class="text-GrayDark">${inv.rateType}</span></div>
              </div>
            </div>
            <div class="bottom">
              <div class="infor-number">
                <div class="flex gap4 f12-medium">
                  <span class="text-GrayDark">Status</span>
                  <span class="${isDark ? 'text-White' : ''} text-capitalize">${inv.status}</span>
                </div>
                <div class="flex gap8 f12-medium">
                  <span class="text-GrayDark">Earnings</span>
                  <span class="${isDark ? 'text-White' : ''}">${formatCurrency(inv.currentEarnings)}</span>
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
    colors: ['#c6a15b'],
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
