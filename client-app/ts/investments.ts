import { requireClientSession } from './shell';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { Investment, InvestmentPlan, InvestmentStatus } from '../../src/types/database';
import { formatCurrency } from './format';
import { loadSection } from './pageState';
import { getSupabaseClient } from '../../src/services/supabase/client';

const investmentService = createInvestmentService();
const supabase = getSupabaseClient();
const PAGE_SIZE = 20;

const STATUS_LABEL: Record<InvestmentStatus, string> = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  paused: 'PAUSED',
  cancelled: 'ENDED EARLY',
};

const STATUS_CLASS: Record<InvestmentStatus, string> = {
  active: 'bg-YellowGreen text-White',
  completed: 'bg-LightGray',
  paused: 'bg-LightGray',
  cancelled: 'bg-LightGray type-red',
};

let currentUserId = '';
let currentPage = 0;
let hasMorePages = true;
let planNameById = new Map<string, string>();
// Per investment: earnings already moved to the balance. Per plan: the minimum to move earnings.
let claimedById = new Map<string, number>();
let minWithdrawalByPlan = new Map<string, number>();

async function loadEarningsInfo(): Promise<void> {
  const [{ data: invs }, { data: plans }] = await Promise.all([
    supabase.from('investments').select('id, claimed_earnings').eq('user_id', currentUserId),
    supabase.from('investment_plans').select('id, min_withdrawal'),
  ]);
  claimedById = new Map((invs ?? []).map((r: { id: string; claimed_earnings: number }) => [r.id, Number(r.claimed_earnings ?? 0)]));
  minWithdrawalByPlan = new Map((plans ?? []).map((r: { id: string; min_withdrawal: number }) => [r.id, Number(r.min_withdrawal ?? 0)]));
}

/** Earnings figure plus, for active plans, the "Move to balance" and "End plan early" controls. */
function earningsCell(inv: Investment): string {
  const total = `<div class="f12-medium">${formatCurrency(inv.currentEarnings)}</div>`;
  if (inv.status !== 'active') return total;
  const claimed = claimedById.get(inv.id) ?? 0;
  const ready = Math.max(inv.currentEarnings - claimed, 0);
  const min = minWithdrawalByPlan.get(inv.planId) ?? 0;
  const canMove = ready > 0 && ready >= min;
  return `${total}
    <div class="f12-regular text-GrayDark" style="margin-top:4px;">Not yet moved: ${formatCurrency(ready)}${claimed > 0 ? ` · Moved: ${formatCurrency(claimed)}` : ''}</div>
    <div class="flex gap8" style="margin-top:6px;flex-wrap:wrap;">
      <button type="button" class="tf-button f12-bold" style="padding:4px 10px;" data-action="claim" data-id="${inv.id}" ${canMove ? '' : 'disabled'}
        title="${canMove ? 'Move these earnings to your available balance' : `Available once earnings reach ${formatCurrency(min)}`}">Move to balance</button>
      <button type="button" class="tf-button f12-bold" style="padding:4px 10px;background:transparent;border:1px solid currentColor;" data-action="exit" data-id="${inv.id}">End plan early</button>
    </div>
    ${canMove ? '' : `<div class="f12-regular text-GrayDark" style="margin-top:4px;">You can move earnings once they reach ${formatCurrency(min)}.</div>`}`;
}

type ExitPreview = { principal: number; earned: number; claimed: number; days: number; duration: number; halfway_at: string; past_halfway: boolean; earnings_kept: number; payout: number };

function exitMessage(p: ExitPreview): string {
  const lines = [
    `End this plan now? Day ${p.days} of ${p.duration}.`,
    '',
    p.past_halfway
      ? `You are past the halfway point, so you keep half of your earnings: ${formatCurrency(Number(p.earnings_kept))} of ${formatCurrency(Number(p.earned))}.`
      : `You are before the halfway point (${new Date(p.halfway_at).toLocaleDateString()}), so you get your investment back with no earnings.`,
  ];
  if (Number(p.claimed) > Number(p.earnings_kept)) {
    lines.push(`You already moved ${formatCurrency(Number(p.claimed))} of earnings to your balance, so the difference is taken from your investment.`);
  }
  lines.push('', `${formatCurrency(Number(p.payout))} will be added to your available balance. This cannot be undone.`);
  return lines.join('\n');
}

async function reloadInvestments(): Promise<void> {
  await loadEarningsInfo();
  const page = await investmentService.listMyInvestments(currentUserId, 0, Math.max(currentPage, 1) * PAGE_SIZE);
  loadedInvestments = page;
  renderRows(loadedInvestments);
}

function wireActions(): void {
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement | null;
    if (!button || button.disabled) return;
    const id = button.dataset.id ?? '';
    if (button.dataset.action === 'claim') {
      button.disabled = true;
      void supabase.rpc('claim_investment_earnings', { p_investment_id: id }).then(async ({ data, error }) => {
        if (error) {
          window.alert(error.message);
          button.disabled = false;
          return;
        }
        window.alert(`${formatCurrency(Number(data))} was moved to your available balance.`);
        await reloadInvestments();
      });
    } else if (button.dataset.action === 'exit') {
      void supabase.rpc('preview_early_exit', { p_investment_id: id }).then(async ({ data, error }) => {
        if (error) return window.alert(error.message);
        if (!window.confirm(exitMessage(data as ExitPreview))) return;
        button.disabled = true;
        const result = await supabase.rpc('exit_investment_early', { p_investment_id: id });
        if (result.error) {
          window.alert(result.error.message);
          button.disabled = false;
          return;
        }
        window.alert(`Plan ended. ${formatCurrency(Number((result.data as ExitPreview).payout))} was added to your available balance.`);
        await reloadInvestments();
      });
    }
  });
}

function renderRows(investments: Investment[]): void {
  const tbody = document.getElementById('investmentRows');
  const mobileList = document.getElementById('investmentMobileList');
  if (!tbody || !mobileList) return;

  if (investments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">No investments yet.</td></tr>';
    mobileList.innerHTML = '<p class="f14-regular text-Gray text-center py-4">No investments yet.</p>';
    return;
  }

  tbody.innerHTML = investments
    .map((inv) => {
      const started = new Date(inv.startedAt);
      const ends = new Date(inv.endsAt);
      return `
        <tr class="tf-table-item">
          <td>
            <div class="f12-bold">${planNameById.get(inv.planId) ?? 'Plan'}</div>
          </td>
          <td>
            <div class="f12-medium" data-title="Amount : ">${formatCurrency(inv.amount)}</div>
          </td>
          <td>
            <div class="f12-medium">${inv.rate}% / ${inv.rateType}</div>
          </td>
          <td>
            <div class="box-status ${STATUS_CLASS[inv.status]}">
              ${inv.status === 'active' ? '<i class="icon icon-check"></i>' : ''}
              <span class="font-poppins">${STATUS_LABEL[inv.status]}</span>
            </div>
          </td>
          <td>
            <div class="f12-medium">
              ${started.toLocaleDateString()} <br>
              <span class="f12-medium text-GrayDark">to ${ends.toLocaleDateString()}</span>
            </div>
          </td>
          <td>
            <div data-title="Earnings : ">${earningsCell(inv)}</div>
          </td>
        </tr>`;
    })
    .join('');

  mobileList.innerHTML = investments
    .map((inv) => {
      const started = new Date(inv.startedAt);
      const ends = new Date(inv.endsAt);
      return `
        <div class="ic-tx-card">
          <div class="ic-tx-card-header">
            <div class="ic-tx-card-date">${planNameById.get(inv.planId) ?? 'Plan'}</div>
            <span class="box-status ${STATUS_CLASS[inv.status]}">
              ${inv.status === 'active' ? '<i class="icon icon-check"></i>' : ''}
              <span class="font-poppins">${STATUS_LABEL[inv.status]}</span>
            </span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Amount</span>
            <span class="ic-tx-card-value">${formatCurrency(inv.amount)}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Rate</span>
            <span class="ic-tx-card-value">${inv.rate}% / ${inv.rateType}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Started</span>
            <span class="ic-tx-card-value">${started.toLocaleDateString()}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Matures</span>
            <span class="ic-tx-card-value">${ends.toLocaleDateString()}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Earnings</span>
            <span class="ic-tx-card-value" style="text-align:right;">${earningsCell(inv)}</span>
          </div>
        </div>`;
    })
    .join('');
}

function updateLoadMoreButton(): void {
  const button = document.getElementById('investmentsLoadMoreButton') as HTMLButtonElement | null;
  if (button) button.style.display = hasMorePages ? '' : 'none';
}

let loadedInvestments: Investment[] = [];

async function loadNextPage(): Promise<void> {
  const button = document.getElementById('investmentsLoadMoreButton') as HTMLButtonElement | null;
  if (button) {
    button.disabled = true;
    button.textContent = 'Loading…';
  }
  try {
    const page = await investmentService.listMyInvestments(currentUserId, currentPage, PAGE_SIZE);
    loadedInvestments = [...loadedInvestments, ...page];
    hasMorePages = page.length === PAGE_SIZE;
    currentPage += 1;
    renderRows(loadedInvestments);
    updateLoadMoreButton();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Load More';
    }
  }
}

function wireLoadMore(): void {
  document.getElementById('investmentsLoadMoreButton')?.addEventListener('click', () => void loadNextPage());
}

async function main() {
  const profile = await requireClientSession();
  currentUserId = profile.id;
  wireLoadMore();
  wireActions();

  const tbody = document.getElementById('investmentRows');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">Loading…</td></tr>';

  await loadSection(document.getElementById('investmentMobileList'), async () => {
    const plans = await investmentService.listPlans();
    planNameById = new Map<string, string>(plans.map((p: InvestmentPlan) => [p.id, p.name]));
    await loadEarningsInfo();

    currentPage = 0;
    const page = await investmentService.listMyInvestments(currentUserId, 0, PAGE_SIZE);
    loadedInvestments = page;
    hasMorePages = page.length === PAGE_SIZE;
    currentPage = 1;
    renderRows(loadedInvestments);
    updateLoadMoreButton();
  });
}

void main();
