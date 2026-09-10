import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocialProofService } from '../../services/api/socialProofService';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabase/client';
import { mapSocialProofEventRow, mapSocialProofSettingsRow } from '../../services/supabase/mappers';
import type { SocialProofEventRow, SocialProofSettingsRow } from '../../services/supabase/mappers';
import type { SocialProofEvent, SocialProofSettings } from '../../types/database';

const DISMISS_KEY = 'ic_social_proof_dismissed_until';
const SESSION_COUNT_KEY = 'ic_social_proof_session_count';

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

/** Hides future popups per the user's chosen dismissal scope (spec item 37). */
export function dismissSocialProofFor(scope: 'session' | '1hour' | 'always'): void {
  try {
    if (scope === 'session') {
      sessionStorage.setItem('ic_social_proof_hidden_session', '1');
    } else if (scope === '1hour') {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 60 * 60 * 1000));
    } else {
      localStorage.setItem(DISMISS_KEY, 'always');
    }
  } catch {
    // ignore
  }
}

function isHiddenForSession(): boolean {
  try {
    return sessionStorage.getItem('ic_social_proof_hidden_session') === '1';
  } catch {
    return false;
  }
}

/**
 * Drives the client-facing activity popup queue. Production events and
 * admin-enabled test-stream events arrive through the exact same realtime
 * channel and are rendered identically — the client never sees which one it
 * got (spec items 21/22: "never expose internal test-mode labels to clients").
 */
export function useSocialProofFeed() {
  const [settings, setSettings] = useState<SocialProofSettings | null>(null);
  const [current, setCurrent] = useState<SocialProofEvent | null>(null);
  const queueRef = useRef<SocialProofEvent[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const recentTimestampsRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceRef = useRef(isSupabaseConfigured() ? createSocialProofService() : null);

  const advance = useCallback(() => {
    const service = serviceRef.current;
    const settingsNow = settings;
    if (!service || !settingsNow) return;

    if (isDismissed() || isHiddenForSession()) {
      setCurrent(null);
      return;
    }

    const now = Date.now();
    recentTimestampsRef.current = recentTimestampsRef.current.filter((t) => now - t < 60_000);
    if (recentTimestampsRef.current.length >= settingsNow.maxPerMinute) {
      timerRef.current = setTimeout(advance, 5000);
      return;
    }
    if (getSessionCount() >= settingsNow.maxPerSession) {
      setCurrent(null);
      return;
    }

    const next = queueRef.current.shift();
    if (!next) {
      setCurrent(null);
      return;
    }

    recentTimestampsRef.current.push(now);
    incrementSessionCount();
    setCurrent(next);
    void service.recordInteraction(next.id, 'shown').catch(() => undefined);

    timerRef.current = setTimeout(() => {
      setCurrent(null);
      const delay = settingsNow.minDelaySeconds + Math.random() * (settingsNow.maxDelaySeconds - settingsNow.minDelaySeconds);
      timerRef.current = setTimeout(advance, delay * 1000);
    }, settingsNow.displayDurationSeconds * 1000);
  }, [settings]);

  const enqueue = useCallback(
    (event: SocialProofEvent) => {
      if (seenIdsRef.current.has(event.id)) return;
      seenIdsRef.current.add(event.id);
      queueRef.current.push(event);
      if (queueRef.current.length > (settings?.maxQueue ?? 10)) {
        queueRef.current = queueRef.current.slice(-1 * (settings?.maxQueue ?? 10));
      }
      if (!current && !timerRef.current) advance();
    },
    [settings, current, advance]
  );

  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;
    service
      .getSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !settings?.enabled) return;
    const client = getSupabaseClient();
    // Unique per hook instance — see useMaintenanceStatus.ts for the
    // same-channel-name double-subscribe bug this avoids.
    const channel = client
      .channel(`social_proof_events_feed_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_proof_events' }, (payload) => {
        enqueue(mapSocialProofEventRow(payload.new as SocialProofEventRow));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'social_proof_settings' }, (payload) => {
        setSettings(mapSocialProofSettingsRow(payload.new as SocialProofSettingsRow));
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [settings?.enabled, enqueue]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const dismiss = useCallback(
    (scope: 'session' | '1hour' | 'always' = 'session') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (current) void serviceRef.current?.recordInteraction(current.id, 'dismissed').catch(() => undefined);
      dismissSocialProofFor(scope);
      setCurrent(null);
    },
    [current]
  );

  const click = useCallback(() => {
    if (current) void serviceRef.current?.recordInteraction(current.id, 'clicked').catch(() => undefined);
  }, [current]);

  return { settings, current, dismiss, click };
}
