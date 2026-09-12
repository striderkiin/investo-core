import { requireClientSession } from './shell';
import { createTransactionService } from '../../src/services/api/transactionService';
import type { Transaction, TransactionStatus, TransactionType } from '../../src/types/database';
import { formatCurrency, formatSignedCurrency } from './format';

const transactionService = createTransactionService();

const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  investment: 'Investment',
  yield: 'Investment Yield',
  bonus: 'Bonus',
  referral: 'Referral Earning',
  adjustment: 'Balance Adjustment',
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'PENDING',
  processing: 'PROCESSING',
  completed: 'COMPLETED',
  failed: 'FAILED',
  rejected: 'REJECTED',
};

const STATUS_CLASS: Record<TransactionStatus, string> = {
  pending: 'bg-LightGray',
  processing: 'bg-LightGray',
  completed: 'bg-YellowGreen',
  failed: 'bg-LightGray type-red',
  rejected: 'bg-LightGray type-red',
};

let allTransactions: Transaction[] = [];

function renderRows(transactions: Transaction[]): void {
  const tbody = document.getElementById('transactionRows');
  const mobileList = document.getElementById('transactionMobileList');
  if (!tbody || !mobileList) return;

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">No transactions found.</td></tr>';
    mobileList.innerHTML = '<p class="f14-regular text-Gray text-center py-4">No transactions found.</p>';
    return;
  }

  tbody.innerHTML = transactions
    .map((tx) => {
      const date = new Date(tx.createdAt);
      const isCompleted = tx.status === 'completed';
      return `
        <tr class="tf-table-item">
          <td>
            <div class="f12-bold">
              ${date.toLocaleDateString()} <br>
              <span class="f12-medium">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </td>
          <td>
            <div class="f12-medium">${TYPE_LABEL[tx.type]}</div>
          </td>
          <td>
            <div class="f12-medium" data-title="Amount : ">${formatSignedCurrency(tx.amount)}</div>
          </td>
          <td>
            <div class="f12-medium" data-title="Balance After : ">${formatCurrency(tx.balanceAfter)}</div>
          </td>
          <td>
            <div class="box-status ${STATUS_CLASS[tx.status]}">
              ${isCompleted ? '<i class="icon icon-check"></i>' : ''}
              <span class="font-poppins">${STATUS_LABEL[tx.status]}</span>
            </div>
          </td>
          <td>
            <div class="f12-medium text-break">${tx.reference}</div>
          </td>
        </tr>`;
    })
    .join('');

  // Same reasoning as plans.ts: the desktop table's fixed grid doesn't
  // reflow cleanly into a mobile card via CSS order/width tricks once
  // real content (long references, badges) varies in length, so mobile
  // gets its own card markup (see .ic-tx-card in styles.css).
  mobileList.innerHTML = transactions
    .map((tx) => {
      const date = new Date(tx.createdAt);
      const isCompleted = tx.status === 'completed';
      const shortRef = tx.reference.length > 18 ? `${tx.reference.slice(0, 18)}…` : tx.reference;
      return `
        <div class="ic-tx-card">
          <div class="ic-tx-card-header">
            <div>
              <div class="ic-tx-card-date">${date.toLocaleDateString()}</div>
              <div class="ic-tx-card-time">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <span class="box-status ${STATUS_CLASS[tx.status]}">
              ${isCompleted ? '<i class="icon icon-check"></i>' : ''}
              <span class="font-poppins">${STATUS_LABEL[tx.status]}</span>
            </span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Type</span>
            <span class="ic-tx-card-value">${TYPE_LABEL[tx.type]}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Amount</span>
            <span class="ic-tx-card-value">${formatSignedCurrency(tx.amount)}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Balance After</span>
            <span class="ic-tx-card-value">${formatCurrency(tx.balanceAfter)}</span>
          </div>
          <div class="ic-tx-card-row">
            <span class="ic-tx-card-label">Reference</span>
            <button type="button" class="ic-tx-card-value ic-tx-card-ref ic-tx-card-ref-copy" data-copy-value="${tx.reference}">
              <span class="ic-tx-card-ref-text">${shortRef}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2"></rect>
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"></path>
              </svg>
            </button>
          </div>
        </div>`;
    })
    .join('');
}

/** Full reference is truncated in the mobile card (see renderRows) — tap to copy it in full, since there's no hover state on a touch screen to reveal it another way. */
function wireCopyReference(): void {
  const mobileList = document.getElementById('transactionMobileList');
  mobileList?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-value]');
    if (!button) return;
    const value = button.dataset.copyValue ?? '';
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        const original = button.innerHTML;
        button.classList.add('is-copied');
        button.innerHTML = 'Copied!';
        setTimeout(() => {
          button.classList.remove('is-copied');
          button.innerHTML = original;
        }, 1500);
      })
      .catch(() => undefined);
  });
}

function applyFilters(): void {
  const searchInput = document.getElementById('transactionSearchInput') as HTMLInputElement | null;
  const sortSelect = document.getElementById('transactionSortSelect') as HTMLSelectElement | null;
  const query = searchInput?.value.trim().toLowerCase() ?? '';
  const sortAsc = sortSelect?.value === 'asc';

  let filtered = allTransactions;
  if (query) {
    filtered = filtered.filter((tx) => tx.reference.toLowerCase().includes(query));
  }
  filtered = [...filtered].sort((a, b) =>
    sortAsc ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  renderRows(filtered);
}

function wireControls(): void {
  const form = document.getElementById('transactionSearchForm');
  const searchInput = document.getElementById('transactionSearchInput');
  const sortSelect = document.getElementById('transactionSortSelect');

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters();
  });
  searchInput?.addEventListener('input', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);
}

async function main() {
  const profile = await requireClientSession();
  wireControls();
  wireCopyReference();
  allTransactions = await transactionService.list({ userId: profile.id });
  applyFilters();
}

void main();
