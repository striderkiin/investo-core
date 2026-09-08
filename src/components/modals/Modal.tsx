import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
}

/** Generic reusable modal (spec section 85) backing Deposit, Withdraw, Balance Adjustment, Plan Edit, etc. */
export function Modal({ title, show, onClose, children, footer, size }: ModalProps) {
  useEffect(() => {
    if (!show) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={`modal-dialog modal-dialog-centered ${size ? `modal-${size}` : ''}`} role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id="modal-title">
                {title}
              </h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>,
    document.body
  );
}
