import { useToast } from '../../hooks/useToast';

const ICONS: Record<string, string> = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080 }} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show align-items-center text-bg-${toast.variant} border-0 mb-2`}
          role="status"
        >
          <div className="d-flex">
            <div className="toast-body">
              <i className={`bi ${ICONS[toast.variant]} me-2`} aria-hidden="true" />
              {toast.message}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label="Close notification"
              onClick={() => dismissToast(toast.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
