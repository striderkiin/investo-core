import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createAnnouncementService } from '../../../services/api/announcementService';
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementDelivery,
  AnnouncementType,
} from '../../../services/api/announcementService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';
import type { RoleName } from '../../../types/roles';

const announcementService = createAnnouncementService();

const TYPES: AnnouncementType[] = ['maintenance_notice', 'promotion', 'system_update', 'important_notice'];
const AUDIENCES: AnnouncementAudience[] = ['everyone', 'clients', 'admins', 'specific_role'];
const DELIVERIES: AnnouncementDelivery[] = ['banner', 'popup', 'notification', 'email'];
const ROLES: RoleName[] = ['super_admin', 'finance_admin', 'support_admin', 'operations_admin', 'client'];

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('important_notice');
  const [audience, setAudience] = useState<AnnouncementAudience>('everyone');
  const [targetRole, setTargetRole] = useState<RoleName>('client');
  const [delivery, setDelivery] = useState<AnnouncementDelivery[]>(['banner']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setAnnouncements(await announcementService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleDelivery(value: AnnouncementDelivery) {
    setDelivery((current) => (current.includes(value) ? current.filter((d) => d !== value) : [...current, value]));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!profile || !title.trim() || !body.trim() || delivery.length === 0) {
      showError('Fill in title, body, and at least one delivery method.');
      return;
    }
    setIsSubmitting(true);
    try {
      await announcementService.create({
        title: title.trim(),
        body: body.trim(),
        type,
        audience,
        targetRole: audience === 'specific_role' ? targetRole : null,
        delivery,
        createdBy: profile.id,
      });
      showSuccess('Announcement created.');
      setShowForm(false);
      setTitle('');
      setBody('');
      setDelivery(['banner']);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(announcement: Announcement) {
    try {
      await announcementService.setActive(announcement.id, !announcement.isActive);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  }

  async function handleDelete(announcement: Announcement) {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await announcementService.remove(announcement.id);
      showSuccess('Announcement deleted.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading announcements..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Announcements</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon="bi-megaphone" title="No announcements yet" />
      ) : (
        <div className="list-group">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <p className="fw-semibold mb-1">{announcement.title}</p>
                  <p className="text-secondary small mb-1">{announcement.body}</p>
                  <p className="text-secondary small mb-0 text-capitalize">
                    {announcement.type.replace(/_/g, ' ')} &middot; {announcement.audience.replace('_', ' ')}
                    {announcement.audience === 'specific_role' && announcement.targetRole ? ` (${announcement.targetRole})` : ''} &middot; via {announcement.delivery.join(', ')}
                  </p>
                </div>
                <div className="d-flex flex-column gap-1 align-items-end flex-shrink-0">
                  <span className={`badge text-bg-${announcement.isActive ? 'success' : 'secondary'}`}>{announcement.isActive ? 'Active' : 'Inactive'}</span>
                  <div className="d-flex gap-1">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleToggleActive(announcement)}>
                      {announcement.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(announcement)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="New Announcement" show={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label htmlFor="annTitle" className="form-label">
              Title
            </label>
            <input id="annTitle" type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="annBody" className="form-label">
              Message
            </label>
            <textarea id="annBody" className="form-control" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="annType" className="form-label">
                Type
              </label>
              <select id="annType" className="form-select" value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t} className="text-capitalize">
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label htmlFor="annAudience" className="form-label">
                Audience
              </label>
              <select id="annAudience" className="form-select" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a} className="text-capitalize">
                    {a.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {audience === 'specific_role' && (
            <div className="mb-3">
              <label htmlFor="annTargetRole" className="form-label">
                Specific Role
              </label>
              <select id="annTargetRole" className="form-select" value={targetRole} onChange={(e) => setTargetRole(e.target.value as RoleName)}>
                {ROLES.map((r) => (
                  <option key={r} value={r} className="text-capitalize">
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-3">
            <span className="form-label d-block">Delivery</span>
            {DELIVERIES.map((d) => (
              <div className="form-check form-check-inline" key={d}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`delivery-${d}`}
                  checked={delivery.includes(d)}
                  onChange={() => toggleDelivery(d)}
                />
                <label className="form-check-label text-capitalize" htmlFor={`delivery-${d}`}>
                  {d}
                </label>
              </div>
            ))}
            {delivery.some((d) => d === 'email') && <p className="text-secondary small mb-0 mt-1">Email delivery is handled server-side (Phase 7 email provider).</p>}
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Announcement'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
