export type PopupPosition = 'bottom-left' | 'bottom-right';

const POPUP_ID = 'ic-activity-popup';

/**
 * Single shared floating card element for both demoTicker.ts and
 * socialProofPopup.ts — Critso-styled (white card, rust accent, the page's
 * own Poppins/Inter fonts) instead of the dark ad hoc card this used to be,
 * which looked like a bolted-on generic SaaS widget next to the rest of the
 * dashboard. Both callers share the same DOM node (looked up by id, created
 * once) so the two systems can never render two overlapping cards at once.
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
    maxWidth: '280px',
    background: '#ffffff',
    color: '#161326',
    border: '1px solid rgba(22,19,38,0.08)',
    borderRadius: '10px',
    boxShadow: '0 6px 20px rgba(22,19,38,0.12)',
    padding: '0.65rem 0.8rem',
    fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    pointerEvents: 'none',
  });
  document.body.appendChild(el);
  return el;
}

export interface PopupCardOptions {
  message: string;
  timeText?: string;
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
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.55rem;">
      <span style="width:1.6rem;height:1.6rem;border-radius:50%;background:#a8442e;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="icon-check" style="color:#fff;font-size:0.7rem;"></i>
      </span>
      <div style="min-width:0;flex:1;">
        <p style="margin:0;font-size:0.78rem;font-weight:600;line-height:1.35;color:#161326;">${escapeHtml(options.message)}</p>
        ${options.timeText ? `<p style="margin:0.15rem 0 0;font-size:0.68rem;color:#8A8A8E;">${escapeHtml(options.timeText)}</p>` : ''}
      </div>
      ${options.closable ? '<button type="button" data-popup-close aria-label="Close" style="background:none;border:none;color:#8A8A8E;opacity:0.7;cursor:pointer;font-size:0.9rem;line-height:1;padding:0;flex-shrink:0;align-self:flex-start;">&times;</button>' : ''}
    </div>
  `;
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
