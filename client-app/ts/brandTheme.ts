import { createBrandingService } from '../../src/services/api/brandingService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { applyBrandColor } from '../../src/shared/brandColor';

let started = false;

/**
 * Recolors the customer pages with the Branding primary color. The inline
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
      document.dispatchEvent(new CustomEvent('investo:brandcolor'));
    })
    .catch(() => {
      // Branding is public-read; on a network error keep the cached or default color.
    });
}
