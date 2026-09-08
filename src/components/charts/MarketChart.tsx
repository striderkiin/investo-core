import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MarketDataPoint } from '../../types/database';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface MarketChartProps {
  data: MarketDataPoint[];
  height?: number;
}

export function MarketChart({ data, height = 320 }: MarketChartProps) {
  const labels = data.map((point) =>
    new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const isUp = data.length >= 2 ? data[data.length - 1].value >= data[0].value : true;
  const lineColor = isUp ? '#198754' : '#dc3545';

  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Market Value',
              data: data.map((point) => point.value),
              borderColor: lineColor,
              backgroundColor: `${lineColor}22`,
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `$${Number(context.parsed.y).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
            y: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: (value) => `$${Number(value).toLocaleString()}` },
            },
          },
        }}
      />
    </div>
  );
}
