import type { Transaction, TransactionStatus, TransactionType } from '../../src/types/database';
import { formatDateTime, formatSignedCurrency } from './format';

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
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  rejected: 'Rejected',
};

const STATUS_CLASS: Record<TransactionStatus, string> = {
  pending: 'text-GrayDark',
  processing: 'text-GrayDark',
  completed: 'text-YellowGreen',
  failed: 'text-Salmon',
  rejected: 'text-Salmon',
};

/** Buckets a user's transactions into the Week/Month/Year tabs used by the Wallet Activity widget. */
export function bucketByRecency(transactions: Transaction[]): { week: Transaction[]; month: Transaction[]; year: Transaction[] } {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  return {
    week: transactions.filter((t) => now - new Date(t.createdAt).getTime() <= 7 * DAY),
    month: transactions.filter((t) => now - new Date(t.createdAt).getTime() <= 30 * DAY),
    year: transactions.filter((t) => now - new Date(t.createdAt).getTime() <= 365 * DAY),
  };
}

/** Renders the Critso "Wallet Activity" list markup for one tab panel, from real transactions. */
export function renderActivityList(container: HTMLElement, transactions: Transaction[]): void {
  if (transactions.length === 0) {
    container.innerHTML = '<p class="f12-regular text-Gray mb-0">No activity in this period.</p>';
    return;
  }

  const items = transactions
    .slice(0, 8)
    .map(
      (tx) => `
        <li>
          <div class="wallet-activity-item pb-0">
            <div class="icon">
              <img src="images/item/cash.png" alt="">
            </div>
            <div class="content">
              <div class="mb-2">
                <span class="f14-bold">${TYPE_LABEL[tx.type]}</span>
              </div>
              <div class="f12-medium text-Gray">${formatDateTime(tx.createdAt)}</div>
            </div>
            <div class="price f14-bold">${formatSignedCurrency(tx.amount)}</div>
            <div class="status f12-bold ${STATUS_CLASS[tx.status]}">${STATUS_LABEL[tx.status]}</div>
          </div>
        </li>`
    )
    .join('');

  container.innerHTML = `<ul class="list-wallet-activity mb-0">${items}</ul>`;
}
