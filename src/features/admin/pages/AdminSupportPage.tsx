import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createSupportService } from '../../../services/api/supportService';
import type { SupportMessage, SupportTicket, SupportTicketStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';

const supportService = createSupportService();

const STATUS_VARIANT: Record<SupportTicketStatus, string> = {
  open: 'primary',
  in_progress: 'info',
  waiting: 'warning',
  resolved: 'success',
  closed: 'secondary',
};

const STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

function AdminTicketThread({ ticket, onClose, onUpdated }: { ticket: SupportTicket; onClose: () => void; onUpdated: () => void }) {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  async function load() {
    setIsLoading(true);
    setMessages(await supportService.listMessages(ticket.id));
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
      await supportService.sendMessage(ticket.id, profile.id, reply.trim(), true);
      setReply('');
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: SupportTicketStatus) {
    try {
      await supportService.updateStatus(ticket.id, status);
      showSuccess(`Ticket marked ${status.replace('_', ' ')}.`);
      onUpdated();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  }

  async function handleAssignToMe() {
    if (!profile) return;
    try {
      await supportService.assign(ticket.id, profile.id);
      showSuccess('Ticket assigned to you.');
      onUpdated();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  }

  return (
    <Modal title={ticket.subject} show onClose={onClose} size="lg">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAssignToMe}>
          Assign to Me
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm ${ticket.status === status ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => handleStatusChange(status)}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>
      {isLoading ? (
        <LoadingScreen label="Loading conversation..." />
      ) : (
        <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded ${message.isAdmin ? 'bg-primary-subtle align-self-end' : 'bg-light align-self-start'}`}
              style={{ maxWidth: '80%' }}
            >
              <p className="mb-1 small text-secondary">{message.isAdmin ? 'Support' : 'Client'}</p>
              <p className="mb-0">{message.message}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSend} className="d-flex gap-2">
        <input type="text" className="form-control" placeholder="Type a reply..." value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Reply message" />
        <button type="submit" className="btn btn-primary" disabled={isSending || !reply.trim()}>
          Send
        </button>
      </form>
    </Modal>
  );
}

export function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setTickets(await supportService.listAllTickets(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Support Center</h2>

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
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading tickets..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tickets.length === 0 ? (
        <EmptyState icon="bi-life-preserver" title="No tickets" message="Nothing to show for this filter." />
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

      {activeTicket && (
        <AdminTicketThread
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onUpdated={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}
