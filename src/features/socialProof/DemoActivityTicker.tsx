import { useEffect, useRef, useState } from 'react';
import { createSocialProofService } from '../../services/api/socialProofService';
import { isSupabaseConfigured } from '../../services/supabase/client';
import type { SocialProofDemoActivity, SocialProofSettings } from '../../types/database';

const DISPLAY_MS = 6000;
const GAP_MS = 8000;

/**
 * A standalone, purely client-side rotation of canned marketing activity
 * messages — deliberately separate from SocialProofPopup, which only ever
 * renders genuine production events for authenticated sessions. This has
 * no realtime subscription and no "time ago" line, since the content
 * isn't tied to a real timestamp. Mounted once at the app root so it
 * appears on public, client, and admin routes alike.
 */
export function DemoActivityTicker() {
  const [settings, setSettings] = useState<SocialProofSettings | null>(null);
  const [activities, setActivities] = useState<SocialProofDemoActivity[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const serviceRef = useRef(isSupabaseConfigured() ? createSocialProofService() : null);

  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;
    Promise.all([service.getSettings(), service.listDemoActivities()])
      .then(([s, a]) => {
        setSettings(s);
        setActivities(a);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settings?.demoModeEnabled || activities.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function cycle(i: number) {
      if (cancelled) return;
      setIndex(i);
      setVisible(true);
      timer = setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        timer = setTimeout(() => cycle((i + 1) % activities.length), GAP_MS);
      }, DISPLAY_MS);
    }
    cycle(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [settings?.demoModeEnabled, activities]);

  if (!settings?.demoModeEnabled || activities.length === 0) return null;
  const current = activities[index];
  if (!current) return null;

  const side = settings.popupPosition === 'bottom-right' ? 'ic-social-proof-right' : 'ic-social-proof-left';

  return (
    <div
      className={`ic-social-proof-popup ${side} ${visible ? 'ic-social-proof-enter' : 'ic-social-proof-exit'}`}
      role="status"
      aria-live="polite"
    >
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="ic-social-proof-dot" aria-hidden="true" />
        <span className="small fw-semibold">Recent Activity</span>
      </div>
      <p className="mb-0 small">{current.message}</p>
    </div>
  );
}
