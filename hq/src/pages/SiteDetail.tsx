import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { api, today, type SiteInput } from '../api';
import PageTitle from '../PageTitle';
import SiteForm from '../SiteForm';
import {
  BILLING_LABEL,
  BILLING_VARIANT,
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_VARIANT,
  formatDate,
  money,
  type HqSettings,
  type PaymentKind,
  type SiteOverview,
} from '../types';
import { useLoad } from '../useLoad';

const toInput = (s: SiteOverview): SiteInput => ({
  buyer_id: s.buyer_id,
  name: s.name,
  domain: s.domain ?? '',
  temp_url: s.temp_url ?? '',
  status: s.status,
  billing_cycle: s.billing_cycle,
  monthly_fee: Number(s.monthly_fee),
  region: s.region,
  supabase_ref: s.supabase_ref ?? '',
  notes: s.notes ?? '',
});

// The usual amount for each kind of payment, from Settings and this site's fee.
const defaultAmount = (kind: PaymentKind, site: SiteOverview, settings: HqSettings) => {
  switch (kind) {
    case 'launch':
      return Number(settings.launch_fee) + Number(site.monthly_fee);
    case 'monthly':
      return Number(site.monthly_fee);
    case 'yearly':
      return Number(settings.yearly_fee);
    case 'parking':
      return Number(settings.parking_fee);
    default:
      return 0;
  }
};

const PAYMENT_EFFECT: Record<PaymentKind, string> = {
  launch: 'Adds one month. Use this for the first payment (launch fee plus the first month).',
  monthly: 'Adds one month.',
  yearly: 'Adds twelve months and switches the site to yearly billing.',
  parking: 'Adds one month and marks the site as parked.',
  custom: 'Does not change the paid-until date.',
};

const SiteDetail = () => {
  const { id = '' } = useParams();
  const { data, error, reload } = useLoad(async () => {
    const [site, buyers, payments, events, settings] = await Promise.all([api.site(id), api.buyers(), api.payments(id), api.events(id), api.settings()]);
    return { site, buyers, payments, events, settings };
  }, [id]);

  const [form, setForm] = useState<SiteInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ variant: string; text: string } | null>(null);

  const [kind, setKind] = useState<PaymentKind>('launch');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(today());
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(toInput(data.site));
    const firstKind: PaymentKind = data.payments.some((p) => !p.voided_at) ? (data.site.billing_cycle === 'yearly' ? 'yearly' : 'monthly') : 'launch';
    setKind(firstKind);
    setAmount(String(defaultAmount(firstKind, data.site, data.settings)));
  }, [data]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data || !form) return <div className="spinner-border text-primary" role="status" />;

  const { site, buyers, payments, events, settings } = data;

  const saveSite = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateSite(site.id, form);
      setMessage({ variant: 'success', text: 'Site saved.' });
      reload();
    } catch (err) {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const changeKind = (next: PaymentKind) => {
    setKind(next);
    setAmount(String(defaultAmount(next, site, settings)));
  };

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setMessage({ variant: 'danger', text: 'Enter the amount received.' });
      return;
    }
    setPaying(true);
    setMessage(null);
    try {
      const until = await api.recordPayment({ siteId: site.id, kind, amount: value, method, reference, note, paidAt });
      setMessage({ variant: 'success', text: until ? `Payment recorded. Paid until ${formatDate(until)}.` : 'Payment recorded.' });
      setMethod('');
      setReference('');
      setNote('');
      reload();
    } catch (err) {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not record the payment.' });
    } finally {
      setPaying(false);
    }
  };

  const voidPayment = async (paymentId: string) => {
    if (!window.confirm('Void this payment? The paid-until date goes back to what the previous payment set.')) return;
    try {
      await api.voidPayment(paymentId);
      setMessage({ variant: 'success', text: 'Payment voided.' });
      reload();
    } catch (err) {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not void the payment.' });
    }
  };

  const address = site.domain ? `https://${site.domain}` : site.temp_url;

  return (
    <>
      <PageTitle title={site.name}>
        <Link to="/sites" className="btn btn-light">
          All sites
        </Link>
        {address && (
          <a className="btn btn-light" href={address} target="_blank" rel="noreferrer">
            Open site
          </a>
        )}
      </PageTitle>
      {message && <div className={`alert alert-${message.variant}`}>{message.text}</div>}
      <Row>
        <Col md={4}>
          <Card>
            <CardBody>
              <p className="text-muted text-uppercase fs-12 fw-medium mb-1">Status</p>
              <Badge bg={STATUS_VARIANT[site.status]} className="fs-13">
                {STATUS_LABEL[site.status]}
              </Badge>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <CardBody>
              <p className="text-muted text-uppercase fs-12 fw-medium mb-1">Paid until</p>
              <h4 className="mb-0">{formatDate(site.paid_until)}</h4>
              {site.days_left !== null && (
                <p className="text-muted fs-12 mb-0 mt-1">{site.days_left >= 0 ? `${site.days_left} days left` : `${Math.abs(site.days_left)} days ago`}</p>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <CardBody>
              <p className="text-muted text-uppercase fs-12 fw-medium mb-1">Billing</p>
              <Badge bg={BILLING_VARIANT[site.billing_state]} className="fs-13">
                {BILLING_LABEL[site.billing_state]}
              </Badge>
              {site.billing_state === 'grace' && <p className="text-muted fs-12 mb-0 mt-1">The site locks after {settings.grace_days} days unpaid.</p>}
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col xl={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Site details</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <form onSubmit={saveSite}>
                <SiteForm form={form} setForm={setForm} buyers={buyers} isNew={false} />
                <div className="mt-3 text-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Record a payment</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <form onSubmit={recordPayment}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="p-kind">
                    What it is for
                  </label>
                  <select id="p-kind" className="form-select" value={kind} onChange={(e) => changeKind(e.target.value as PaymentKind)}>
                    {(Object.keys(PAYMENT_LABEL) as PaymentKind[]).map((k) => (
                      <option key={k} value={k}>
                        {PAYMENT_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">{PAYMENT_EFFECT[kind]}</div>
                </div>
                <Row>
                  <Col sm={6} className="mb-3">
                    <label className="form-label" htmlFor="p-amount">
                      Amount ($)
                    </label>
                    <input id="p-amount" type="number" min={0} step="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </Col>
                  <Col sm={6} className="mb-3">
                    <label className="form-label" htmlFor="p-date">
                      Date received
                    </label>
                    <input id="p-date" type="date" className="form-control" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
                  </Col>
                  <Col sm={6} className="mb-3">
                    <label className="form-label" htmlFor="p-method">
                      Paid with
                    </label>
                    <input id="p-method" className="form-control" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={60} placeholder="USDT, bank transfer..." />
                  </Col>
                  <Col sm={6} className="mb-3">
                    <label className="form-label" htmlFor="p-ref">
                      Reference
                    </label>
                    <input id="p-ref" className="form-control" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} placeholder="Transaction ID" />
                  </Col>
                </Row>
                <div className="mb-3">
                  <label className="form-label" htmlFor="p-note">
                    Note
                  </label>
                  <input id="p-note" className="form-control" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                </div>
                <div className="text-end">
                  <Button type="submit" disabled={paying}>
                    {paying ? 'Saving…' : 'Record payment'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Payments</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {payments.length === 0 ? (
            <p className="text-muted mb-0">No payments yet.</p>
          ) : (
            <div className="table-responsive">
              <Table className="mb-0 table-centered">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>For</th>
                    <th>Amount</th>
                    <th>Paid with</th>
                    <th>Reference</th>
                    <th>Paid until after</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={p.voided_at ? 'text-muted text-decoration-line-through' : undefined}>
                      <td>{formatDate(p.paid_at)}</td>
                      <td>
                        {PAYMENT_LABEL[p.kind]}
                        {p.note && <div className="fs-12 text-muted">{p.note}</div>}
                      </td>
                      <td>{money(p.amount)}</td>
                      <td>{p.method ?? '—'}</td>
                      <td className="text-break">{p.reference ?? '—'}</td>
                      <td>{formatDate(p.paid_until_after)}</td>
                      <td className="text-end">
                        {p.voided_at ? (
                          <span className="fs-12">Voided</span>
                        ) : (
                          <Button size="sm" variant="light" onClick={() => void voidPayment(p.id)}>
                            Void
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h4">History</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {events.length === 0 ? (
            <p className="text-muted mb-0">Nothing yet.</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {events.map((e) => (
                <li key={e.id} className="d-flex justify-content-between border-bottom py-2 gap-3">
                  <span>{e.detail ?? e.kind}</span>
                  <span className="text-muted fs-12 text-nowrap">{new Date(e.created_at).toLocaleString('en-GB')}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default SiteDetail;
