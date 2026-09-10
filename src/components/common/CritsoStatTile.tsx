import { AnimatedNumber } from './AnimatedNumber';

interface CritsoStatTileProps {
  label: string;
  value: number;
  icon: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  changeLabel?: string;
  highlight?: boolean;
}

/** Stat-tile shell ported from the Critso reference template's "wg-card" component (see reference/legacy-template/index.html and src/styles/client-dashboard-critso.css) for the client Dashboard Home page specifically — not a replacement for the shared MetricCard used elsewhere. */
export function CritsoStatTile({ label, value, icon, prefix = '$', suffix = '', decimals = 2, changeLabel, highlight = false }: CritsoStatTileProps) {
  return (
    <div className={`wg-card h-100${highlight ? ' style-1' : ''}`}>
      <div className="icon">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <div className="content">
        <div>
          <h6 className="counter">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </h6>
          <div className="f12-medium small" style={{ opacity: 0.75 }}>
            {label}
            {changeLabel && <span> · {changeLabel}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
