import type { CustomerProjection } from '../../src/shared/projection';
import { formatUsdPrice, roundPrice } from '../../src/shared/price';
import { withProjection } from './projectionChart';

declare const ApexCharts: new (el: Element, options: Record<string, unknown>) => { render: () => void };

// Shared by the dashboard's Market Overview and the Wallet/Account market
// widget: a time-based price chart with date labels along the bottom and
// price labels on the left.

export interface ChartPoint {
  value: number;
  recordedAt: string;
}

const formatCurrency = formatUsdPrice;

// Short price labels for the left axis: $43.2k, $1,234, $0.5321.
export function axisPrice(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000) return `$${(value / 1000).toFixed(0)}k`;
  if (abs >= 10_000) return `$${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return `$${Math.round(value).toLocaleString()}`;
  return formatCurrency(value);
}

export function renderMarketChart(
  selector: string,
  history: ChartPoint[],
  change: number,
  dateFormat: 'time' | 'date',
  emptyMessage: string,
  projection: CustomerProjection | null = null,
  options: { height?: number; type?: 'area' | 'line' } = {}
): void {
  const { height = 337, type = 'area' } = options;
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
  // Time-based x axis: points sit at their real time, so gaps show as gaps.
  const toPairs = (values: (number | null)[]) => values.map((v, i) => [dates[i].getTime(), v]);
  const series = projected
    ? projected.series.map((s) => ({ name: s.name, data: toPairs(s.data) }))
    : [{ name: '$', data: toPairs(history.map((point) => roundPrice(point.value))) }];
  const labelStyle = { colors: '#9a9aa5', fontSize: '11px' };

  new ApexCharts(container, {
    chart: { height, type, toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    colors: projected
      ? projected.series.length > 1
        ? [trendColor, '#a8442e']
        : [projected.end >= (projected.series[0].data[0] ?? 0) ? '#2BC155' : '#FD7972']
      : [trendColor],
    series,
    // Omit the key for line charts: ApexCharts treats a present-but-undefined key differently.
    ...(type === 'area' ? { fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } } } : {}),
    stroke: { curve: 'straight', width: 2, dashArray: projected ? projected.dashArray : 0 },
    legend: { show: false },
    grid: { padding: { left: 4, right: 8 } },
    yaxis: { show: true, tickAmount: 4, labels: { style: labelStyle, formatter: (val: number) => axisPrice(val) } },
    xaxis: {
      type: 'datetime',
      tickAmount: 5,
      axisTicks: { show: false },
      labels: {
        show: true,
        style: labelStyle,
        datetimeUTC: false,
        formatter: (_: string, ts: number) =>
          format === 'time'
            ? new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric' })
            : new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      },
    },
    tooltip: {
      x: { formatter: (ts: number) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
      y: { formatter: (val: number) => formatCurrency(val) },
    },
  }).render();
}

// Change over the last 24 hours, from an evenly spaced week series (hourly points).
export function change24hFrom(week: ChartPoint[]): number | null {
  if (week.length < 2) return null;
  const last = week[week.length - 1].value;
  const cutoff = Date.now() - 86_400_000;
  const dayAgo = [...week].reverse().find((p) => new Date(p.recordedAt).getTime() <= cutoff) ?? week[0];
  return dayAgo.value ? ((last - dayAgo.value) / dayAgo.value) * 100 : null;
}

