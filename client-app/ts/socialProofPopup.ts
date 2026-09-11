import { createSocialProofService } from '../../src/services/api/socialProofService';
import { getSupabaseClient, isSupabaseConfigured } from '../../src/services/supabase/client';
import { mapSocialProofEventRow, mapSocialProofSettingsRow } from '../../src/services/supabase/mappers';
import type { SocialProofEventRow, SocialProofSettingsRow } from '../../src/services/supabase/mappers';
import type { SocialProofEvent, SocialProofSettings } from '../../src/types/database';
import { formatRelativeTime } from './format';

const DISMISS_KEY = 'ic_social_proof_dismissed_until';
const SESSION_COUNT_KEY = 'ic_social_proof_session_count';
const HIDDEN_SESSION_KEY = 'ic_social_proof_hidden_session';

// Shares localStorage/sessionStorage keys with the React SPA's
// useSocialProofFeed (same origin), so a dismissal made on one side is
// honored on the other if that system is ever re-mounted there too.
const CLICK_DESTINATION: Record<string, string> = {
  new_account: 'index.html',
  plan_activation: 'crypto.html',
  milestone: 'crypto.html',
  deposit_confirmed: 'transaction.html',
  withdrawal_completed: 'transaction.html',
  referral_joined: 'settings.html',
};

const socialProofService = createSocialProofService();

function isDismissed(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    if (until === 'always') return true;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

function isHiddenForSession(): boolean {
  try {
    return sessionStorage.getItem(HIDDEN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function getSessionCount(): number {
  try {
    return Number(sessionStorage.getItem(SESSION_COUNT_KEY) ?? '0');
  } catch {
    return 0;
  }
}

function incrementSessionCount(): void {
  try {
    sessionStorage.setItem(SESSION_COUNT_KEY, String(getSessionCount() + 1));
  } catch {
    // ignore — a private window or blocked storage just means no session cap tracking
  }
}

function dismissFor(scope: 'session' | '1hour' | 'always'): void {
  try {
    if (scope === 'session') {
      sessionStorage.setItem(HIDDEN_SESSION_KEY, '1');
    } else if (scope === '1hour') {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 60 * 60 * 1000));
    } else {
      localStorage.setItem(DISMISS_KEY, 'always');
    }
  } catch {
    // ignore
  }
}

/**
 * The client-app equivalent of SocialProofPopup + useSocialProofFeed (React
 * SPA, src/features/socialProof) — renders genuine, privacy-filtered
 * production activity (real deposits/withdrawals/investments/signups/
 * referrals) as they happen, via a live Supabase Realtime subscription.
 * Deliberately separate from demoTicker.ts, which only ever shows canned,
 * fictional marketing copy with no realtime feed behind it.
 */
export function mountSocialProofPopup(): void {
  if (!isSupabaseConfigured()) return;

  void socialProofService
    .getSettings()
    .then((settings) => {
      if (settings.enabled) runFeed(settings);
    })
    .catch(() => undefined);
}

function runFeed(initialSettings: SocialProofSettings): void {
  let settings = initialSettings;
  const queue: SocialProofEvent[] = [];
  const seenIds = new Set<string>();
  const recentTimestamps: number[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: SocialProofEvent | null = null;
  let el: HTMLDivElement | null = null;

  function ensureElement(): HTMLDivElement {
    if (el) return el;
    el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '1.25rem',
      [settings.popupPosition === 'bottom-right' ? 'right' : 'left']: '1.25rem',
      zIndex: '1050',
      maxWidth: '340px',
      background: '#111111',
      color: '#f5f5f5',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      padding: '0.9rem 1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: '0.85rem',
      opacity: '0',
      transform: 'translateY(12px)',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    });
    document.body.appendChild(el);
    return el;
  }

  function show(event: SocialProofEvent): void {
    const node = ensureElement();
    node.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
          <span style="width:0.5rem;height:0.5rem;border-radius:50%;background:#c6a15b;display:inline-block;"></span>
          <span style="font-weight:600;">Recent Activity</span>
        </div>
        ${settings.showCloseButton ? '<button type="button" data-sp-close aria-label="Close" style="background:none;border:none;color:inherit;opacity:0.6;cursor:pointer;font-size:1rem;line-height:1;padding:0;">&times;</button>' : ''}
      </div>
      <div data-sp-body style="cursor:pointer;">
        <p style="margin:0 0 0.2rem;">${escapeHtml(event.message)}</p>
        <p style="margin:0;opacity:0.6;font-size:0.75rem;">${formatRelativeTime(event.createdAt)}</p>
      </div>
    `;
    node.style.opacity = '1';
    node.style.transform = 'translateY(0)';

    node.querySelector<HTMLButtonElement>('[data-sp-close]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (timer) clearTimeout(timer);
      void socialProofService.recordInteraction(event.id, 'dismissed').catch(() => undefined);
      dismissFor('session');
      hide();
    });

    node.querySelector<HTMLDivElement>('[data-sp-body]')?.addEventListener('click', () => {
      void socialProofService.recordInteraction(event.id, 'clicked').catch(() => undefined);
      dismissFor('session');
      window.location.href = CLICK_DESTINATION[event.eventType] ?? 'index.html';
    });
  }

  function hide(): void {
    current = null;
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
    }
  }

  function advance(): void {
    if (isDismissed() || isHiddenForSession()) return;

    const now = Date.now();
    while (recentTimestamps.length && now - recentTimestamps[0] >= 60_000) recentTimestamps.shift();
    if (recentTimestamps.length >= settings.maxPerMinute) {
      timer = setTimeout(advance, 5000);
      return;
    }
    if (getSessionCount() >= settings.maxPerSession) return;

    const next = queue.shift();
    if (!next) return;

    recentTimestamps.push(now);
    incrementSessionCount();
    current = next;
    show(next);
    void socialProofService.recordInteraction(next.id, 'shown').catch(() => undefined);

    timer = setTimeout(() => {
      hide();
      const delay = settings.minDelaySeconds + Math.random() * (settings.maxDelaySeconds - settings.minDelaySeconds);
      timer = setTimeout(advance, delay * 1000);
    }, settings.displayDurationSeconds * 1000);
  }

  function enqueue(event: SocialProofEvent): void {
    if (seenIds.has(event.id)) return;
    seenIds.add(event.id);
    queue.push(event);
    if (queue.length > settings.maxQueue) queue.splice(0, queue.length - settings.maxQueue);
    if (!current && !timer) advance();
  }

  const client = getSupabaseClient();
  const channel = client
    .channel(`social_proof_events_feed_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_proof_events' }, (payload) => {
      enqueue(mapSocialProofEventRow(payload.new as SocialProofEventRow));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'social_proof_settings' }, (payload) => {
      settings = mapSocialProofSettingsRow(payload.new as SocialProofSettingsRow);
    })
    .subscribe();

  window.addEventListener('beforeunload', () => {
    void client.removeChannel(channel);
  });
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
