import { buildAvatarNode } from './avatarRender';
import type { AvatarInput } from '../../src/shared/avatar';
import { resolveAvatar } from '../../src/shared/avatar';

export type PopupPosition = 'bottom-left' | 'bottom-right';

const POPUP_ID = 'ic-activity-popup';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Single shared floating card element for both demoTicker.ts and
 * socialProofPopup.ts — Critso-styled (white card, rust accent, the page's
 * own Poppins/Inter fonts) instead of the dark ad hoc card this used to be,
 * which looked like a bolted-on generic SaaS widget next to the rest of the
 * dashboard. Both callers share the same DOM node (looked up by id, created
 * once) so the two systems can never render two overlapping cards at once.
 *
 * Corner radius (16px) matches .wg-card — this dashboard's actual CARD
 * radius (public/client-app/css/styles.css; .tf-button's 4px is for
 * buttons, much tighter, and was the wrong token for a floating card).
 */
export function ensurePopupElement(position: PopupPosition): HTMLDivElement {
  const existing = document.getElementById(POPUP_ID) as HTMLDivElement | null;
  if (existing) return existing;

  const el = document.createElement('div');
  el.id = POPUP_ID;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '1rem',
    [position === 'bottom-right' ? 'right' : 'left']: '1rem',
    zIndex: '1050',
    width: 'calc(100% - 2rem)',
    maxWidth: '320px',
    background: '#f8f5f0',
    color: '#1a1710',
    border: '1px solid rgba(168,68,46,0.3)',
    borderRadius: '16px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
    padding: '0.875rem 1rem 0.75rem',
    fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    opacity: '0',
    transform: 'translateY(10px)',
    transition: prefersReducedMotion() ? 'opacity 0.15s linear' : 'transform 0.3s ease, opacity 0.3s ease',
    pointerEvents: 'none',
  });
  document.body.appendChild(el);
  return el;
}

export interface PopupCardOptions {
  message: string;
  timeText?: string;
  /** "Name from Location", rendered bold above the message — which then drops to regular weight, since the name line carries the emphasis instead. Omitted for 'market' rows (no person behind a price tick) and the real-feed popup (no location data), which keep the single bold-message layout. */
  nameLocation?: string;
  /** Omitted for canned demo content with no simulated name — falls to the brand-mark tier. */
  avatar?: AvatarInput;
  closable?: boolean;
  onClose?: () => void;
  onClick?: () => void;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

export function showPopupCard(el: HTMLDivElement, options: PopupCardOptions): void {
  const messageWeight = options.nameLocation ? '400' : '700';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.7rem;">
      <span data-popup-avatar style="width:2.75rem;height:2.75rem;flex-shrink:0;"></span>
      <div style="min-width:0;flex:1;">
        ${options.nameLocation ? `<p style="margin:0;font-size:0.8rem;font-weight:700;line-height:1.3;color:#1a1710;">${escapeHtml(options.nameLocation)}</p>` : ''}
        <p style="margin:${options.nameLocation ? '0.2rem' : '0'} 0 0;font-size:0.8rem;font-weight:${messageWeight};line-height:1.3;color:#1a1710;">${escapeHtml(options.message)}</p>
        ${options.timeText ? `<p style="margin:0.2rem 0 0;font-size:0.7rem;color:rgba(26,23,16,0.45);">${escapeHtml(options.timeText)}</p>` : ''}
      </div>
      ${options.closable ? '<button type="button" data-popup-close aria-label="Close" style="background:none;border:none;color:rgba(26,23,16,0.4);opacity:0.8;cursor:pointer;font-size:0.9rem;line-height:1;padding:0;flex-shrink:0;align-self:flex-start;">&times;</button>' : ''}
    </div>
  `;

  const avatarSlot = el.querySelector<HTMLSpanElement>('[data-popup-avatar]');
  if (avatarSlot) avatarSlot.replaceWith(buildAvatarNode(resolveAvatar(options.avatar ?? {})));

  el.style.pointerEvents = 'auto';
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';

  if (options.onClose) {
    el.querySelector<HTMLButtonElement>('[data-popup-close]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onClose?.();
    });
  }
  if (options.onClick) {
    el.addEventListener('click', options.onClick, { once: true });
  }
}

export function hidePopupCard(el: HTMLDivElement): void {
  el.style.opacity = '0';
  el.style.transform = 'translateY(10px)';
  el.style.pointerEvents = 'none';
}

/**
 * A single-shot timer that a caller can pause/resume around hover, without
 * losing track of how much display time is left — used so hovering the
 * popup to read it doesn't let it vanish mid-read (spec: pause auto-dismiss
 * on hover; the close button keeps working regardless of hover state,
 * since it's a separate click listener entirely).
 */
export function createPausableTimer(el: HTMLElement, ms: number, onFire: () => void) {
  let remaining = ms;
  let startedAt = Date.now();
  let handle: ReturnType<typeof setTimeout> | null = null;

  function start(): void {
    startedAt = Date.now();
    handle = setTimeout(() => {
      handle = null;
      onFire();
    }, remaining);
  }

  function onEnter(): void {
    if (!handle) return;
    clearTimeout(handle);
    handle = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }

  function onLeave(): void {
    if (handle) return;
    start();
  }

  el.addEventListener('mouseenter', onEnter);
  el.addEventListener('mouseleave', onLeave);
  start();

  return {
    cancel(): void {
      if (handle) clearTimeout(handle);
      handle = null;
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    },
  };
}

// --- Cross-page-load rotation persistence ---
// client-app pages are separate full page loads, not SPA routes, so any
// in-memory "which item is next" state resets on every navigation without
// this — the ticker looked like it was restarting from item 1 every time a
// visitor moved between dashboard pages.

interface RotationState {
  index: number;
  nextEligibleAt: number;
}

export function getRotationState(key: string): RotationState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as RotationState;
  } catch {
    return null;
  }
}

export function setRotationState(key: string, state: RotationState): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore — a private window or blocked storage just means no continuity across pages
  }
}
