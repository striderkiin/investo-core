import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createMarketService } from '../../src/services/market/marketService';
import { createExternalMarketService, EXTERNAL_MARKETS } from '../../src/services/market/externalMarketService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { Investment, InvestmentPlan } from '../../src/types/database';
import { buildProjectionSeries, type CustomerProjection } from '../../src/shared/projection';
import { loadProjection, markProjection, projectionAsset, withProjection } from './projectionChart';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const financialService = createFinancialService();
const marketService = createMarketService();
const externalMarketService = createExternalMarketService();
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
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load balances.';
    for (const id of ['statTotalBalance', 'statAvailableBalance', 'statTotalInvested', 'statTotalEarnings']) {
      setText(id, '--');
    }
    setText('statBonusCaption', message);
    const captionEl = document.getElementById('statBonusCaption');
    if (captionEl) captionEl.style.display = '';
  }
}

interface ChartPoint {
  value: number;
  recordedAt: string;
}

function renderMarketChart(
  selector: string,
  history: ChartPoint[],
  change: number,
  dateFormat: 'time' | 'date',
  emptyMessage: string,
  projection: CustomerProjection | null = null
): void {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';

  if (history.length === 0 && !projection) {
    container.innerHTML = `<p class="f14-regular text-Gray text-center pt-4">${emptyMessage}</p>`;
    return;
  }

  const trendColor = change >= 0 ? '#2BC155' : '#FD7972';
  const projected = projection ? withProjection(history, projection) : null;
  const dates = projected ? projected.dates : history.map((point) => new Date(point.recordedAt));
  // A projection runs over days, so its labels are dates even on the Week tab.
  const format = projected ? 'date' : dateFormat;

  new ApexCharts(container, {
    chart: { height: 337, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: projected
      ? projected.series.length > 1
        ? [trendColor, '#a8442e']
        : [projected.end >= (projected.series[0].data[0] ?? 0) ? '#2BC155' : '#FD7972']
      : [trendColor],
    series: projected ? projected.series : [{ name: '$', data: history.map((point) => Number(point.value.toFixed(2))) }],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } },
    stroke: { curve: 'smooth', width: 2, dashArray: projected ? projected.dashArray : 0 },
    legend: { show: false },
    yaxis: { show: false },
    xaxis: {
      labels: { show: false },
      categories: dates.map((date) =>
        format === 'time'
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      ),
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

async function loadPlatformIndex(projection: CustomerProjection | null): Promise<void> {
  try {
    const [settings, week, month, year] = await Promise.all([
      marketService.getCurrent(),
      marketService.getHistoryRange(7),
      marketService.getHistoryRange(30),
      marketService.getHistoryRange(365),
    ]);

    setText('marketPriceValue', formatCurrency(settings.currentMarketValue));
    const change = settings.currentPercentageChange;
    setText('marketChangeValue', `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);

    const empty = 'No market data for this period yet.';
    renderMarketChart('#candlestick-1', week, change, 'time', empty, projection);
    renderMarketChart('#candlestick-4', month, change, 'date', empty, projection);
    renderMarketChart('#candlestick-5', year, change, 'date', empty, projection);
  } catch {
    setText('marketPriceValue', '--');
    setText('marketChangeValue', '--');
    const unavailable = 'Live market data is temporarily unavailable. Please try again shortly.';
    for (const selector of ['#candlestick-1', '#candlestick-4', '#candlestick-5']) {
      renderMarketChart(selector, [], 0, 'date', unavailable);
    }
  }
}

// CoinGecko's public API needs no key for this volume — real crypto majors
// directly, and gold via Pax Gold (a gold-backed token) rather than a
// separate paid commodities API.
async function loadExternalMarket(assetId: string, projection: CustomerProjection | null): Promise<void> {
  try {
    const [quotes, week, month, year] = await Promise.all([
      externalMarketService.getQuotes([assetId]),
      externalMarketService.getHistory(assetId, 7),
      externalMarketService.getHistory(assetId, 30),
      externalMarketService.getHistory(assetId, 365),
    ]);

    const quote = quotes[assetId];
    const change = quote?.change24h ?? 0;
    setText('marketPriceValue', quote ? formatCurrency(quote.priceUsd) : '--');
    setText('marketChangeValue', quote ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '--');

    const toChartPoints = (points: { timestamp: number; price: number }[]): ChartPoint[] =>
      points.map((p) => ({ value: p.price, recordedAt: new Date(p.timestamp).toISOString() }));

    const empty = 'No data for this period yet.';
    renderMarketChart('#candlestick-1', toChartPoints(week), change, 'time', empty, projection);
    renderMarketChart('#candlestick-4', toChartPoints(month), change, 'date', empty, projection);
    renderMarketChart('#candlestick-5', toChartPoints(year), change, 'date', empty, projection);
  } catch {
    setText('marketPriceValue', '--');
    setText('marketChangeValue', '--');
    const unavailable = 'Live market data is temporarily unavailable. Please try again shortly.';
    for (const selector of ['#candlestick-1', '#candlestick-4', '#candlestick-5']) {
      renderMarketChart(selector, [], 0, 'date', unavailable);
    }
  }
}

// Set when an admin has switched on a Market Overview projection for this
// customer; it shows only while its asset is the one selected.
let marketProjection: CustomerProjection | null = null;

function loadMarketPanels(assetId: string): void {
  const projection = marketProjection && projectionAsset(marketProjection) === assetId ? marketProjection : null;
  const box = document.getElementById('marketAssetSelect')?.closest('.wg-box') ?? null;
  markProjection('market-overview', box?.querySelector('.label-01') ?? null, box?.querySelector('.widget-content-tab') ?? null, projection);
  void (assetId === 'platform' ? loadPlatformIndex(projection) : loadExternalMarket(assetId, projection));
}

// The Week/Month/Year tabs (#candlestick-1/4/5) already exist in the Critso
// markup and are already wired to show/hide each other on click (see
// main.js's generic .widget-menu-tab handler) — they just never had real,
// differently-scoped data behind them, and the chart only ever showed
// Investo's own synthetic "Platform Index". The asset dropdown adds real
// external markets (crypto majors + gold via a gold-backed token) alongside
// it, defaulting to Platform Index so nothing changes unless picked.
function wireMarketAssetSelect(): void {
  const select = document.getElementById('marketAssetSelect') as HTMLSelectElement | null;
  if (!select) return;
  for (const market of EXTERNAL_MARKETS) {
    const option = document.createElement('option');
    option.value = market.id;
    option.textContent = market.label;
    select.appendChild(option);
  }
  select.addEventListener('change', () => loadMarketPanels(select.value));
}

async function renderMarketOverview(userId: string): Promise<void> {
  wireMarketAssetSelect();
  marketProjection = await loadProjection(userId, 'market_overview');
  const asset = marketProjection ? projectionAsset(marketProjection) : 'platform';
  const select = document.getElementById('marketAssetSelect') as HTMLSelectElement | null;
  if (select && Array.from(select.options).some((o) => o.value === asset)) select.value = asset;
  loadMarketPanels(select?.value ?? 'platform');
}

// An admin-prepared projection replaces the donut with the projected growth
// of the chosen amount in the chosen plan, labeled as a projection.
function renderPortfolioProjection(container: Element | null, projection: CustomerProjection, plans: InvestmentPlan[]): void {
  const planName = plans.find((p) => p.id === projection.params.planId)?.name ?? 'Projected plan';
  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById(`compositionSlot${i}`);
    if (slot) slot.style.display = i === 0 ? '' : 'none';
  }
  setText('compositionLabel0', planName);
  const swatch = document.getElementById('compositionSlot0')?.querySelector<HTMLElement>('.tf-checkbox-wrapp div');
  if (swatch) {
    swatch.style.backgroundColor = '#ffffff';
    swatch.style.borderColor = '#ffffff';
  }
  const box = container?.closest('.wg-box') ?? null;
  markProjection('portfolio', box?.querySelector('.label-01') ?? null, container, projection, true);
  if (!container) return;

  const path = buildProjectionSeries(projection.params, projection.params.amount ?? 0);
  container.innerHTML = '';
  new ApexCharts(container, {
    chart: { height: 260, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: ['#ffffff'],
    series: [{ name: planName, data: path.map((p) => p.value) }],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
    stroke: { curve: 'smooth', width: 2 },
    grid: { borderColor: 'rgba(255,255,255,.15)' },
    yaxis: { labels: { style: { colors: '#ffffff' }, formatter: (val: number) => formatCurrency(val) } },
    xaxis: {
      categories: path.map((p) => p.date.toLocaleDateString([], { month: 'short', day: 'numeric' })),
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

async function renderPortfolioComposition(userId: string): Promise<void> {
  const container = document.querySelector('#line-chart-twoline');
  let investments: Investment[];
  let plans: InvestmentPlan[];
  let projection: CustomerProjection | null;
  try {
    [investments, plans, projection] = await Promise.all([
      investmentService.listMyInvestments(userId),
      investmentService.listPlans(),
      loadProjection(userId, 'portfolio_composition'),
    ]);
  } catch (err) {
    if (container) {
      container.innerHTML = `<p class="f14-regular text-White text-center pt-4">${err instanceof Error ? err.message : 'Unable to load portfolio composition.'}</p>`;
    }
    return;
  }
  if (projection) {
    renderPortfolioProjection(container, projection, plans);
    return;
  }
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
  await Promise.all([renderStatTiles(profile.id), renderMarketOverview(profile.id), renderPortfolioComposition(profile.id)]);
}

void main();
