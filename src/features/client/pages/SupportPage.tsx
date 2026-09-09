import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createSupportService } from '../../../services/api/supportService';
import type { SupportMessage, SupportTicket, SupportTicketCategory } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';

const supportService = createSupportService();
const CATEGORIES: SupportTicketCategory[] = ['deposit', 'withdrawal', 'account', 'investment', 'technical', 'other'];
const STATUS_VARIANT: Record<SupportTicket['status'], string> = {
  open: 'primary',
  in_progress: 'info',
  waiting: 'warning',
  resolved: 'success',
  closed: 'secondary',
};

function TicketThread({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  async function load() {
    setIsLoading(true);
    const data = await supportService.listMessages(ticket.id);
    setMessages(data);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    return supportService.subscribeToMessages(ticket.id, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!profile || !reply.trim()) return;
    setIsSending(true);
    try {
      await supportService.sendMessage(ticket.id, profile.id, reply.trim(), false);
      setReply('');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal title={ticket.subject} show onClose={onClose} size="lg">
      {isLoading ? (
        <LoadingScreen label="Loading conversation..." />
      ) : (
        <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded ${message.isAdmin ? 'bg-body-tertiary align-self-start' : 'bg-primary-subtle align-self-end'}`}
              style={{ maxWidth: '80%' }}
            >
              <p className="mb-1 small text-secondary">{message.isAdmin ? 'Support' : 'You'}</p>
              <p className="mb-0">{message.message}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSend} className="d-flex gap-2">
        <input
          type="text"
          className="form-control"
          placeholder="Type a reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          aria-label="Reply message"
        />
        <button type="submit" className="btn btn-primary" disabled={isSending || !reply.trim()}>
          Send
        </button>
      </form>
    </Modal>
  );
}

export function SupportPage() {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('other');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await supportService.listMyTickets(profile.id);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!profile || !subject.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await supportService.createTicket(profile.id, subject.trim(), category, message.trim());
      showSuccess('Support ticket created.');
      setShowNewModal(false);
      setSubject('');
      setMessage('');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading support tickets..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Support Center</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          New Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon="bi-life-preserver" title="No support tickets" message="Need help? Open a new ticket." />
      ) : (
        <div className="list-group">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onClick={() => setActiveTicket(ticket)}
            >
              <div>
                <p className="fw-semibold mb-1">{ticket.subject}</p>
                <p className="text-secondary small mb-0 text-capitalize">{ticket.category}</p>
              </div>
              <span className={`badge text-bg-${STATUS_VARIANT[ticket.status]} text-capitalize`}>{ticket.status.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
      )}

      <Modal title="New Support Ticket" show={showNewModal} onClose={() => setShowNewModal(false)}>
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label htmlFor="subject" className="form-label">
              Subject
            </label>
            <input id="subject" type="text" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <select id="category" className="form-select" value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="text-capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="message" className="form-label">
              Message
            </label>
            <textarea id="message" className="form-control" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </form>
      </Modal>

      {activeTicket && <TicketThread ticket={activeTicket} onClose={() => setActiveTicket(null)} />}
    </div>
  );
}
