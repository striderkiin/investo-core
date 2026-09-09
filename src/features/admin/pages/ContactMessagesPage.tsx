import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createContactService } from '../../../services/api/contactService';
import type { ContactMessage, ContactMessageStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';

const contactService = createContactService();

const STATUS_VARIANT: Record<ContactMessageStatus, string> = {
  new: 'primary',
  read: 'info',
  responded: 'success',
  closed: 'secondary',
};

const STATUSES: ContactMessageStatus[] = ['new', 'read', 'responded', 'closed'];

export function ContactMessagesPage() {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<ContactMessageStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ContactMessage | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setMessages(await contactService.listAll(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact messages');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleOpen(message: ContactMessage) {
    setActive(message);
    if (message.status === 'new') {
      try {
        const updated = await contactService.updateStatus(message.id, 'read', profile?.id);
        setMessages((current) => current.map((m) => (m.id === updated.id ? updated : m)));
      } catch {
        // non-critical — leave status as-is if this fails
      }
    }
  }

  async function handleStatusChange(status: ContactMessageStatus) {
    if (!active) return;
    try {
      const updated = await contactService.updateStatus(active.id, status, profile?.id);
      setActive(updated);
      setMessages((current) => current.map((m) => (m.id === updated.id ? updated : m)));
      showSuccess(`Marked ${status}.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Contact Messages</h2>
      <p className="text-secondary small mb-0">Inquiries submitted from the public Contact page, including from visitors without an account.</p>

      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter('all')}>
          All
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading messages..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : messages.length === 0 ? (
        <EmptyState icon="bi-envelope" title="No messages" message="Nothing to show for this filter." />
      ) : (
        <div className="list-group">
          {messages.map((message) => (
            <button
              key={message.id}
              type="button"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onClick={() => handleOpen(message)}
            >
              <div>
                <p className="fw-semibold mb-1">{message.subject}</p>
                <p className="text-secondary small mb-0">
                  {message.name} &lt;{message.email}&gt; &middot; {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`badge text-bg-${STATUS_VARIANT[message.status]} text-capitalize`}>{message.status}</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <Modal title={active.subject} show onClose={() => setActive(null)}>
          <p className="text-secondary small mb-3">
            From {active.name} &lt;{active.email}&gt; &middot; {new Date(active.createdAt).toLocaleString()}
          </p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{active.message}</p>
          <hr />
          <div className="d-flex gap-2 flex-wrap">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${active.status === status ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleStatusChange(status)}
              >
                {status}
              </button>
            ))}
          </div>
          <a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`} className="btn btn-sm btn-outline-primary mt-3">
            <i className="bi bi-reply me-1" aria-hidden="true" />
            Reply by Email
          </a>
        </Modal>
      )}
    </div>
  );
}
