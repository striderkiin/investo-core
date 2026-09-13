import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createMarketService } from '../../src/services/market/marketService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { InvestmentPlan } from '../../src/types/database';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const financialService = createFinancialService();
const marketService = createMarketService();
const investmentService = createInvestmentService();

// Stable per-plan colors (not array-position-based) so a given plan is
// always the same color regardless of which/how-many plans a client holds.
// Genuinely distinct hues rather than shades of one color — a donut where
// every slice is a different lightness of gold is unreadable at a glance.
// Professional gets the brand rust since it's typically the flagship tier;
// the rest are muted, cohesive colors picked to stay legible against each
// other rather than a literal brand-only palette.
const PLAN_COLORS: Record<string, string> = {
  Starter: '#5c5c5c',
  Growth: '#2f6f6a',
  Professional: '#a8442e',
  Elite: '#d1a24a',
};
const FALLBACK_SHADES = ['#a8442e', '#2f6f6a', '#d1a24a', '#6b4a6b', '#5c5c5c'];

function colorForPlan(name: string, fallbackIndex: number): string {
  return PLAN_COLORS[name] ?? FALLBACK_SHADES[fallbackIndex % FALLBACK_SHADES.length];
}

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

  // Total balance = available + invested + bonus; surface the bonus portion
  // so the total doesn't look unexplained when it's non-zero.
  const captionEl = document.getElementById('statBonusCaption');
  if (captionEl && summary.bonusBalance > 0) {
    captionEl.textContent = `Includes ${formatCurrency(summary.bonusBalance)} bonus`;
    captionEl.style.display = '';
  }
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
  // The checkbox itself is recolored to match its slice in the donut below,
  // so the legend actually functions as a legend instead of five identical
  // gray checkmarks.
  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById(`compositionSlot${i}`);
    const label = document.getElementById(`compositionLabel${i}`);
    if (!slot || !label) continue;
    if (i < holdings.length) {
      label.textContent = holdings[i].name;
      slot.style.display = '';
      const swatch = slot.querySelector<HTMLElement>('.tf-checkbox-wrapp div');
      if (swatch) {
        const color = colorForPlan(holdings[i].name, i);
        swatch.style.backgroundColor = color;
        swatch.style.borderColor = color;
      }
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
    chart: {
      height: 260,
      type: 'donut',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 700,
        animateGradually: { enabled: true, delay: 120 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    labels: holdings.map((h) => h.name),
    series: holdings.map((h) => Number(h.amount.toFixed(2))),
    colors: holdings.map((h, i) => colorForPlan(h.name, i)),
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%' }, expandOnClick: true } },
    states: { hover: { filter: { type: 'lighten', value: 0.08 } } },
    stroke: { width: 2, lineCap: 'round' },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

async function main() {
  const profile = await requireClientSession();
  await Promise.all([renderStatTiles(profile.id), renderMarketOverview(), renderPortfolioComposition(profile.id)]);
}

void main();
