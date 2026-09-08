import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'bi-inbox', title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-5 text-secondary">
      <i className={`bi ${icon} fs-1 d-block mb-3`} aria-hidden="true" />
      <p className="fw-semibold mb-1 text-body">{title}</p>
      {message && <p className="mb-3">{message}</p>}
      {action}
    </div>
  );
}
