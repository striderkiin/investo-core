import { LegalPage } from './LegalPage';
import { LegalDocument } from '../../../components/public/LegalDocument';
import { useSiteContent } from '../../siteContent/useSiteContent';
import { LEGAL_DOCS } from '../../siteContent/legalContent';

/** A legal page whose text the admin can change under Landing Page > Legal pages. */
export function LegalDocPage({ docKey }: { docKey: string }) {
  const doc = LEGAL_DOCS.find((d) => d.key === docKey) ?? LEGAL_DOCS[0];
  const { c, ready, updatedAt } = useSiteContent();
  const changed = updatedAt(doc.key);
  return (
    <div style={ready ? undefined : { visibility: 'hidden' }}>
      <LegalPage title={doc.title}>
        {changed && <p className="text-muted small">Last updated {new Date(changed).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
        <LegalDocument text={c(doc.key)} />
      </LegalPage>
    </div>
  );
}
