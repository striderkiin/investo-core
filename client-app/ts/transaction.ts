import { requireClientSession } from './shell';
import { createTransactionService } from '../../src/services/api/transactionService';
import type { Profile, Transaction, TransactionStatus, TransactionType } from '../../src/types/database';
import { formatCurrency, formatSignedCurrency } from './format';
import { loadSection } from './pageState';

const transactionService = createTransactionService();
const PAGE_SIZE = 25;

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
  // bg-YellowGreen is the rust brand color — dark enough that it needs
  // white text, unlike the light-gray badges above.
  completed: 'bg-YellowGreen text-White',
  failed: 'bg-LightGray type-red',
  rejected: 'bg-LightGray type-red',
};

let allTransactions: Transaction[] = [];
let currentFiltered: Transaction[] = [];
let currentUserId = '';
let currentPage = 0;
let hasMorePages = true;

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
  currentFiltered = filtered;
  renderRows(filtered);
}

function updateLoadMoreButton(): void {
  const button = document.getElementById('transactionLoadMoreButton') as HTMLButtonElement | null;
  if (!button) return;
  button.style.display = hasMorePages ? '' : 'none';
}

/**
 * Progressive loading: search/sort operate on whatever pages have been
 * fetched so far, not the client's entire history — a page beyond what's
 * loaded won't show up in a search until "Load More" reaches it. That's a
 * deliberate tradeoff over loading the full history up front, which is
 * exactly the unbounded payload this pagination exists to avoid.
 */
async function loadNextPage(): Promise<void> {
  const button = document.getElementById('transactionLoadMoreButton') as HTMLButtonElement | null;
  if (button) {
    button.disabled = true;
    button.textContent = 'Loading…';
  }
  try {
    const page = await transactionService.list({ userId: currentUserId, page: currentPage, pageSize: PAGE_SIZE });
    allTransactions = [...allTransactions, ...page];
    hasMorePages = page.length === PAGE_SIZE;
    currentPage += 1;
    applyFilters();
    updateLoadMoreButton();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Load More';
    }
  }
}

function wireLoadMore(): void {
  document.getElementById('transactionLoadMoreButton')?.addEventListener('click', () => void loadNextPage());
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportTransactionsCsv(transactions: Transaction[]): void {
  const header = ['Date', 'Type', 'Amount', 'Balance After', 'Status', 'Reference'];
  const rows = transactions.map((tx) => [
    new Date(tx.createdAt).toISOString(),
    TYPE_LABEL[tx.type],
    tx.amount.toFixed(2),
    tx.balanceAfter.toFixed(2),
    STATUS_LABEL[tx.status],
    tx.reference,
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function wireExportControls(profile: Profile): void {
  const exportButton = document.getElementById('transactionExportCsvButton');
  const printButton = document.getElementById('transactionPrintButton');

  exportButton?.addEventListener('click', () => {
    exportTransactionsCsv(currentFiltered);
  });

  printButton?.addEventListener('click', () => {
    const nameEl = document.getElementById('statementAccountName');
    const emailEl = document.getElementById('statementAccountEmail');
    const generatedEl = document.getElementById('statementGeneratedAt');
    if (nameEl) nameEl.textContent = `Account Statement — ${profile.fullName || profile.email}`;
    if (emailEl) emailEl.textContent = profile.email;
    if (generatedEl) generatedEl.textContent = `Generated ${new Date().toLocaleString()}`;
    window.print();
  });
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
  currentUserId = profile.id;
  wireControls();
  wireCopyReference();
  wireExportControls(profile);
  wireLoadMore();

  // Sent here by the header search box (shell.ts wireHeaderSearch), which
  // has no search index of its own to query — this page's existing local
  // filter is the closest real destination for a global search term.
  const query = new URLSearchParams(window.location.search).get('q');
  const searchInput = document.getElementById('transactionSearchInput') as HTMLInputElement | null;
  if (query && searchInput) searchInput.value = query;

  // A plain <p> loading/error message doesn't nest inside a <tbody> — the
  // real render target for that state is the mobile list div, which every
  // viewport shows or hides via CSS but which always exists in the DOM.
  const errorTarget = document.getElementById('transactionMobileList');
  const tbody = document.getElementById('transactionRows');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="f14-regular text-Gray text-center py-4">Loading…</td></tr>';
  await loadSection(errorTarget, async () => {
    currentPage = 0;
    allTransactions = await transactionService.list({ userId: currentUserId, page: 0, pageSize: PAGE_SIZE });
    hasMorePages = allTransactions.length === PAGE_SIZE;
    currentPage = 1;
    applyFilters();
    updateLoadMoreButton();
  });
}

void main();
