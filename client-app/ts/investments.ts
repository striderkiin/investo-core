import { requireClientSession } from './shell';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { Investment, InvestmentPlan, InvestmentStatus } from '../../src/types/database';
import { formatCurrency } from './format';
import { loadSection } from './pageState';

const investmentService = createInvestmentService();
const PAGE_SIZE = 20;

const STATUS_LABEL: Record<InvestmentStatus, string> = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  paused: 'PAUSED',
  cancelled: 'CANCELLED',
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
            <div class="f12-medium" data-title="Earnings : ">${formatCurrency(inv.currentEarnings)}</div>
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
            <span class="ic-tx-card-value">${formatCurrency(inv.currentEarnings)}</span>
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

  const tbody = document.getElementById('investmentRows');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">Loading…</td></tr>';

  await loadSection(document.getElementById('investmentMobileList'), async () => {
    const plans = await investmentService.listPlans();
    planNameById = new Map<string, string>(plans.map((p: InvestmentPlan) => [p.id, p.name]));

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
