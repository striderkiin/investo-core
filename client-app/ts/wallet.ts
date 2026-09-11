import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createMarketService } from '../../src/services/market/marketService';
import { createTransactionService } from '../../src/services/api/transactionService';
import { formatCurrency } from './format';
import { bucketByRecency, renderActivityList } from './walletActivity';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const financialService = createFinancialService();
const marketService = createMarketService();
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

async function renderMarketChart(): Promise<void> {
  const [settings, history] = await Promise.all([marketService.getCurrent(), marketService.getHistory(60)]);

  setText('walletMarketPrice', formatCurrency(settings.currentMarketValue));
  const change = settings.currentPercentageChange;
  setText('walletMarketChange', `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
  const changeEl = document.getElementById('walletMarketChange');
  if (changeEl) changeEl.className = `f12-bold ${change >= 0 ? 'text-YellowGreen' : 'text-Salmon'}`;

  const container = document.querySelector('#wallet-market-chart');
  if (!container || history.length === 0) return;

  new ApexCharts(container, {
    chart: { height: 280, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: [change >= 0 ? '#2BC155' : '#FD7972'],
    series: [{ name: '$', data: history.map((point) => Number(point.value.toFixed(2))) }],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } },
    stroke: { curve: 'smooth', width: 2 },
    yaxis: { show: false },
    xaxis: {
      labels: { show: false },
      categories: history.map((point) => new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
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
  await Promise.all([renderBalances(profile.id), renderMarketChart(), renderWalletActivity(profile.id)]);
}

void main();
