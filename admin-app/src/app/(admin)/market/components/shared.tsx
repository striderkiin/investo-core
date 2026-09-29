import type { ApexOptions } from 'apexcharts'
import ReactApexChart from 'react-apexcharts'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { formatPrice } from '@/investo/format'
import { roundPrice } from '../../../../../../src/shared/price'

// Area chart of a price series, styled like the dashboard charts.
export const PriceChart = ({ points, height = 260 }: { points: { value: number; recordedAt: string }[]; height?: number }) => {
  if (points.length === 0) return <p className="text-muted text-center py-4 mb-0">No history yet.</p>
  const rising = points[points.length - 1].value >= points[0].value
  const options: ApexOptions = {
    chart: { type: 'area', height, toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    colors: [rising ? '#22c5ad' : '#ef4d56'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    xaxis: { categories: points.map((p) => new Date(p.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })), labels: { show: false }, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (v: number) => formatPrice(v) } },
    tooltip: { y: { formatter: (v: number) => formatPrice(v) } },
  }
  return <ReactApexChart type="area" height={height} options={options} series={[{ name: 'Price', data: points.map((p) => roundPrice(p.value)) }]} />
}

// Large down/up arrows either side of a value.
export const ArrowControl = ({ label, value, disabled, onUp, onDown }: { label: string; value: string; disabled?: boolean; onUp: () => void; onDown: () => void }) => (
  <div className="d-flex align-items-center justify-content-center gap-4 py-2">
    <button type="button" className="btn btn-soft-danger btn-lg" aria-label={`Decrease ${label}`} disabled={disabled} onClick={onDown}>
      <IconifyIcon icon="iconoir:arrow-down" />
    </button>
    <div className="text-center" style={{ minWidth: 160 }}>
      <div className="fs-22 fw-bold">{value}</div>
      <small className="text-muted">{label}</small>
    </div>
    <button type="button" className="btn btn-soft-success btn-lg" aria-label={`Increase ${label}`} disabled={disabled} onClick={onUp}>
      <IconifyIcon icon="iconoir:arrow-up" />
    </button>
  </div>
)

// Preset step buttons plus a custom amount box.
export const StepPicker = ({
  presets,
  value,
  format,
  disabled,
  onPick,
}: {
  presets: number[]
  value: number
  format: (n: number) => string
  disabled?: boolean
  onPick: (n: number) => void
}) => (
  <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
    {presets.map((step) => (
      <button key={step} type="button" className={`btn btn-sm ${value === step ? 'btn-primary' : 'btn-light'}`} disabled={disabled} onClick={() => onPick(step)}>
        {format(step)}
      </button>
    ))}
    <input
      type="number"
      min={0}
      step="any"
      className="form-control form-control-sm"
      style={{ maxWidth: 100 }}
      placeholder="Custom"
      aria-label="Custom step"
      disabled={disabled}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const n = Number((e.target as HTMLInputElement).value)
        if (n > 0) onPick(n)
      }}
    />
  </div>
)
