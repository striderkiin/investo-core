import { useCallback, useEffect, useState } from 'react';
import { createSiteContentService } from '../../services/api/siteContentService';
import { useBranding } from '../../hooks/useBranding';
import { LANDING_DEFAULTS } from './landingContent';

const CACHE_KEY = 'investo_site_content';
const WAIT_MS = 1500;

let loaded: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

function readCache(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

function load(): Promise<Record<string, string>> {
  pending ??= createSiteContentService()
    .getAll()
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
      return loaded ?? readCache() ?? {};
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
  const [values, setValues] = useState<Record<string, string> | null>(() => loaded ?? readCache());

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => active && setValues((v) => v ?? {}), WAIT_MS);
    void load().then((rows) => active && setValues(rows));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const c = useCallback(
    (key: string): string => {
      const value = values?.[key] ?? LANDING_DEFAULTS[key] ?? '';
      return value.replaceAll('{site}', branding.siteName);
    },
    [values, branding.siteName],
  );

  return { c, ready: values !== null };
}
