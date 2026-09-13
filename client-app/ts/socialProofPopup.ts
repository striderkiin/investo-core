import { createSocialProofService } from '../../src/services/api/socialProofService';
import { getSupabaseClient, isSupabaseConfigured } from '../../src/services/supabase/client';
import { mapSocialProofEventRow, mapSocialProofSettingsRow } from '../../src/services/supabase/mappers';
import type { SocialProofEventRow, SocialProofSettingsRow } from '../../src/services/supabase/mappers';
import type { SocialProofEvent, SocialProofSettings } from '../../src/types/database';
import { formatRelativeTime } from './format';
import { ensurePopupElement, showPopupCard, hidePopupCard } from './socialProofUI';
import type { PopupPosition } from './socialProofUI';

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

function backfillRecentEvents(enqueue: (event: SocialProofEvent) => void): void {
  void socialProofService
    .listRecentEvents()
    .then((events) => {
      // Newest-first from the API — reverse so the queue plays oldest to
      // newest, same order a live feed would have delivered them in.
      for (const event of [...events].reverse()) enqueue(event);
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

  function show(event: SocialProofEvent): void {
    const el = ensurePopupElement(settings.popupPosition as PopupPosition);
    showPopupCard(el, {
      message: event.message,
      timeText: formatRelativeTime(event.createdAt),
      closable: settings.showCloseButton,
      onClose: () => {
        if (timer) clearTimeout(timer);
        void socialProofService.recordInteraction(event.id, 'dismissed').catch(() => undefined);
        dismissFor('session');
        hide();
      },
      onClick: () => {
        void socialProofService.recordInteraction(event.id, 'clicked').catch(() => undefined);
        dismissFor('session');
        window.location.href = CLICK_DESTINATION[event.eventType] ?? 'index.html';
      },
    });
  }

  function hide(): void {
    current = null;
    hidePopupCard(ensurePopupElement(settings.popupPosition as PopupPosition));
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

  backfillRecentEvents(enqueue);

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

