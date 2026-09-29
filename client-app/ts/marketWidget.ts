import { createMarketService } from '../../src/services/market/marketService';
import { createCustomerMarketService, marketLabel, type CustomerMarket } from '../../src/services/market/customerMarketService';
import type { CustomerProjection } from '../../src/shared/projection';
import { formatUsdPrice, roundPrice } from '../../src/shared/price';
import { loadProjection, markProjection, projectionAsset, withProjection } from './projectionChart';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const marketService = createMarketService();
const customerMarketService = createCustomerMarketService();

interface ChartPoint {
  value: number;
  recordedAt: string;
}

// Cents for normal prices, significant digits for sub-dollar coins.
const formatCurrency = formatUsdPrice;

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderChart(
  selector: string,
  history: ChartPoint[],
  change: number,
  type: 'area' | 'line',
  height: number,
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

  new ApexCharts(container, {
    chart: { height, type, toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: projected
      ? projected.series.length > 1
        ? [trendColor, '#a8442e']
        : [projected.end >= (projected.series[0].data[0] ?? 0) ? '#2BC155' : '#FD7972']
      : [trendColor],
    series: projected ? projected.series : [{ name: '$', data: history.map((point) => roundPrice(point.value)) }],
    // Omit the key entirely for line charts rather than setting it to
    // undefined — ApexCharts' option merge treats a present-but-undefined
    // key differently from an absent one and silently fails to render.
    ...(type === 'area' ? { fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } } } : {}),
    stroke: { curve: 'smooth', width: 2, dashArray: projected ? projected.dashArray : 0 },
    legend: { show: false },
    yaxis: { show: false },
    xaxis: {
      labels: { show: false },
      categories: dates.map((date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' })),
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

export interface MarketWidgetOptions {
  /** CSS selector for the single chart container this widget renders into. */
  chartSelector: string;
  /** id of the <select> populated with the admin-enabled markets (in addition to the "platform" option already in the markup). */
  selectId: string;
  /** id of an element to write the current price into, if the markup has one. */
  priceElId?: string;
  /** id of an element to write the 24h/period change into, if the markup has one. */
  changeElId?: string;
  /** Base class to re-apply to changeElId alongside a color class, e.g. "f12-bold". */
  changeClassBase?: string;
  chartType?: 'area' | 'line';
  height?: number;
  /** The signed-in customer, so an admin-prepared "market_widget" projection can be shown. */
  userId?: string;
}

/**
 * A single-chart variant of dashboard.ts's Market Overview widget — same
 * "Platform Index (default) or a real external market" dropdown, just for
 * pages with one chart and no Week/Month/Year tabs (my-wallet.html,
 * account.html) rather than three.
 */
export function mountMarketWidget(options: MarketWidgetOptions): void {
  const { chartSelector, selectId, priceElId, changeElId, changeClassBase, chartType = 'area', height = 280, userId } = options;
  let projection: CustomerProjection | null = null;
  let active: CustomerProjection | null = null;

  function updateChangeStyle(change: number): void {
    if (!changeElId || !changeClassBase) return;
    const el = document.getElementById(changeElId);
    if (el) el.className = `${changeClassBase} ${change >= 0 ? 'text-YellowGreen' : 'text-Salmon'}`;
  }

  async function loadPlatform(): Promise<void> {
    const [settings, history] = await Promise.all([marketService.getCurrent(), marketService.getHistoryRange(30)]);
    const change = settings.currentPercentageChange;
    if (priceElId) setText(priceElId, formatCurrency(settings.currentMarketValue));
    if (changeElId) setText(changeElId, `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
    updateChangeStyle(change);
    renderChart(chartSelector, history, change, chartType, height, 'No market data yet.', active);
  }

  let markets: CustomerMarket[] = [];

  async function loadExternal(assetKey: string): Promise<void> {
    try {
      const market = markets.find((m) => m.key === assetKey);
      if (!market) throw new Error('market not available');
      const points: ChartPoint[] = await customerMarketService.history(market, 30);
      const change = await customerMarketService.change24h(market).catch(() => 0);
      if (priceElId) setText(priceElId, formatCurrency(market.price));
      if (changeElId) setText(changeElId, `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
      updateChangeStyle(change);
      renderChart(chartSelector, points, change, chartType, height, 'No data for this period yet.', active);
    } catch {
      if (priceElId) setText(priceElId, '--');
      if (changeElId) setText(changeElId, '--');
      renderChart(chartSelector, [], 0, chartType, height, 'Live market data is temporarily unavailable.', active);
    }
  }

  const select = document.getElementById(selectId) as HTMLSelectElement | null;

  function load(assetId: string): void {
    active = projection && projectionAsset(projection) === assetId ? projection : null;
    markProjection(selectId, select?.closest('.flex')?.querySelector('h6') ?? null, document.querySelector(chartSelector), active);
    void (assetId === 'platform' ? loadPlatform() : loadExternal(assetId));
  }

  void Promise.all([customerMarketService.list().catch(() => []), userId ? loadProjection(userId, 'market_widget') : Promise.resolve(null)]).then(([list, found]) => {
    markets = list;
    if (select) {
      for (const market of markets) {
        const option = document.createElement('option');
        option.value = market.key;
        option.textContent = marketLabel(market);
        select.appendChild(option);
      }
      select.addEventListener('change', () => load(select.value));
    }
    projection = found;
    const asset = found ? projectionAsset(found) : 'platform';
    if (select && Array.from(select.options).some((o) => o.value === asset)) select.value = asset;
    load(select?.value ?? 'platform');
  });
}
