import { createMaintenanceService } from '../../src/services/api/maintenanceService';

const maintenanceService = createMaintenanceService();

/**
 * The client-app equivalent of MaintenanceBanner + MaintenanceScreen (React
 * SPA, src/features/operations). Checked once per page load rather than via
 * a live realtime subscription — reasonable here since each navigation
 * between these static pages is itself a fresh load, unlike the SPA where a
 * client could sit on one page for a long session.
 *
 * Returns true if the page was blocked (body replaced with the maintenance
 * screen) and the caller should stop — mirrors requireClientSession's own
 * "replace body/redirect, then throw" pattern in shell.ts.
 */
export async function applyMaintenanceGuard(): Promise<boolean> {
  const settings = await maintenanceService.get().catch(() => null);
  if (!settings || !settings.enabled) return false;

  if (settings.showBanner) {
    renderBanner(settings.bannerTitle, settings.bannerMessage);
  }

  if (settings.restrictClientAccess) {
    renderBlockScreen(settings.bannerTitle, settings.bannerMessage);
    return true;
  }

  return false;
}

function renderBanner(title: string, message: string): void {
  // The page header/sidebar are position:fixed at top:0 (see styles.css),
  // so a normal-flow banner at the top of <body> would render underneath
  // them. Overlaying fixed on top, above the header's z-index, is simpler
  // and more robust across all 8 pages than reflowing that fixed layout.
  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '2000',
    background: '#fff3cd',
    color: '#664d03',
    textAlign: 'center',
    padding: '0.5rem 1rem',
    fontSize: '0.8rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  });
  banner.innerHTML = `<strong>${escapeHtml(title)}</strong> — ${escapeHtml(message)}`;
  document.body.prepend(banner);
}

function renderBlockScreen(title: string, message: string): void {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="font-size:3rem;color:#c6a15b;" aria-hidden="true">&#9888;</div>
      <h1 style="margin-top:1rem;font-size:1.5rem;">${escapeHtml(title)}</h1>
      <p style="max-width:480px;color:#666;">${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
