import { createSocialProofService } from '../../src/services/api/socialProofService';

const DISPLAY_MS = 6000;
const GAP_MS = 8000;

const socialProofService = createSocialProofService();

/**
 * Mounts a standalone, purely client-side rotation of canned marketing
 * activity messages onto this static page — the client-app equivalent of
 * DemoActivityTicker (src/features/socialProof), since these pages sit
 * outside the React app tree entirely and can't share that component. No
 * realtime subscription, no "time ago" line — this is admin-authored demo
 * content, not real production activity.
 */
export function mountDemoTicker(): void {
  void Promise.all([socialProofService.getSettings(), socialProofService.listDemoActivities()])
    .then(([settings, activities]) => {
      if (!settings.demoModeEnabled || activities.length === 0) return;

      const el = buildElement(settings.popupPosition);
      document.body.appendChild(el);
      const messageEl = el.querySelector<HTMLParagraphElement>('[data-ticker-message]');
      let index = 0;

      function cycle() {
        const current = activities[index % activities.length];
        index += 1;
        if (messageEl) messageEl.textContent = current.message;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(12px)';
          setTimeout(cycle, GAP_MS);
        }, DISPLAY_MS);
      }
      cycle();
    })
    .catch(() => undefined);
}

function buildElement(position: string): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '1.25rem',
    [position === 'bottom-right' ? 'right' : 'left']: '1.25rem',
    zIndex: '1050',
    maxWidth: '340px',
    background: '#111111',
    color: '#f5f5f5',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    padding: '0.9rem 1rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: '0.85rem',
    opacity: '0',
    transform: 'translateY(12px)',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  });
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
      <span style="width:0.5rem;height:0.5rem;border-radius:50%;background:#c6a15b;display:inline-block;"></span>
      <span style="font-weight:600;">Recent Activity</span>
    </div>
    <p data-ticker-message style="margin:0;"></p>
  `;
  return el;
}
