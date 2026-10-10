import type { ReactNode } from 'react';

const PageTitle = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h4 className="mb-0">{title}</h4>
    {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
  </div>
);

export default PageTitle;
