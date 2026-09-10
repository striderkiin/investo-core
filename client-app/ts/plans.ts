import { requireClientSession } from './shell';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { InvestmentPlan } from '../../src/types/database';
import { formatCurrency } from './format';

const investmentService = createInvestmentService();

let allPlans: InvestmentPlan[] = [];

function renderRows(plans: InvestmentPlan[]): void {
  const tbody = document.getElementById('planRows');
  if (!tbody) return;

  if (plans.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">No plans found.</td></tr>';
    return;
  }

  tbody.innerHTML = plans
    .map(
      (plan) => `
        <tr class="tf-table-item">
          <td>
            <div class="wrap-image style-1">
              <div class="f12-bold">${plan.name}</div>
            </div>
          </td>
          <td>
            <div class="f12-bold" data-title="Rate : ">${plan.rate}% / ${plan.rateType}</div>
          </td>
          <td>
            <div class="f12-medium">${formatCurrency(plan.minAmount)} - ${formatCurrency(plan.maxAmount)}</div>
          </td>
          <td>
            <div class="f12-medium">${plan.durationDays} days</div>
          </td>
          <td>
            <div class="box-status bg-YellowGreen">
              <i class="icon icon-check"></i>
              <span class="font-poppins">ACTIVE</span>
            </div>
          </td>
          <td>
            <a href="/dashboard/investments" class="tf-btn-default f12-bold style-1">
              Invest
              <i class="icon-send1"></i>
            </a>
          </td>
        </tr>`
    )
    .join('');
}

function applyFilter(): void {
  const searchInput = document.getElementById('plansSearchInput') as HTMLInputElement | null;
  const query = searchInput?.value.trim().toLowerCase() ?? '';
  const filtered = query ? allPlans.filter((p) => p.name.toLowerCase().includes(query)) : allPlans;
  renderRows(filtered);
}

function wireControls(): void {
  const form = document.getElementById('plansSearchForm');
  const searchInput = document.getElementById('plansSearchInput');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilter();
  });
  searchInput?.addEventListener('input', applyFilter);
}

async function main() {
  await requireClientSession();
  wireControls();
  const plans = await investmentService.listPlans();
  allPlans = plans.filter((p) => p.status === 'active');
  applyFilter();
}

void main();
