import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { createNotificationService } from '../../src/services/api/notificationService';
import { createSupportService } from '../../src/services/api/supportService';
import type { Profile, SupportTicketStatus } from '../../src/types/database';
import { formatRelativeTime } from './format';
import { renderAvatar } from './avatarRender';
import { mountDemoTicker } from './demoTicker';
import { mountSocialProofPopup } from './socialProofPopup';
import { applyMaintenanceGuard } from './maintenanceGuard';

const authService = createAuthService();
const notificationService = createNotificationService();
const supportService = createSupportService();

const OPEN_TICKET_STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'waiting'];

/**
 * Runs on every client-app page before anything else: confirms there's a
 * real logged-in client (redirecting to sign-in.html otherwise, see
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
    window.location.replace('/client-app/sign-in.html');
    throw new Error('Not authenticated');
  }

  const profile = await authService.getCurrentProfile();
  if (!profile) {
    window.location.replace('/client-app/sign-in.html');
    throw new Error('No profile');
  }

  if (profile.role !== 'client') {
    // An admin/support account browsing these pages directly — send them
    // back to the panel that's actually theirs rather than showing a
    // client-only dashboard with no data scoped to them.
    window.location.replace('/admin');
    throw new Error('Not a client account');
  }

  const blocked = await applyMaintenanceGuard();
  if (blocked) {
    throw new Error('Client access restricted for maintenance');
  }

  populateHeader(profile);
  wireLogout();
  wireHeaderSearch();
  void populateHeaderWidgets(profile);
  mountDemoTicker();
  mountSocialProofPopup();
  return profile;
}

/**
 * The header search box (top of every page except deposit/withdraw's
 * stripped-down header) submitted a plain GET to the current page and did
 * nothing — there's no unified search index across transactions/plans/
 * investments to build here, so this sends the query to the one page that
 * already has a real local filter (transaction.ts reads ?q= on load).
 * `.header-left form.form-search` scopes to this one specifically — some
 * pages (transaction.html) also have their own separate in-page search
 * form with its own id, which this must not intercept.
 */
function wireHeaderSearch(): void {
  const form = document.querySelector<HTMLFormElement>('.header-left form.form-search');
  const input = form?.querySelector<HTMLInputElement>('input[name="name"]');
  if (!form || !input) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    window.location.href = `transaction.html?q=${encodeURIComponent(query)}`;
  });
}

function populateHeader(profile: Profile): void {
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = profile.fullName || profile.email;

  const roleEl = document.getElementById('userRole');
  if (roleEl) roleEl.textContent = profile.accountStatus === 'active' ? 'Client' : profile.accountStatus.replace('_', ' ');

  renderAvatar('userAvatar', { photoUrl: profile.avatarUrl, avatarKey: profile.avatarKey, displayName: profile.fullName });
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
    (n) => formatRelativeTime(n.createdAt),
    // AppNotification carries no related-entity id to deep-link to, so a
    // click here goes to the full list (and marks it read) rather than a
    // specific target — still real navigation instead of the dead click
    // this had before.
    (n) => void notificationService.markAsRead(n.id).finally(() => window.location.assign('notifications.html'))
  );

  fillSlots(
    'headerMessage',
    tickets.slice(0, 4),
    (t) => t.subject,
    (t) => t.status.replace('_', ' '),
    (t) => formatRelativeTime(t.updatedAt),
    undefined,
    // Tickets, unlike notifications, always have their own id in hand
    // here — deep-link straight to the thread instead of the generic list.
    (t) => `message.html?ticket=${t.id}`
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
  getTime: (item: T) => string,
  onClick?: (item: T) => void,
  getHref?: (item: T) => string
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
    if (getHref && title instanceof HTMLAnchorElement) title.href = getHref(item);
    if (onClick) {
      slot.style.cursor = 'pointer';
      slot.onclick = (event) => {
        // The title itself may be its own <a> (message slots) — let that
        // handle its own navigation via getHref rather than double-firing.
        if ((event.target as HTMLElement).closest('a')) return;
        onClick(item);
      };
    }
  }

  const emptyEl = document.getElementById(`${prefix}Empty`);
  if (emptyEl) emptyEl.style.display = items.length === 0 ? '' : 'none';
}

function wireLogout(): void {
  const links = [document.getElementById('logoutLink'), document.getElementById('sidebarLogoutLink')];
  for (const link of links) {
    link?.addEventListener('click', (event) => {
      event.preventDefault();
      void authService.logout().then(() => {
        window.location.replace('/client-app/sign-in.html');
      });
    });
  }
}
