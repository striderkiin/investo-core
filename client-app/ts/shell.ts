import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import type { Profile } from '../../src/types/database';

const authService = createAuthService();

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
