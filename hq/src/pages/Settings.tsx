import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { api } from '../api';
import PageTitle from '../PageTitle';
import { REGIONS, money, type HqSettings } from '../types';
import { useLoad } from '../useLoad';

const PRICE_FIELDS: { key: keyof HqSettings; label: string; hint: string }[] = [
  { key: 'launch_fee', label: 'Launch fee ($)', hint: 'One time. The first payment is this plus the first month.' },
  { key: 'monthly_fee', label: 'Monthly fee ($)', hint: 'Used for new sites. Each site keeps its own fee after that.' },
  { key: 'yearly_fee', label: 'Yearly fee ($)', hint: 'Paid up front for twelve months.' },
  { key: 'parking_fee', label: 'Parking fee ($ a month)', hint: 'Site offline, data kept.' },
];

const Settings = () => {
  const { data, error } = useLoad(() => api.settings());
  const [form, setForm] = useState<HqSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ variant: string; text: string } | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!form) return <div className="spinner-border text-primary" role="status" />;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.saveSettings({
        launch_fee: Number(form.launch_fee),
        monthly_fee: Number(form.monthly_fee),
        yearly_fee: Number(form.yearly_fee),
        parking_fee: Number(form.parking_fee),
        grace_days: Number(form.grace_days),
        default_region: form.default_region,
      });
      setMessage({ variant: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Settings" />
      {message && <div className={`alert alert-${message.variant}`}>{message.text}</div>}
      <form onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle as="h4">Prices</CardTitle>
            <p className="text-muted mb-0 mt-1">
              First payment for a new buyer: {money(Number(form.launch_fee) + Number(form.monthly_fee))} (launch fee plus the first month).
            </p>
          </CardHeader>
          <CardBody className="pt-0">
            <Row>
              {PRICE_FIELDS.map((f) => (
                <Col md={6} xl={3} className="mb-3" key={f.key}>
                  <label className="form-label" htmlFor={f.key}>
                    {f.label}
                  </label>
                  <input
                    id={f.key}
                    type="number"
                    min={0}
                    step="0.01"
                    className="form-control"
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required
                  />
                  <div className="form-text">{f.hint}</div>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h4">Rules and defaults</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <Row>
              <Col md={6} className="mb-3">
                <label className="form-label" htmlFor="grace_days">
                  Grace period (days)
                </label>
                <input
                  id="grace_days"
                  type="number"
                  min={0}
                  max={60}
                  className="form-control"
                  value={form.grace_days}
                  onChange={(e) => setForm({ ...form, grace_days: Number(e.target.value) })}
                  required
                />
                <div className="form-text">Days after the paid-until date before a site is overdue.</div>
              </Col>
              <Col md={6} className="mb-3">
                <label className="form-label" htmlFor="default_region">
                  Default region for new sites
                </label>
                <select id="default_region" className="form-select" value={form.default_region} onChange={(e) => setForm({ ...form, default_region: e.target.value })}>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Col>
            </Row>
            <div className="text-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </>
  );
};

export default Settings;
