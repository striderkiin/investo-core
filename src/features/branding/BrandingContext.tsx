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
  primaryColor: '#0d6efd',
  secondaryColor: '#6c757d',
  successColor: '#198754',
  warningColor: '#ffc107',
  dangerColor: '#dc3545',
  backgroundColor: '#f5f7fa',
  surfaceColor: '#ffffff',
  textColor: '#1c2333',
  theme: 'light',
  primaryFont: 'Inter',
  headingFont: 'Inter',
};

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
