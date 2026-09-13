import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createTransactionService } from '../../src/services/api/transactionService';
import { formatCurrency } from './format';
import { bucketByRecency, renderActivityList } from './walletActivity';
import { mountMarketWidget } from './marketWidget';

const financialService = createFinancialService();
const transactionService = createTransactionService();

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function renderBalances(userId: string): Promise<void> {
  const summary = await financialService.getPortfolioSummary(userId);
  setText('walletTotalBalance', formatCurrency(summary.totalBalance));
  setText('walletAvailableBalance', formatCurrency(summary.availableBalance));
  setText('walletTotalInvested', formatCurrency(summary.totalInvested));
  setText('walletTotalEarnings', formatCurrency(summary.totalEarnings));

  // Total balance = available + invested + bonus; surface the bonus portion
  // so the total doesn't look unexplained when it's non-zero.
  const captionEl = document.getElementById('walletBonusCaption');
  if (captionEl && summary.bonusBalance > 0) {
    captionEl.textContent = `Includes ${formatCurrency(summary.bonusBalance)} bonus`;
    captionEl.style.display = '';
  }
}

async function renderWalletActivity(userId: string): Promise<void> {
  const transactions = await transactionService.list({ userId });
  const buckets = bucketByRecency(transactions);

  const week = document.getElementById('walletActivityWeek');
  const month = document.getElementById('walletActivityMonth');
  const year = document.getElementById('walletActivityYear');
  if (week) renderActivityList(week, buckets.week);
  if (month) renderActivityList(month, buckets.month);
  if (year) renderActivityList(year, buckets.year);
}

async function main() {
  const profile = await requireClientSession();
  mountMarketWidget({
    chartSelector: '#wallet-market-chart',
    selectId: 'walletMarketAssetSelect',
    priceElId: 'walletMarketPrice',
    changeElId: 'walletMarketChange',
    changeClassBase: 'f12-bold',
  });
  await Promise.all([renderBalances(profile.id), renderWalletActivity(profile.id)]);
}

void main();
