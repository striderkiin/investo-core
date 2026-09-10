import { requireClientSession } from './shell';
import { createNotificationService } from '../../src/services/api/notificationService';
import type { AppNotification, NotificationType } from '../../src/types/database';
import { formatRelativeTime } from './format';

const notificationService = createNotificationService();

const ICON: Record<NotificationType, string> = {
  deposit_confirmed: 'icon-wallet1',
  withdrawal_pending: 'icon-sms-tracking',
  withdrawal_processing: 'icon-arrow-swap',
  withdrawal_completed: 'icon-tick-square',
  investment_started: 'icon-category1',
  investment_completed: 'icon-tick-square',
  referral_bonus: 'icon-add',
  system_announcement: 'icon-notification1',
  new_user: 'icon-person',
  large_withdrawal: 'icon-setting-5',
  failed_payment: 'icon-close-square',
  security_alert: 'icon-setting-5',
  support_ticket: 'icon-message-text1',
};

let userId = '';

function renderList(notifications: AppNotification[]): void {
  const list = document.getElementById('notificationsList');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = '<p class="f14-regular text-Gray mb-0">No notifications yet.</p>';
    return;
  }

  list.innerHTML = notifications
    .map(
      (n) => `
        <div class="notifications-item${n.readAt ? '' : ' active'}" data-id="${n.id}" style="cursor:pointer;">
          <div class="image">
            <i class="${ICON[n.type]}"></i>
          </div>
          <div class="content">
            <div class="body-title-2">${n.title}</div>
            <div class="text-tiny">${n.message}</div>
          </div>
          <div class="text-tiny text-Gray">${formatRelativeTime(n.createdAt)}</div>
        </div>`
    )
    .join('');

  list.querySelectorAll<HTMLElement>('.notifications-item[data-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (!id) return;
      void notificationService.markAsRead(id).then(() => load());
    });
  });
}

function updateMarkAllButton(notifications: AppNotification[]): void {
  const button = document.getElementById('markAllReadButton');
  if (!button) return;
  const hasUnread = notifications.some((n) => !n.readAt);
  button.style.display = hasUnread ? '' : 'none';
}

async function load(): Promise<void> {
  const notifications = await notificationService.list(userId);
  renderList(notifications);
  updateMarkAllButton(notifications);
}

function wireMarkAllRead(): void {
  const button = document.getElementById('markAllReadButton');
  button?.addEventListener('click', () => {
    void notificationService.markAllAsRead(userId).then(() => load());
  });
}

async function main() {
  const profile = await requireClientSession();
  userId = profile.id;
  wireMarkAllRead();
  await load();
  notificationService.subscribeToNewNotifications(userId, () => void load());
}

void main();
