import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { createNotificationService } from '../../src/services/api/notificationService';
import { createSupportService } from '../../src/services/api/supportService';
import type { Profile, SupportTicketStatus } from '../../src/types/database';
import { formatRelativeTime } from './format';
import { mountDemoTicker } from './demoTicker';

const authService = createAuthService();
const notificationService = createNotificationService();
const supportService = createSupportService();

const OPEN_TICKET_STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'waiting'];

/**
 * Runs on every client-app page before anything else: confirms there's a
 * real logged-in client (redirecting to the React app's /login otherwise —
 * this static multi-page app has no auth UI of its own, see
 * client-app/README.md), then populates the shared header (name, role,
 * avatar) and wires the logout link. Every page's own script calls this
 * and gets the resolved profile back to render its own real data with.
 */
export async function requireClientSession(): Promise<Profile> {
  if (!isSupabaseConfigured()) {
    document.body.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif;">Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>';
    throw new Error('Supabase not configured');
  }

  const session = await authService.getSession();
  if (!session) {
    window.location.replace('/login');
    throw new Error('Not authenticated');
  }

  const profile = await authService.getCurrentProfile();
  if (!profile) {
    window.location.replace('/login');
    throw new Error('No profile');
  }

  if (profile.role !== 'client') {
    // An admin/support account browsing these pages directly — send them
    // back to the panel that's actually theirs rather than showing a
    // client-only dashboard with no data scoped to them.
    window.location.replace('/admin');
    throw new Error('Not a client account');
  }

  populateHeader(profile);
  wireLogout();
  void populateHeaderWidgets(profile);
  mountDemoTicker();
  return profile;
}

function populateHeader(profile: Profile): void {
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = profile.fullName || profile.email;

  const roleEl = document.getElementById('userRole');
  if (roleEl) roleEl.textContent = profile.accountStatus === 'active' ? 'Client' : profile.accountStatus.replace('_', ' ');

  const avatarEl = document.getElementById('userAvatar') as HTMLImageElement | null;
  if (avatarEl && profile.avatarUrl) avatarEl.src = profile.avatarUrl;
}

/**
 * Fills the header's Notifications and Support Tickets dropdown previews
 * with real data. Both dropdowns are identical markup on every page here
 * (4 fixed slots + an empty state + a "View All" link), so this is the one
 * place that needs to know about them.
 */
async function populateHeaderWidgets(profile: Profile): Promise<void> {
  const [notifications, tickets] = await Promise.all([
    notificationService.list(profile.id).catch(() => []),
    supportService.listMyTickets(profile.id).catch(() => []),
  ]);

  fillSlots(
    'headerNotification',
    notifications.slice(0, 4),
    (n) => n.title,
    (n) => n.message,
    (n) => formatRelativeTime(n.createdAt)
  );

  fillSlots(
    'headerMessage',
    tickets.slice(0, 4),
    (t) => t.subject,
    (t) => t.status.replace('_', ' '),
    (t) => formatRelativeTime(t.updatedAt)
  );

  const openCount = tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length;
  const countEl = document.getElementById('headerOpenTicketsCount');
  if (countEl) countEl.textContent = String(openCount);
}

function fillSlots<T>(
  prefix: string,
  items: T[],
  getTitle: (item: T) => string,
  getDesc: (item: T) => string,
  getTime: (item: T) => string
): void {
  for (let i = 0; i < 4; i++) {
    const slot = document.getElementById(`${prefix}Slot${i}`);
    if (!slot) continue;
    const item = items[i];
    if (!item) {
      slot.style.display = 'none';
      continue;
    }
    slot.style.display = '';
    const title = slot.querySelector(`.${prefix}Title`);
    const desc = slot.querySelector(`.${prefix}Desc`);
    const time = slot.querySelector(`.${prefix}Time`);
    if (title) title.textContent = getTitle(item);
    if (desc) desc.textContent = getDesc(item);
    if (time) time.textContent = getTime(item);
  }

  const emptyEl = document.getElementById(`${prefix}Empty`);
  if (emptyEl) emptyEl.style.display = items.length === 0 ? '' : 'none';
}

function wireLogout(): void {
  const logoutLink = document.getElementById('logoutLink');
  if (!logoutLink) return;
  logoutLink.addEventListener('click', (event) => {
    event.preventDefault();
    void authService.logout().then(() => {
      window.location.replace('/login');
    });
  });
}
