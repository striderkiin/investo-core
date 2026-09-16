import { requireClientSession } from './shell';
import { createUserService } from '../../src/services/api/userService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import { createTransactionService } from '../../src/services/api/transactionService';
import type { Profile, InvestmentPlan } from '../../src/types/database';
import { formatCurrency } from './format';
import { bucketByRecency, renderActivityList } from './walletActivity';
import { mountMarketWidget } from './marketWidget';
import { renderAvatar, buildAvatarNode } from './avatarRender';
import { resolveAvatar, AVATAR_LIBRARY } from '../../src/shared/avatar';
import { loadSection, showLoading } from './pageState';

const userService = createUserService();
const investmentService = createInvestmentService();
const transactionService = createTransactionService();

const CARD_BACKGROUNDS = ['bg-YellowGreen bg-5', 'bg-blue-1 bg-6', 'bg-pink-1 bg-7', 'bg-Black bg-8'];

function renderProfile(profile: Profile): void {
  renderAvatar('profileAvatar', { photoUrl: profile.avatarUrl, avatarKey: profile.avatarKey, displayName: profile.fullName });

  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = profile.fullName || profile.email;

  const joinEl = document.getElementById('profileJoinDate');
  if (joinEl) joinEl.textContent = new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * "None" (avatarKey null, falls to initials/brand-mark) plus every library
 * entry, each drawn as a real preview via resolveAvatar/buildAvatarNode so
 * a tile always looks exactly like the avatar it produces.
 */
function renderAvatarPickerGrid(profile: Profile, selectedKey: string | null, onSelect: (key: string | null) => void): void {
  const grid = document.getElementById('avatarPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const options: Array<{ key: string | null; label: string }> = [
    { key: null, label: 'None (use initials)' },
    ...AVATAR_LIBRARY.map((entry) => ({ key: entry.key, label: entry.label })),
  ];

  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = option.label;
    button.setAttribute('aria-pressed', String(option.key === selectedKey));
    Object.assign(button.style, {
      width: '40px',
      height: '40px',
      padding: '0',
      border: option.key === selectedKey ? '2px solid var(--ic-primary)' : '2px solid transparent',
      borderRadius: '50%',
      background: 'none',
      cursor: 'pointer',
      flexShrink: '0',
    });
    const resolution = resolveAvatar({ avatarKey: option.key, displayName: profile.fullName });
    button.appendChild(buildAvatarNode(resolution));
    button.addEventListener('click', () => onSelect(option.key));
    grid.appendChild(button);
  }
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

  // Undefined = the user hasn't touched the picker this edit session, so
  // Save leaves avatarKey exactly as it was; null/a library key means they
  // explicitly chose one, which always also clears the uploaded photo
  // (unless they *also* pick a new file this same session — see below)
  // since otherwise the pick would have no visible effect, photoUrl always
  // wins the fallback chain over avatarKey.
  let pendingAvatarKey: string | null | undefined;

  function onAvatarPick(key: string | null): void {
    pendingAvatarKey = key;
    renderAvatarPickerGrid(profile, key, onAvatarPick);
  }

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
    pendingAvatarKey = undefined;
    renderAvatarPickerGrid(profile, profile.avatarKey, onAvatarPick);
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
      .then((uploadedUrl) => {
        const updates: Partial<Pick<Profile, 'fullName' | 'avatarUrl' | 'avatarKey'>> = { fullName };
        if (uploadedUrl) updates.avatarUrl = uploadedUrl;
        if (pendingAvatarKey !== undefined) {
          updates.avatarKey = pendingAvatarKey;
          if (!uploadedUrl) updates.avatarUrl = null;
        }
        return userService.updateProfile(profile.id, updates);
      })
      .then((updated) => {
        profile.fullName = updated.fullName;
        profile.avatarUrl = updated.avatarUrl;
        profile.avatarKey = updated.avatarKey;

        const nameEl = document.getElementById('profileName');
        if (nameEl) nameEl.textContent = updated.fullName;

        renderAvatar('profileAvatar', { photoUrl: updated.avatarUrl, avatarKey: updated.avatarKey, displayName: updated.fullName });
        renderAvatar('userAvatar', { photoUrl: updated.avatarUrl, avatarKey: updated.avatarKey, displayName: updated.fullName });

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
  const container = document.getElementById('investmentHoldings');
  showLoading(container);
  return loadSection(container, () => renderHoldingsInner(userId));
}

async function renderHoldingsInner(userId: string): Promise<void> {
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
  const week = document.getElementById('accountActivityWeek');
  const month = document.getElementById('accountActivityMonth');
  const year = document.getElementById('accountActivityYear');

  try {
    const transactions = await transactionService.list({ userId });
    const buckets = bucketByRecency(transactions);
    if (week) renderActivityList(week, buckets.week);
    if (month) renderActivityList(month, buckets.month);
    if (year) renderActivityList(year, buckets.year);
  } catch (err) {
    const message = `<p class="f14-regular text-Gray mb-0">${err instanceof Error ? err.message : 'Unable to load activity.'}</p>`;
    for (const el of [week, month, year]) {
      if (el) el.innerHTML = message;
    }
  }
}

async function main() {
  const profile = await requireClientSession();
  renderProfile(profile);
  wireProfileEdit(profile);
  mountMarketWidget({
    chartSelector: '#account-market-chart',
    selectId: 'accountMarketAssetSelect',
    priceElId: 'accountMarketPrice',
    changeElId: 'accountMarketChange',
    changeClassBase: 'f12-bold',
    chartType: 'line',
    height: 300,
  });
  await Promise.all([renderHoldings(profile.id), renderActivity(profile.id)]);
}

void main();
