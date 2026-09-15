/**
 * Avatar fallback chain, shared by every surface that renders a client's
 * profile picture: the client-app dashboard pages (vanilla DOM, see
 * client-app/ts/avatarRender.ts) and the React ticker/popup components
 * (src/features/socialProof). Framework-agnostic on purpose — it returns
 * data, never markup, so each renderer draws it its own way.
 *
 * Chain: uploaded photo -> picked illustrated avatar -> initials on a
 * brand-color circle. A "brand mark" tier below initials covers the one
 * case with no name to draw a letter from at all (a fully anonymized
 * social-proof event).
 *
 * Every illustrated icon is a simple line-art path (24x24 viewBox, stroke
 * only, no fill) meant to render in solid white on the brand-color circle
 * every tier below "photo" uses — recolor the whole chain by changing one
 * CSS variable (--ic-primary), never by touching this file.
 */

export interface AvatarLibraryEntry {
  key: string;
  label: string;
  /** Inner <svg> markup (paths only) — 24x24 viewBox, stroke="currentColor", fill="none". */
  svgPaths: string;
}

export const AVATAR_LIBRARY: AvatarLibraryEntry[] = [
  {
    key: 'compass',
    label: 'Compass',
    svgPaths:
      '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5z"/>',
  },
  {
    key: 'peak',
    label: 'Peak',
    svgPaths: '<path d="M3 18 9 8l3.5 5.5L15 10l6 8z"/><path d="M3 18h18"/>',
  },
  {
    key: 'wave',
    label: 'Wave',
    svgPaths: '<path d="M3 15c1.8-3 3.7-3 5.5 0s3.7 3 5.5 0 3.7-3 5.5 0"/><path d="M3 10c1.8-3 3.7-3 5.5 0s3.7 3 5.5 0 3.7-3 5.5 0"/>',
  },
  {
    key: 'orbit',
    label: 'Orbit',
    svgPaths: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)"/>',
  },
  {
    key: 'bolt',
    label: 'Bolt',
    svgPaths: '<path d="M13 2 5 14h5l-1 8 8-12h-5l1-8z"/>',
  },
  {
    key: 'leaf',
    label: 'Leaf',
    svgPaths: '<path d="M19 5c-8 0-14 6-14 14 8 0 14-6 14-14z"/><path d="M5 19c3-6 6-9 12-12"/>',
  },
  {
    key: 'prism',
    label: 'Prism',
    svgPaths: '<path d="M12 3 21 12l-9 9-9-9z"/><path d="M12 3v18M3 12h18"/>',
  },
  {
    key: 'star',
    label: 'Star',
    svgPaths: '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6z"/>',
  },
];

const AVATAR_LIBRARY_BY_KEY = new Map(AVATAR_LIBRARY.map((entry) => [entry.key, entry]));

/** The one anonymized-event glyph — no name, no library pick, nothing to draw an initial from. */
export const BRAND_MARK_SVG_PATHS = '<path d="M4 15 10 9l4 4 6-7"/><path d="M15 5h5v5"/>';

export type AvatarResolution =
  | { tier: 'photo'; url: string }
  | { tier: 'illustrated'; entry: AvatarLibraryEntry }
  | { tier: 'initials'; letter: string }
  | { tier: 'brand' };

export interface AvatarInput {
  photoUrl?: string | null;
  avatarKey?: string | null;
  displayName?: string | null;
}

/** Resolves the fallback chain: photo -> picked illustrated avatar -> initials -> brand mark. */
export function resolveAvatar(input: AvatarInput): AvatarResolution {
  if (input.photoUrl) return { tier: 'photo', url: input.photoUrl };

  const entry = input.avatarKey ? AVATAR_LIBRARY_BY_KEY.get(input.avatarKey) : undefined;
  if (entry) return { tier: 'illustrated', entry };

  const letter = (input.displayName ?? '').trim().charAt(0).toUpperCase();
  if (letter) return { tier: 'initials', letter };

  return { tier: 'brand' };
}
