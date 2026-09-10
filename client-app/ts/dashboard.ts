import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createMarketService } from '../../src/services/market/marketService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { InvestmentPlan } from '../../src/types/database';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const financialService = createFinancialService();
const marketService = createMarketService();
const investmentService = createInvestmentService();

const GOLD_SHADES = ['#c6a15b', '#8a6a34', '#e4c98a', '#5c4826', '#f0dfb8'];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function renderStatTiles(userId: string): Promise<void> {
  const summary = await financialService.getPortfolioSummary(userId);
  setText('statTotalBalance', formatCurrency(summary.totalBalance));
  setText('statAvailableBalance', formatCurrency(summary.availableBalance));
  setText('statTotalInvested', formatCurrency(summary.totalInvested));
  setText('statTotalEarnings', formatCurrency(summary.totalEarnings));
}

async function renderMarketOverview(): Promise<void> {
  const [settings, history] = await Promise.all([marketService.getCurrent(), marketService.getHistory(60)]);

  setText('marketPriceValue', formatCurrency(settings.currentMarketValue));
  const change = settings.currentPercentageChange;
  setText('marketChangeValue', `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);

  const container = document.querySelector('#candlestick-4');
  if (!container || history.length === 0) return;

  new ApexCharts(container, {
    chart: { height: 337, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
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

async function renderPortfolioComposition(userId: string): Promise<void> {
  const [investments, plans] = await Promise.all([investmentService.listMyInvestments(userId), investmentService.listPlans()]);
  const planName = new Map<string, string>(plans.map((p: InvestmentPlan) => [p.id, p.name]));

  const byPlan = new Map<string, number>();
  for (const inv of investments) {
    if (inv.status !== 'active' && inv.status !== 'completed') continue;
    byPlan.set(inv.planId, (byPlan.get(inv.planId) ?? 0) + inv.amount);
  }
  const holdings = Array.from(byPlan.entries())
    .map(([planId, amount]) => ({ name: planName.get(planId) ?? 'Plan', amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Slot 0-4 are the checkbox row ported from Critso's BTC/XRP/ETH/ZEC/LTC —
  // relabel with real plan names and hide any unused slots rather than
  // showing empty/fake entries when a client holds fewer than five plans.
  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById(`compositionSlot${i}`);
    const label = document.getElementById(`compositionLabel${i}`);
    if (!slot || !label) continue;
    if (i < holdings.length) {
      label.textContent = holdings[i].name;
      slot.style.display = '';
    } else {
      slot.style.display = 'none';
    }
  }

  const container = document.querySelector('#line-chart-twoline');
  if (!container) return;

  if (holdings.length === 0) {
    container.innerHTML = '<p class="f14-regular text-White text-center pt-4">No active or completed investments yet.</p>';
    return;
  }

  new ApexCharts(container, {
    chart: { height: 260, type: 'donut' },
    labels: holdings.map((h) => h.name),
    series: holdings.map((h) => Number(h.amount.toFixed(2))),
    colors: GOLD_SHADES.slice(0, holdings.length),
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%' } } },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

async function main() {
  const profile = await requireClientSession();
  await Promise.all([renderStatTiles(profile.id), renderMarketOverview(), renderPortfolioComposition(profile.id)]);
}

void main();
