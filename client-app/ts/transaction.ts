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
            <span class="ic-tx-card-value ic-tx-card-ref" title="${tx.reference}">${shortRef}</span>
          </div>
        </div>`;
    })
    .join('');
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
  allTransactions = await transactionService.list({ userId: profile.id });
  applyFilters();
}

void main();
