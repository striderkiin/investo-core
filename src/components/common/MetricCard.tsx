import { AnimatedNumber } from './AnimatedNumber';

interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
}

export function MetricCard({ label, value, icon, prefix = '$', suffix = '', decimals = 2, variant = 'primary' }: MetricCardProps) {
  return (
    <div className="card ic-card h-100">
      <div className="card-body d-flex align-items-start justify-content-between">
        <div>
          <p className="text-secondary small mb-1">{label}</p>
          <p className="ic-metric-value fs-4 mb-0">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
        </div>
        <span className={`badge rounded-circle bg-${variant}-subtle text-${variant} p-2`}>
          <i className={`bi ${icon} fs-5`} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
