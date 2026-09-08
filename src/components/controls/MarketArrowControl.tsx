interface MarketArrowControlProps {
  label: string;
  value: string;
  disabled?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}

/** Large ▲/▼ arrow controls for the Manual Market Value / Percentage panels (spec section 17-19). */
export function MarketArrowControl({ label, value, disabled, onIncrease, onDecrease }: MarketArrowControlProps) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-4 py-3">
      <button
        type="button"
        className="btn btn-outline-danger ic-arrow-btn"
        aria-label={`Decrease ${label}`}
        disabled={disabled}
        onClick={onDecrease}
      >
        <i className="bi bi-caret-down-fill" aria-hidden="true" />
      </button>
      <div className="text-center" style={{ minWidth: 160 }}>
        <div className="ic-metric-value fs-2">{value}</div>
        <div className="text-secondary small">{label}</div>
      </div>
      <button
        type="button"
        className="btn btn-outline-success ic-arrow-btn"
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={onIncrease}
      >
        <i className="bi bi-caret-up-fill" aria-hidden="true" />
      </button>
    </div>
  );
}
