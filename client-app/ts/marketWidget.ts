import { createMarketService } from '../../src/services/market/marketService';
import { createExternalMarketService, EXTERNAL_MARKETS } from '../../src/services/market/externalMarketService';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

const marketService = createMarketService();
const externalMarketService = createExternalMarketService();

interface ChartPoint {
  value: number;
  recordedAt: string;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderChart(selector: string, history: ChartPoint[], change: number, type: 'area' | 'line', height: number, emptyMessage: string): void {
  const container = document.querySelector(selector);
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `<p class="f14-regular text-Gray text-center pt-4">${emptyMessage}</p>`;
    return;
  }

  new ApexCharts(container, {
    chart: { height, type, toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: [change >= 0 ? '#2BC155' : '#FD7972'],
    series: [{ name: '$', data: history.map((point) => Number(point.value.toFixed(2))) }],
    fill: type === 'area' ? { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } } : undefined,
    stroke: { curve: 'smooth', width: 2 },
    yaxis: { show: false },
    xaxis: {
      labels: { show: false },
      categories: history.map((point) => new Date(point.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })),
    },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  }).render();
}

export interface MarketWidgetOptions {
  /** CSS selector for the single chart container this widget renders into. */
  chartSelector: string;
  /** id of the <select> populated with EXTERNAL_MARKETS options (in addition to the "platform" option already in the markup). */
  selectId: string;
  /** id of an element to write the current price into, if the markup has one. */
  priceElId?: string;
  /** id of an element to write the 24h/period change into, if the markup has one. */
  changeElId?: string;
  /** Base class to re-apply to changeElId alongside a color class, e.g. "f12-bold". */
  changeClassBase?: string;
  chartType?: 'area' | 'line';
  height?: number;
}

/**
 * A single-chart variant of dashboard.ts's Market Overview widget — same
 * "Platform Index (default) or a real external market" dropdown, just for
 * pages with one chart and no Week/Month/Year tabs (my-wallet.html,
 * account.html) rather than three.
 */
export function mountMarketWidget(options: MarketWidgetOptions): void {
  const { chartSelector, selectId, priceElId, changeElId, changeClassBase, chartType = 'area', height = 280 } = options;

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
    renderChart(chartSelector, history, change, chartType, height, 'No market data yet.');
  }

  async function loadExternal(assetId: string): Promise<void> {
    try {
      const [quotes, history] = await Promise.all([externalMarketService.getQuotes([assetId]), externalMarketService.getHistory(assetId, 30)]);
      const quote = quotes[assetId];
      const change = quote?.change24h ?? 0;
      if (priceElId) setText(priceElId, quote ? formatCurrency(quote.priceUsd) : '--');
      if (changeElId) setText(changeElId, quote ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '--');
      updateChangeStyle(change);
      const points: ChartPoint[] = history.map((point) => ({ value: point.price, recordedAt: new Date(point.timestamp).toISOString() }));
      renderChart(chartSelector, points, change, chartType, height, 'No data for this period yet.');
    } catch {
      if (priceElId) setText(priceElId, '--');
      if (changeElId) setText(changeElId, '--');
      renderChart(chartSelector, [], 0, chartType, height, 'Live market data is temporarily unavailable.');
    }
  }

  function load(assetId: string): void {
    void (assetId === 'platform' ? loadPlatform() : loadExternal(assetId));
  }

  const select = document.getElementById(selectId) as HTMLSelectElement | null;
  if (select) {
    for (const market of EXTERNAL_MARKETS) {
      const option = document.createElement('option');
      option.value = market.id;
      option.textContent = market.label;
      select.appendChild(option);
    }
    select.addEventListener('change', () => load(select.value));
  }

  load('platform');
}
