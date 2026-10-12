// The site's primary color from Branding. The React pages (landing, admin
// preview) and the static customer dashboard both read it through CSS
// variables, so one save in Branding recolors everything.
export const DEFAULT_BRAND_COLOR = '#a8442e';
const STORAGE_KEY = 'investo.brandColor';

const VALID = /^#[0-9a-f]{6}$/i;

/** Sets every CSS variable that carries the accent: --ic-primary (shared), --YellowGreen (customer dashboard). */
export function applyBrandColor(color: string | null | undefined): void {
  const hex = color && VALID.test(color) ? color : DEFAULT_BRAND_COLOR;
  const root = document.documentElement;
  root.style.setProperty('--ic-primary', hex);
  root.style.setProperty('--YellowGreen', hex);
  try {
    localStorage.setItem(STORAGE_KEY, hex);
  } catch {
    // Private mode or blocked storage: the color still applies for this page.
  }
}

/** Applies the last known color right away so pages don't flash the default before Branding loads. */
export function applyCachedBrandColor(): void {
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(STORAGE_KEY);
  } catch {
    cached = null;
  }
  if (cached && VALID.test(cached)) applyBrandColor(cached);
}

/** The accent as #rrggbb, for chart libraries that need a real color rather than a CSS variable. */
export function brandColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--ic-primary').trim();
  return VALID.test(value) ? value : DEFAULT_BRAND_COLOR;
}

/** #rrggbb plus an alpha, as rgba(). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) ?? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(DEFAULT_BRAND_COLOR)!;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}
