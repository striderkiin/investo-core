import { requireClientSession } from './shell';
import { createSupportService } from '../../src/services/api/supportService';
import type { SupportMessage, SupportTicket, SupportTicketCategory } from '../../src/types/database';
import { formatRelativeTime } from './format';

const supportService = createSupportService();

let userId = '';
let unsubscribeThread: (() => void) | null = null;

async function loadTickets(): Promise<void> {
  const tickets = await supportService.listMyTickets(userId);
  const list = document.getElementById('ticketList');
  if (!list) return;

  if (tickets.length === 0) {
    list.innerHTML = '<p class="f14-regular text-Gray mb-0">No support tickets yet. Open one above if you need help.</p>';
    return;
  }

  list.innerHTML = tickets
    .map(
      (t) => `
        <div class="wg-user w-full type-lg message-item" data-ticket-id="${t.id}" style="cursor:pointer;">
          <div class="flex-grow">
            <div class="flex items-center justify-between">
              <a href="javascript:void(0);" class="f14-bold name">${t.subject}</a>
              <div class="f12-medium">${formatRelativeTime(t.updatedAt)}</div>
            </div>
            <div class="f12-regular desc text-capitalize">${t.category} &middot; ${t.status.replace('_', ' ')}</div>
          </div>
        </div>`
    )
    .join('');

  list.querySelectorAll<HTMLElement>('[data-ticket-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.ticketId;
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) void openThread(ticket);
    });
  });
}

function renderMessages(messages: SupportMessage[]): void {
  const container = document.getElementById('ticketThreadMessages');
  if (!container) return;

  container.innerHTML = messages
    .map(
      (m) => `
        <div class="p-2 mb-2 rounded" style="max-width:80%;${m.isAdmin ? '' : 'margin-left:auto;'}background:${m.isAdmin ? 'var(--Gainsboro)' : 'var(--Primary)'};${m.isAdmin ? '' : 'color:var(--White);'}">
          <div class="f12-medium mb-1" style="opacity:0.7;">${m.isAdmin ? 'Support' : 'You'}</div>
          <div class="f14-regular">${m.message}</div>
        </div>`
    )
    .join('');
  container.scrollTop = container.scrollHeight;
}

async function openThread(ticket: SupportTicket): Promise<void> {
  const listPanel = document.getElementById('ticketListPanel');
  const threadPanel = document.getElementById('ticketThreadPanel');
  const subjectEl = document.getElementById('ticketThreadSubject');
  if (!listPanel || !threadPanel || !subjectEl) return;

  listPanel.style.display = 'none';
  threadPanel.style.display = '';
  subjectEl.textContent = ticket.subject;

  const messages = await supportService.listMessages(ticket.id);
  renderMessages(messages);

  unsubscribeThread?.();
  unsubscribeThread = supportService.subscribeToMessages(ticket.id, () => {
    void supportService.listMessages(ticket.id).then(renderMessages);
  });

  const replyForm = document.getElementById('ticketReplyForm') as HTMLFormElement | null;
  const replyInput = document.getElementById('ticketReplyInput') as HTMLInputElement | null;
  if (replyForm && replyInput) {
    replyForm.onsubmit = (event) => {
      event.preventDefault();
      const text = replyInput.value.trim();
      if (!text) return;
      replyInput.value = '';
      void supportService.sendMessage(ticket.id, userId, text, false);
    };
  }
}

function closeThread(): void {
  unsubscribeThread?.();
  unsubscribeThread = null;
  const listPanel = document.getElementById('ticketListPanel');
  const threadPanel = document.getElementById('ticketThreadPanel');
  if (listPanel) listPanel.style.display = '';
  if (threadPanel) threadPanel.style.display = 'none';
  void loadTickets();
}

function wireNewTicketForm(): void {
  const toggle = document.getElementById('newTicketToggle');
  const form = document.getElementById('newTicketForm') as HTMLFormElement | null;
  const subjectInput = document.getElementById('newTicketSubject') as HTMLInputElement | null;
  const categorySelect = document.getElementById('newTicketCategory') as HTMLSelectElement | null;
  const messageInput = document.getElementById('newTicketMessage') as HTMLTextAreaElement | null;
  if (!toggle || !form || !subjectInput || !categorySelect || !messageInput) return;

  toggle.addEventListener('click', () => {
    form.style.display = form.style.display === 'block' ? 'none' : 'block';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    if (!subject || !message) return;
    void supportService.createTicket(userId, subject, categorySelect.value as SupportTicketCategory, message).then(() => {
      subjectInput.value = '';
      messageInput.value = '';
      form.style.display = 'none';
      void loadTickets();
    });
  });
}

function wireBackButton(): void {
  document.getElementById('ticketThreadBack')?.addEventListener('click', closeThread);
}

async function main() {
  const profile = await requireClientSession();
  userId = profile.id;
  wireNewTicketForm();
  wireBackButton();
  await loadTickets();
}

void main();
