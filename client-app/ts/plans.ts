import { requireClientSession } from './shell';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { InvestmentPlan } from '../../src/types/database';
import { formatCurrency } from './format';

declare const bootstrap: {
  Modal: new (el: Element) => { show: () => void; hide: () => void };
};

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
            <button type="button" class="tf-btn-default f12-bold style-1 js-invest-btn" data-plan-id="${plan.id}">
              Invest
              <i class="icon-send1"></i>
            </button>
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
          <button type="button" class="tf-btn-default f12-bold style-1 ic-plan-card-cta js-invest-btn" data-plan-id="${plan.id}">
            Invest
            <i class="icon-send1"></i>
          </button>
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

function wireInvestModal(): void {
  const modalEl = document.getElementById('investModal');
  const form = document.getElementById('investModalForm') as HTMLFormElement | null;
  const amountInput = document.getElementById('investModalAmount') as HTMLInputElement | null;
  const submitButton = document.getElementById('investModalSubmit') as HTMLButtonElement | null;
  const planNameEl = document.getElementById('investModalPlanName');
  const planDetailEl = document.getElementById('investModalPlanDetail');
  const errorEl = document.getElementById('investModalError');
  const successEl = document.getElementById('investModalSuccess');
  if (!modalEl || !form || !amountInput || !submitButton || !planNameEl || !planDetailEl || !errorEl || !successEl) return;

  const modal = new bootstrap.Modal(modalEl);
  let activePlan: InvestmentPlan | null = null;

  function showError(message: string): void {
    errorEl!.textContent = message;
    errorEl!.style.display = '';
  }

  function hideMessages(): void {
    errorEl!.style.display = 'none';
    successEl!.style.display = 'none';
  }

  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('.js-invest-btn') as HTMLElement | null;
    if (!target) return;

    const planId = target.dataset.planId;
    activePlan = allPlans.find((p) => p.id === planId) ?? null;
    if (!activePlan) return;

    hideMessages();
    form.reset();
    amountInput.value = String(activePlan.minAmount);
    planNameEl.textContent = activePlan.name;
    planDetailEl.textContent = `${activePlan.rate}% ${activePlan.rateType} · ${activePlan.durationDays} days · ${formatCurrency(activePlan.minAmount)} to ${formatCurrency(activePlan.maxAmount)}`;
    modal.show();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideMessages();
    if (!activePlan) return;

    const amount = Number(amountInput.value);
    if (!amount || amount <= 0) {
      showError('Enter a valid amount.');
      return;
    }
    if (amount < activePlan.minAmount || amount > activePlan.maxAmount) {
      showError(`Amount must be between ${formatCurrency(activePlan.minAmount)} and ${formatCurrency(activePlan.maxAmount)}.`);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Investing…';

    void investmentService
      .invest(activePlan.id, amount)
      .then(() => {
        successEl!.style.display = '';
        setTimeout(() => modal.hide(), 1200);
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to start this investment. Please try again.');
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm Investment';
      });
  });
}

async function main() {
  await requireClientSession();
  wireControls();
  wireInvestModal();
  const plans = await investmentService.listPlans();
  allPlans = plans.filter((p) => p.status === 'active');
  applyFilter();
}

void main();
