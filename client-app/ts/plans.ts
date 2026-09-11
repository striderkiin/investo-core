import { requireClientSession } from './shell';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { InvestmentPlan } from '../../src/types/database';
import { formatCurrency } from './format';

const investmentService = createInvestmentService();

let allPlans: InvestmentPlan[] = [];

function renderRows(plans: InvestmentPlan[]): void {
  const tbody = document.getElementById('planRows');
  const mobileList = document.getElementById('plansMobileList');
  if (!tbody || !mobileList) return;

  if (plans.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">No plans found.</td></tr>';
    mobileList.innerHTML = '<p class="f14-regular text-Gray text-center py-4">No plans found.</p>';
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
            <div class="f12-medium" data-title="Duration : ">${plan.durationDays} days</div>
          </td>
          <td>
            <div class="box-status bg-YellowGreen">
              <i class="icon icon-check"></i>
              <span class="font-poppins">ACTIVE</span>
            </div>
          </td>
          <td>
            <a href="/#pricing" class="tf-btn-default f12-bold style-1">
              Invest
              <i class="icon-send1"></i>
            </a>
          </td>
        </tr>`
    )
    .join('');

  // The desktop table above is a fixed-width grid — reflowing it into a
  // stacked mobile layout via CSS (order/width tricks on the same <td>s)
  // kept breaking as soon as real content lengths varied, so mobile gets
  // its own purpose-built card markup instead (see .ic-plan-card in
  // styles.css), populated in parallel from the same data.
  mobileList.innerHTML = plans
    .map(
      (plan) => `
        <div class="ic-plan-card">
          <div class="ic-plan-card-header">
            <span class="ic-plan-card-name">${plan.name}</span>
            <span class="ic-plan-card-range">${formatCurrency(plan.minAmount)} - ${formatCurrency(plan.maxAmount)}</span>
          </div>
          <div class="ic-plan-card-row">
            <span class="ic-plan-card-label">Rate</span>
            <span class="ic-plan-card-value">${plan.rate}% / ${plan.rateType}</span>
          </div>
          <div class="ic-plan-card-row">
            <span class="ic-plan-card-label">Duration</span>
            <span class="ic-plan-card-value">${plan.durationDays} days</span>
          </div>
          <div class="ic-plan-card-row">
            <span class="ic-plan-card-label">Status</span>
            <span class="box-status bg-YellowGreen">
              <i class="icon icon-check"></i>
              <span class="font-poppins">ACTIVE</span>
            </span>
          </div>
          <a href="/#pricing" class="tf-btn-default f12-bold style-1 ic-plan-card-cta">
            Invest
            <i class="icon-send1"></i>
          </a>
        </div>`
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
