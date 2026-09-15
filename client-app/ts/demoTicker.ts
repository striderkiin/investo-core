import { createSocialProofService } from '../../src/services/api/socialProofService';
import { ensurePopupElement, showPopupCard, hidePopupCard, getRotationState, setRotationState, createPausableTimer } from './socialProofUI';
import type { PopupPosition } from './socialProofUI';
import type { SocialProofDemoActivity } from '../../src/types/database';

const DISPLAY_MS = 6000;
const GAP_MS = 8000;
const STATE_KEY = 'ic_demo_ticker_state';

const socialProofService = createSocialProofService();

/**
 * Mounts a standalone, purely client-side rotation of canned marketing
 * activity messages onto this static page — the client-app equivalent of
 * DemoActivityTicker (src/features/socialProof), since these pages sit
 * outside the React app tree entirely and can't share that component. No
 * realtime subscription, no "time ago" line — this is admin-authored demo
 * content, not real production activity.
 *
 * client-app pages are separate full page loads rather than SPA routes, so
 * the rotation position is persisted to sessionStorage — otherwise every
 * navigation restarted the ticker at item 1 instead of continuing where it
 * left off.
 */
export function mountDemoTicker(): void {
  void Promise.all([socialProofService.getSettings(), socialProofService.listDemoActivities()])
    .then(([settings, activities]) => {
      if (!settings.demoModeEnabled || activities.length === 0) return;
      runTicker(settings.popupPosition as PopupPosition, activities);
    })
    .catch(() => undefined);
}

function runTicker(position: PopupPosition, activities: SocialProofDemoActivity[]): void {
  const el = ensurePopupElement(position);
  const saved = getRotationState(STATE_KEY);
  let index = saved ? saved.index % activities.length : 0;

  function cycle(): void {
    const current = activities[index % activities.length];
    const nextIndex = (index + 1) % activities.length;
    // Persist the *next* step immediately, not after DISPLAY_MS — a visitor
    // who navigates away mid-display still leaves a consistent "resume from
    // here, no earlier than this" marker for the next page.
    setRotationState(STATE_KEY, { index: nextIndex, nextEligibleAt: Date.now() + DISPLAY_MS + GAP_MS });

    showPopupCard(el, {
      message: current.message,
      nameLocation: current.simulatedName ? `${current.simulatedName}${current.simulatedLocation ? ` from ${current.simulatedLocation}` : ''}` : undefined,
      avatar: { displayName: current.simulatedName },
    });

    createPausableTimer(el, DISPLAY_MS, () => {
      hidePopupCard(el);
      setTimeout(() => {
        index = nextIndex;
        cycle();
      }, GAP_MS);
    });
  }

  const now = Date.now();
  if (saved && saved.nextEligibleAt > now) {
    setTimeout(cycle, saved.nextEligibleAt - now);
  } else {
    cycle();
  }
}
