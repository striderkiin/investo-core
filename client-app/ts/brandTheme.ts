import { createBrandingService } from '../../src/services/api/brandingService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import type { Branding } from '../../src/services/api/brandingService';
import { applyBrandColor } from '../../src/shared/brandColor';

let started = false;

/** Puts the operator's logo (or name, when there is no logo image) and site name on the page. */
function applyIdentity(branding: Branding): void {
  const logo = document.getElementById('logo_header') as HTMLImageElement | null;
  const src = branding.logoDarkUrl ?? branding.logoUrl;
  if (logo && src) {
    logo.src = src;
    logo.alt = branding.siteName;
  } else if (logo) {
    const name = document.createElement('span');
    name.id = 'logo_header';
    name.textContent = branding.logoText || branding.siteName;
    name.style.cssText = 'display:block;max-width:150px;color:#fff;font-weight:700;font-size:17px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    logo.replaceWith(name);
  }
  document.title = document.title.replace(/^Investo\b/, branding.siteName);
}

/**
 * Recolors and rebrands the customer pages with the Branding primary color. The inline
 * head script has already applied the last known color, so this only
 * repaints when the operator changed it since the last visit.
 */
export function loadBrandColor(): void {
  if (started || !isSupabaseConfigured()) return;
  started = true;
  createBrandingService()
    .get()
    .then((branding) => {
      applyBrandColor(branding.primaryColor);
      applyIdentity(branding);
      document.dispatchEvent(new CustomEvent('investo:brandcolor'));
    })
    .catch(() => {
      // Branding is public-read; on a network error keep the cached or default color.
    });
}
