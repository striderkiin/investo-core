import type { ReactNode } from 'react';
import { PublicPageHero } from '../../../components/public/PublicPageHero';
import { PublicSection } from '../../../components/public/PublicSection';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PublicPageHero title={title} />
      <PublicSection className="container py-5" style={{ maxWidth: 780 }}>
        {children}
      </PublicSection>
    </>
  );
}
