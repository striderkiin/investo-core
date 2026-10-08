import { requireClientSession } from './shell';
import { createFinancialService } from '../../src/services/api/financialService';
import { createMarketService } from '../../src/services/market/marketService';
import { createCustomerMarketService, marketLabel, seriesPoints, type CustomerMarket } from '../../src/services/market/customerMarketService';
import { createInvestmentService } from '../../src/services/api/investmentService';
import type { Investment, InvestmentPlan } from '../../src/types/database';
import { formatUsdPrice } from '../../src/shared/price';
import { buildProjectionSeries, type CustomerProjection } from '../../src/shared/projection';
import { loadProjection, markProjection, projectionAsset } from './projectionChart';
import { change24hFrom, renderMarketChart, type ChartPoint } from './marketChart';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const financialService = createFinancialService();
const marketService = createMarketService();
const customerMarketService = createCustomerMarketService();
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

// Cents for normal prices, significant digits for sub-dollar coins.
const formatCurrency = formatUsdPrice;

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

const TABS: { selector: string; days: number; format: 'time' | 'date' }[] = [
  { selector: '#candlestick-1', days: 7, format: 'time' },
  { selector: '#candlestick-4', days: 30, format: 'date' },
  { selector: '#candlestick-5', days: 365, format: 'date' },
];

// Bumped on every market switch so a slow, older load cannot overwrite a newer one.
let marketLoadId = 0;

function setChange(change: number | null): void {
  setText('marketChangeValue', change == null || !Number.isFinite(change) ? '--' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
}

// Each tab loads on its own: one failed period shows a message in that tab only.
async function renderTabs(
  loadId: number,
  load: (days: number) => Promise<ChartPoint[]>,
  change: number,
  projection: CustomerProjection | null
): Promise<void> {
  await Promise.all(
    TABS.map(async (tab) => {
      try {
        const points = await load(tab.days);
        if (loadId !== marketLoadId) return;
        renderMarketChart(tab.selector, points, change, tab.format, 'No data for this period yet.', projection);
      } catch {
        if (loadId !== marketLoadId) return;
        renderMarketChart(tab.selector, [], 0, 'date', 'Price history is temporarily unavailable. Please try again shortly.');
      }
    })
  );
}

async function loadPlatformIndex(projection: CustomerProjection | null): Promise<void> {
  const loadId = ++marketLoadId;
  setText('marketPriceLabel', 'Index value');
  try {
    const [settings, week] = await Promise.all([marketService.getCurrent(), marketService.getSeries(7, seriesPoints(7))]);
    if (loadId !== marketLoadId) return;
    setText('marketPriceValue', formatCurrency(settings.currentMarketValue));
    const change = change24hFrom(week);
    setChange(change);
    await renderTabs(loadId, (days) => (days === 7 ? Promise.resolve(week) : marketService.getSeries(days, seriesPoints(days))), change ?? 0, projection);
  } catch {
    if (loadId !== marketLoadId) return;
    setText('marketPriceValue', '--');
    setChange(null);
    for (const tab of TABS) renderMarketChart(tab.selector, [], 0, 'date', 'Market data is temporarily unavailable. Please try again shortly.');
  }
}

// The markets an admin has switched on (Market Controls > Live markets), with
// their live price plus any admin override, or their simulated price.
let markets: CustomerMarket[] = [];

async function loadExternalMarket(assetKey: string, projection: CustomerProjection | null): Promise<void> {
  const loadId = ++marketLoadId;
  setText('marketPriceLabel', 'Live price');
  const market = markets.find((m) => m.key === assetKey);
  if (!market) {
    setText('marketPriceValue', '--');
    setChange(null);
    for (const tab of TABS) renderMarketChart(tab.selector, [], 0, 'date', 'This market is no longer available.');
    return;
  }
  // The price comes from the database, so it shows even if the history service is slow or down.
  setText('marketPriceValue', formatCurrency(market.price));
  setChange(null);
  const week = customerMarketService.history(market, 7);
  const change = await customerMarketService.change24h(market).catch(async () => change24hFrom(await week.catch(() => [])));
  if (loadId !== marketLoadId) return;
  setChange(change);
  await renderTabs(loadId, (days) => (days === 7 ? week : customerMarketService.history(market, days)), change ?? 0, projection);
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
// Investo's own synthetic "Platform Index". The asset dropdown adds the
// markets an admin has switched on, defaulting to Platform Index so nothing
// changes unless picked.
async function wireMarketAssetSelect(): Promise<void> {
  const select = document.getElementById('marketAssetSelect') as HTMLSelectElement | null;
  if (!select) return;
  markets = await customerMarketService.list().catch(() => []);
  for (const market of markets) {
    const option = document.createElement('option');
    option.value = market.key;
    option.textContent = marketLabel(market);
    select.appendChild(option);
  }
  select.addEventListener('change', () => loadMarketPanels(select.value));
}

async function renderMarketOverview(userId: string): Promise<void> {
  [, marketProjection] = await Promise.all([wireMarketAssetSelect(), loadProjection(userId, 'market_overview')]);
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
