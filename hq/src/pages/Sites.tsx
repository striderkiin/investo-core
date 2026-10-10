import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, CardBody, Modal, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { api, type SiteInput } from '../api';
import PageTitle from '../PageTitle';
import SiteForm from '../SiteForm';
import { BILLING_LABEL, BILLING_VARIANT, STATUS_LABEL, STATUS_VARIANT, formatDate, money, regionLabel } from '../types';
import { useLoad } from '../useLoad';

const Sites = () => {
  const navigate = useNavigate();
  const { data, error } = useLoad(async () => {
    const [sites, buyers, settings] = await Promise.all([api.sites(), api.buyers(), api.settings()]);
    return { sites, buyers, settings };
  });
  const [form, setForm] = useState<SiteInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="spinner-border text-primary" role="status" />;

  const openNew = () => {
    setFormError(null);
    setForm({
      buyer_id: data.buyers[0]?.id ?? '',
      name: '',
      domain: '',
      temp_url: '',
      status: 'setting_up',
      billing_cycle: 'monthly',
      monthly_fee: Number(data.settings.monthly_fee),
      region: data.settings.default_region,
      supabase_ref: '',
      notes: '',
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const site = await api.createSite(form);
      navigate(`/sites/${site.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Sites">
        <Button onClick={openNew} disabled={data.buyers.length === 0} title={data.buyers.length === 0 ? 'Add a buyer first' : undefined}>
          Add site
        </Button>
      </PageTitle>
      <Card>
        <CardBody>
          {data.sites.length === 0 ? (
            <p className="text-muted mb-0">
              No sites yet. {data.buyers.length === 0 ? <Link to="/buyers">Add a buyer</Link> : 'Add a site'} to get started.
            </p>
          ) : (
            <div className="table-responsive">
              <Table className="mb-0 table-centered">
                <thead className="table-light">
                  <tr>
                    <th>Site</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th>Fee</th>
                    <th>Paid until</th>
                    <th>Billing</th>
                    <th>Region</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/sites/${s.id}`} className="fw-medium">
                          {s.name}
                        </Link>
                        <div className="text-muted fs-12">{s.domain ?? s.temp_url ?? 'No address yet'}</div>
                      </td>
                      <td>{s.buyer_name}</td>
                      <td>
                        <Badge bg={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      </td>
                      <td>
                        {s.billing_cycle === 'yearly' ? `${money(data.settings.yearly_fee)} a year` : `${money(s.monthly_fee)} a month`}
                      </td>
                      <td>{formatDate(s.paid_until)}</td>
                      <td>
                        <Badge bg={BILLING_VARIANT[s.billing_state]}>{BILLING_LABEL[s.billing_state]}</Badge>
                      </td>
                      <td>{regionLabel(s.region)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal show={form !== null} onHide={() => setForm(null)} centered size="lg">
        <form onSubmit={save}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">Add site</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger">{formError}</div>}
            {form && <SiteForm form={form} setForm={setForm} buyers={data.buyers} isNew />}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add site'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default Sites;
