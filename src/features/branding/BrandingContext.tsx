import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrandingService } from '../../services/api/brandingService';
import type { Branding } from '../../services/api/brandingService';
import { isSupabaseConfigured } from '../../services/supabase/client';

const DEFAULT_BRANDING: Branding = {
  id: 'default',
  siteName: 'Investo',
  logoUrl: null,
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  logoText: null,
  primaryColor: '#c6a15b',
  secondaryColor: '#a8a6a1',
  successColor: '#198754',
  warningColor: '#ffc107',
  dangerColor: '#dc3545',
  backgroundColor: '#080808',
  surfaceColor: '#111111',
  textColor: '#f5f3ee',
  theme: 'dark',
  primaryFont: 'Inter',
  headingFont: 'Inter',
};

/** #rrggbb -> "r, g, b", for Bootstrap CSS vars that need an rgb() triplet (rgba() blends, focus rings). Falls back to a neutral gray on a malformed value rather than breaking every dependent style. */
function hexToRgbTriplet(hex: string): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return '108, 117, 125';
  const [, r, g, b] = match;
  return `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`;
}

export interface BrandingContextValue {
  branding: Branding;
  isLoading: boolean;
  refresh: () => Promise<void>;
  applyPreview: (partial: Partial<Branding>) => void;
}

export const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

function applyCssVariables(branding: Branding) {
  const root = document.documentElement;
  root.style.setProperty('--ic-primary', branding.primaryColor);
  root.style.setProperty('--ic-secondary', branding.secondaryColor);
  root.style.setProperty('--ic-success', branding.successColor);
  root.style.setProperty('--ic-warning', branding.warningColor);
  root.style.setProperty('--ic-danger', branding.dangerColor);
  root.style.setProperty('--ic-background', branding.backgroundColor);
  root.style.setProperty('--ic-surface', branding.surfaceColor);
  root.style.setProperty('--ic-text', branding.textColor);
  root.style.setProperty('--ic-font-primary', `'${branding.primaryFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`);
  root.style.setProperty('--ic-font-heading', `'${branding.headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`);

  // Alias Bootstrap's own theme variables to the branding values, so every
  // vanilla .btn-primary/.card/.table/.badge/.alert across the dashboard
  // (there are dozens, built across 13 phases) picks up an operator's
  // configured colors automatically — previously these color pickers only
  // fed the handful of custom .ic-* classes, so most of Bootstrap's own
  // component chrome silently ignored them.
  root.style.setProperty('--bs-body-bg', branding.backgroundColor);
  root.style.setProperty('--bs-body-color', branding.textColor);
  root.style.setProperty('--bs-emphasis-color', branding.textColor);
  root.style.setProperty('--bs-tertiary-bg', branding.surfaceColor);
  root.style.setProperty('--bs-secondary-bg', branding.surfaceColor);
  root.style.setProperty('--bs-card-bg', branding.surfaceColor);
  root.style.setProperty('--bs-card-color', branding.textColor);
  root.style.setProperty('--bs-primary', branding.primaryColor);
  root.style.setProperty('--bs-primary-rgb', hexToRgbTriplet(branding.primaryColor));
  root.style.setProperty('--bs-success', branding.successColor);
  root.style.setProperty('--bs-success-rgb', hexToRgbTriplet(branding.successColor));
  root.style.setProperty('--bs-warning', branding.warningColor);
  root.style.setProperty('--bs-warning-rgb', hexToRgbTriplet(branding.warningColor));
  root.style.setProperty('--bs-danger', branding.dangerColor);
  root.style.setProperty('--bs-danger-rgb', hexToRgbTriplet(branding.dangerColor));
  root.style.setProperty('--bs-link-color', branding.primaryColor);
  root.style.setProperty('--bs-link-hover-color', branding.primaryColor);

  if (branding.theme === 'dark') {
    root.setAttribute('data-bs-theme', 'dark');
  } else if (branding.theme === 'light') {
    root.setAttribute('data-bs-theme', 'light');
  } else {
    root.removeAttribute('data-bs-theme');
  }

  document.title = branding.siteName;
  if (branding.faviconUrl) {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) link.href = branding.faviconUrl;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    try {
      const brandingService = createBrandingService();
      const data = await brandingService.get();
      setBranding(data);
    } catch {
      // Fall back to defaults — the branding table is public-read, so this
      // only fails when Supabase itself is unreachable/misconfigured.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    applyCssVariables(branding);
  }, [branding]);

  const applyPreview = useCallback((partial: Partial<Branding>) => {
    setBranding((current) => ({ ...current, ...partial }));
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, isLoading, refresh, applyPreview }),
    [branding, isLoading, refresh, applyPreview]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
