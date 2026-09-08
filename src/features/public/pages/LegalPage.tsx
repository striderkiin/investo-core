import type { ReactNode } from 'react';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="container py-5" style={{ maxWidth: 780 }}>
      <h1 className="h3 mb-4">{title}</h1>
      <div className="text-secondary">{children}</div>
    </div>
  );
}
