import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { createNotificationService } from '../../../services/api/notificationService';
import type { AppNotification } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const notificationService = createNotificationService();

const ICONS: Record<AppNotification['type'], string> = {
  deposit_confirmed: 'bi-arrow-down-circle text-success',
  withdrawal_pending: 'bi-hourglass-split text-warning',
  withdrawal_processing: 'bi-arrow-repeat text-info',
  withdrawal_completed: 'bi-check-circle text-success',
  investment_started: 'bi-graph-up text-primary',
  investment_completed: 'bi-trophy text-success',
  referral_bonus: 'bi-gift text-success',
  system_announcement: 'bi-megaphone text-primary',
  new_user: 'bi-person-plus text-primary',
  large_withdrawal: 'bi-exclamation-triangle text-warning',
  failed_payment: 'bi-x-circle text-danger',
  security_alert: 'bi-shield-exclamation text-danger',
  support_ticket: 'bi-life-preserver text-primary',
};

export function ClientNotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.list(profile.id);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return undefined;
    return notificationService.subscribeToNewNotifications(profile.id, (notification) => {
      setNotifications((current) => [notification, ...current]);
    });
  }, [profile?.id]);

  async function markAllRead() {
    if (!profile) return;
    await notificationService.markAllAsRead(profile.id);
    await load();
  }

  async function markRead(id: string) {
    await notificationService.markAsRead(id);
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  if (isLoading) return <LoadingScreen label="Loading notifications..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Notifications</h2>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={markAllRead}>
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="bi-bell" title="No notifications" message="You're all caught up." />
      ) : (
        <div className="list-group">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`list-group-item list-group-item-action d-flex gap-3 ${!notification.readAt ? 'bg-primary-subtle' : ''}`}
              onClick={() => !notification.readAt && markRead(notification.id)}
            >
              <i className={`bi ${ICONS[notification.type]} fs-4`} aria-hidden="true" />
              <div className="flex-grow-1 text-start">
                <p className="fw-semibold mb-1">{notification.title}</p>
                <p className="mb-1 text-secondary small">{notification.message}</p>
                <p className="mb-0 text-secondary small">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.readAt && <span className="badge text-bg-primary align-self-start">New</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
