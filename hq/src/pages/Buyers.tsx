import { useState, type FormEvent } from 'react';
import { Button, Card, CardBody, Modal, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { api, type BuyerInput } from '../api';
import PageTitle from '../PageTitle';
import type { Buyer } from '../types';
import { formatDate } from '../types';
import { useLoad } from '../useLoad';

const EMPTY: BuyerInput = { name: '', email: '', contact: '', notes: '' };

const Buyers = () => {
  const { data, error, reload } = useLoad(async () => {
    const [buyers, sites] = await Promise.all([api.buyers(), api.sites()]);
    return { buyers, sites };
  });
  const [editing, setEditing] = useState<Buyer | 'new' | null>(null);
  const [form, setForm] = useState<BuyerInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const open = (buyer: Buyer | 'new') => {
    setEditing(buyer);
    setForm(buyer === 'new' ? EMPTY : { name: buyer.name, email: buyer.email ?? '', contact: buyer.contact ?? '', notes: buyer.notes ?? '' });
    setFormError(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') await api.createBuyer(form);
      else if (editing) await api.updateBuyer(editing.id, form);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="spinner-border text-primary" role="status" />;

  const set = (key: keyof BuyerInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <PageTitle title="Buyers">
        <Button onClick={() => open('new')}>Add buyer</Button>
      </PageTitle>
      <Card>
        <CardBody>
          {data.buyers.length === 0 ? (
            <p className="text-muted mb-0">No buyers yet. Add your first buyer, then add their site.</p>
          ) : (
            <div className="table-responsive">
              <Table className="mb-0 table-centered">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Other contact</th>
                    <th>Sites</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.buyers.map((b) => {
                    const sites = data.sites.filter((s) => s.buyer_id === b.id);
                    return (
                      <tr key={b.id}>
                        <td className="fw-medium">{b.name}</td>
                        <td>{b.email ?? '—'}</td>
                        <td>{b.contact ?? '—'}</td>
                        <td>
                          {sites.length === 0
                            ? '—'
                            : sites.map((s, i) => (
                                <span key={s.id}>
                                  {i > 0 && ', '}
                                  <Link to={`/sites/${s.id}`}>{s.name}</Link>
                                </span>
                              ))}
                        </td>
                        <td>{formatDate(b.created_at)}</td>
                        <td className="text-end">
                          <Button size="sm" variant="light" onClick={() => open(b)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal show={editing !== null} onHide={() => setEditing(null)} centered>
        <form onSubmit={save}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">{editing === 'new' ? 'Add buyer' : 'Edit buyer'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="mb-3">
              <label className="form-label" htmlFor="b-name">
                Name
              </label>
              <input id="b-name" className="form-control" value={form.name} onChange={set('name')} maxLength={120} required />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="b-email">
                Email
              </label>
              <input id="b-email" type="email" className="form-control" value={form.email ?? ''} onChange={set('email')} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="b-contact">
                Other contact
              </label>
              <input id="b-contact" className="form-control" value={form.contact ?? ''} onChange={set('contact')} maxLength={200} placeholder="Telegram, WhatsApp or phone" />
            </div>
            <div>
              <label className="form-label" htmlFor="b-notes">
                Notes
              </label>
              <textarea id="b-notes" className="form-control" rows={3} value={form.notes ?? ''} onChange={set('notes')} maxLength={5000} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default Buyers;
