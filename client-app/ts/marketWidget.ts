import { createMarketService } from '../../src/services/market/marketService';
import { createCustomerMarketService, marketLabel, seriesPoints, type CustomerMarket } from '../../src/services/market/customerMarketService';
import type { CustomerProjection } from '../../src/shared/projection';
import { formatUsdPrice } from '../../src/shared/price';
import { loadProjection, markProjection, projectionAsset } from './projectionChart';
import { change24hFrom, renderMarketChart, type ChartPoint } from './marketChart';

const marketService = createMarketService();
const customerMarketService = createCustomerMarketService();

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
  renderMarketChart(selector, history, change, 'date', emptyMessage, projection, { height, type });
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

  // Bumped on every switch so a slow, older load cannot overwrite a newer one.
  let loadId = 0;

  function showChange(change: number | null): void {
    if (changeElId) setText(changeElId, change == null ? '--' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
    updateChangeStyle(change ?? 0);
  }

  async function loadPlatform(): Promise<void> {
    const id = ++loadId;
    try {
      const [settings, history] = await Promise.all([marketService.getCurrent(), marketService.getSeries(30, seriesPoints(30))]);
      if (id !== loadId) return;
      // 24h change from the last day of the 30-day series.
      const change = change24hFrom(history);
      if (priceElId) setText(priceElId, formatCurrency(settings.currentMarketValue));
      showChange(change);
      renderChart(chartSelector, history, change ?? 0, chartType, height, 'No market data yet.', active);
    } catch {
      if (id !== loadId) return;
      if (priceElId) setText(priceElId, '--');
      showChange(null);
      renderChart(chartSelector, [], 0, chartType, height, 'Market data is temporarily unavailable.', active);
    }
  }

  let markets: CustomerMarket[] = [];

  async function loadExternal(assetKey: string): Promise<void> {
    const id = ++loadId;
    const market = markets.find((m) => m.key === assetKey);
    if (!market) {
      if (priceElId) setText(priceElId, '--');
      showChange(null);
      renderChart(chartSelector, [], 0, chartType, height, 'This market is no longer available.', active);
      return;
    }
    // The price comes from the database, so it shows even if the history service is slow or down.
    if (priceElId) setText(priceElId, formatCurrency(market.price));
    showChange(null);
    const points = await customerMarketService.history(market, 30).catch(() => null);
    const change = await customerMarketService.change24h(market).catch(() => (points ? change24hFrom(points) : null));
    if (id !== loadId) return;
    showChange(change);
    if (points) renderChart(chartSelector, points, change ?? 0, chartType, height, 'No data for this period yet.', active);
    else renderChart(chartSelector, [], 0, chartType, height, 'Price history is temporarily unavailable.', active);
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
