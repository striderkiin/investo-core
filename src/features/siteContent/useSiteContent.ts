import { useCallback, useEffect, useState } from 'react';
import { createSiteContentService } from '../../services/api/siteContentService';
import { useBranding } from '../../hooks/useBranding';
import { LANDING_DEFAULTS } from './landingContent';

const CACHE_KEY = 'investo_site_content_v2';
const WAIT_MS = 1500;

type Saved = { values: Record<string, string>; updated: Record<string, string> };

let loaded: Saved | null = null;
let pending: Promise<Saved> | null = null;

function readCache(): Saved | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Saved) : null;
    return parsed && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

function load(): Promise<Saved> {
  pending ??= createSiteContentService()
    .getAllWithDates()
    .then((rows) => {
      loaded = rows;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
      } catch {
        // Private mode or storage full: the page still works, it just waits on the next visit.
      }
      return rows;
    })
    .catch(() => {
      pending = null;
      return loaded ?? readCache() ?? { values: {}, updated: {} };
    });
  return pending;
}

/**
 * Landing page text and images: what the admin set, else the default.
 * `ready` stays false until the saved text has loaded (or the last visit's
 * copy is in the browser), so visitors do not see the default text flash
 * before the business's own text. It gives up waiting after 1.5 seconds.
 */
export function useSiteContent() {
  const { branding } = useBranding();
  const [saved, setSaved] = useState<Saved | null>(() => loaded ?? readCache());

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => active && setSaved((v) => v ?? { values: {}, updated: {} }), WAIT_MS);
    void load().then((rows) => active && setSaved(rows));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const c = useCallback(
    (key: string): string => {
      const value = saved?.values[key] ?? LANDING_DEFAULTS[key] ?? '';
      return value.replaceAll('{site}', branding.siteName);
    },
    [saved, branding.siteName],
  );
  const updatedAt = useCallback((key: string): string | null => saved?.updated[key] ?? null, [saved]);

  return { c, ready: saved !== null, updatedAt };
}
