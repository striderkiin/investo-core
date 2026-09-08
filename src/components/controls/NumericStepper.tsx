interface NumericStepperProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/**
 * Reusable ▲/▼ + direct-input control used across Financial Settings (deposit
 * /withdrawal limits), Plan Rate controls, and the Manual Market Value /
 * Percentage controls — every place spec section 28/31/18/19 asks for
 * "increase/decrease controls plus direct input".
 */
export function NumericStepper({ label, value, step, min, max, suffix, disabled, onChange }: NumericStepperProps) {
  function clamp(next: number): number {
    let result = next;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  return (
    <div>
      <label className="form-label small text-secondary mb-1">{label}</label>
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          aria-label={`Decrease ${label}`}
          disabled={disabled}
          onClick={() => onChange(clamp(value - step))}
        >
          <i className="bi bi-dash-lg" aria-hidden="true" />
        </button>
        <div className="input-group input-group-sm" style={{ maxWidth: 180 }}>
          <input
            type="number"
            className="form-control text-end"
            aria-label={label}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChange(clamp(parsed));
            }}
          />
          {suffix && <span className="input-group-text">{suffix}</span>}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={() => onChange(clamp(value + step))}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
