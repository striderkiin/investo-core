import type { SiteInput } from './api';
import { REGIONS, STATUS_LABEL, type Buyer, type SiteStatus } from './types';

// The fields for adding or editing a site, shared by the add dialog and the site page.
const SiteForm = ({ form, setForm, buyers, isNew }: { form: SiteInput; setForm: (f: SiteInput) => void; buyers: Buyer[]; isNew: boolean }) => {
  const set = <K extends keyof SiteInput>(key: K, value: SiteInput[K]) => setForm({ ...form, [key]: value });
  return (
    <>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-buyer">
            Buyer
          </label>
          <select id="s-buyer" className="form-select" value={form.buyer_id} onChange={(e) => set('buyer_id', e.target.value)} required>
            <option value="">Choose a buyer</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-name">
            Site name
          </label>
          <input id="s-name" className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} required />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-domain">
            Domain
          </label>
          <input id="s-domain" className="form-control" value={form.domain ?? ''} onChange={(e) => set('domain', e.target.value)} placeholder="example.com" />
          <div className="form-text">Leave empty until the buyer has one.</div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-temp">
            Temporary link
          </label>
          <input id="s-temp" className="form-control" value={form.temp_url ?? ''} onChange={(e) => set('temp_url', e.target.value)} placeholder="https://..." />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="s-status">
            Status
          </label>
          <select id="s-status" className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as SiteStatus)}>
            {(Object.keys(STATUS_LABEL) as SiteStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="s-cycle">
            Pays
          </label>
          <select id="s-cycle" className="form-select" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value as SiteInput['billing_cycle'])}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="s-fee">
            Monthly fee ($)
          </label>
          <input
            id="s-fee"
            type="number"
            min={0}
            step="0.01"
            className="form-control"
            value={form.monthly_fee}
            onChange={(e) => set('monthly_fee', Number(e.target.value))}
            required
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-region">
            Region
          </label>
          <select id="s-region" className="form-select" value={form.region} onChange={(e) => set('region', e.target.value)} disabled={!isNew && !!form.supabase_ref}>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {!isNew && !!form.supabase_ref && <div className="form-text">The region can't change once the database exists.</div>}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="s-ref">
            Supabase project ID
          </label>
          <input
            id="s-ref"
            className="form-control font-monospace"
            value={form.supabase_ref ?? ''}
            onChange={(e) => set('supabase_ref', e.target.value.trim().toLowerCase())}
            placeholder="Filled in automatically later"
            maxLength={20}
          />
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="s-notes">
          Notes
        </label>
        <textarea id="s-notes" className="form-control" rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} maxLength={5000} />
      </div>
    </>
  );
};

export default SiteForm;
