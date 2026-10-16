import { IS_DEMO } from '../config/env';

/**
 * Timed demo sessions (demo builds only). /demo signs a visitor in as the
 * shared demo client or demo admin and stores when that session ends; every
 * client-app page and the admin panel then show a countdown bar and sign the
 * visitor out when it reaches zero.
 */

const KEY = 'investo.demoSession';

/** Where visitors go when their time is up, and where "Get this platform" points. */
export const DEMO_RETURN_URL =
  (import.meta.env.VITE_DEMO_RETURN_URL as string | undefined) || 'https://mojox.space/p/investo';

type StoredDemo = { userId: string; expiresAt: number };

export function startDemoSession(userId: string, expiresAt: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, expiresAt } satisfies StoredDemo));
  } catch {
    // Storage blocked: the session still works, just without the countdown.
  }
}

function readDemo(): StoredDemo | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as StoredDemo | null;
    return value && typeof value.expiresAt === 'number' && typeof value.userId === 'string' ? value : null;
  } catch {
    return null;
  }
}

function clearDemo(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

const UI_KEY = 'investo.demoTimerUi';
type TimerUi = { x?: number; y?: number; compact?: boolean };

function readUi(): TimerUi {
  try {
    return (JSON.parse(sessionStorage.getItem(UI_KEY) ?? '{}') as TimerUi) ?? {};
  } catch {
    return {};
  }
}

function writeUi(value: TimerUi): void {
  try {
    sessionStorage.setItem(UI_KEY, JSON.stringify(value));
  } catch {
    // Position just won't be remembered.
  }
}

const format = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

let mounted = false;

/**
 * Shows the countdown for the signed-in user if their session came from /demo.
 * A normal sign-in on the same browser is left alone: the stored session must
 * belong to the same user.
 */
export function mountDemoTimer(userId: string | null | undefined, signOut: () => Promise<unknown>): void {
  if (!IS_DEMO || mounted || !userId) return;
  const demo = readDemo();
  if (!demo || demo.userId !== userId) return;
  mounted = true;

  const end = async () => {
    clearDemo();
    await signOut().catch(() => undefined);
    window.location.replace(DEMO_RETURN_URL);
  };

  if (demo.expiresAt <= Date.now()) {
    void end();
    return;
  }

  const bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.title = 'Drag to move. Tap to shrink or expand.';
  bar.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)', 'z-index:2147483000',
    'display:flex', 'align-items:center', 'gap:12px', 'flex-wrap:wrap', 'justify-content:center',
    'max-width:calc(100vw - 32px)', 'padding:10px 16px', 'border-radius:999px',
    'background:#141416', 'color:#f5f5f5', 'border:1px solid #2a2830',
    'box-shadow:0 12px 32px rgba(0,0,0,.35)', 'font:600 14px/1.3 system-ui,sans-serif',
    'touch-action:none', 'user-select:none', '-webkit-user-select:none', 'cursor:grab',
  ].join(';');

  const label = document.createElement('span');
  const link = document.createElement('a');
  link.href = DEMO_RETURN_URL;
  link.textContent = 'Get this platform';
  link.style.cssText = 'color:#0b0b0b;background:#b483e2;padding:6px 12px;border-radius:999px;text-decoration:none;font-weight:800';
  bar.append(label, link);
  document.body.appendChild(bar);

  let compact = readUi().compact ?? false;
  const applyCompact = () => {
    link.style.display = compact ? 'none' : '';
    bar.style.padding = compact ? '8px 14px' : '10px 16px';
  };
  applyCompact();

  // Once moved, the bar keeps its spot (top-left corner, clamped on screen).
  const place = (x: number, y: number) => {
    const maxX = window.innerWidth - bar.offsetWidth - 8;
    const maxY = window.innerHeight - bar.offsetHeight - 8;
    bar.style.transform = 'none';
    bar.style.bottom = 'auto';
    bar.style.left = `${Math.round(Math.min(Math.max(8, x), Math.max(8, maxX)))}px`;
    bar.style.top = `${Math.round(Math.min(Math.max(8, y), Math.max(8, maxY)))}px`;
  };
  const saved = readUi();
  if (typeof saved.x === 'number' && typeof saved.y === 'number') place(saved.x, saved.y);
  window.addEventListener('resize', () => {
    if (bar.style.transform === 'none') place(bar.offsetLeft, bar.offsetTop);
  });

  let start: { x: number; y: number; left: number; top: number } | null = null;
  let moved = false;
  bar.addEventListener('pointerdown', (event) => {
    if (event.target === link) return;
    const rect = bar.getBoundingClientRect();
    start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    moved = false;
    bar.setPointerCapture(event.pointerId);
    bar.style.cursor = 'grabbing';
  });
  bar.addEventListener('pointermove', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    moved = true;
    place(start.left + dx, start.top + dy);
  });
  const finish = () => {
    if (!start) return;
    start = null;
    bar.style.cursor = 'grab';
    if (moved) {
      writeUi({ ...readUi(), x: bar.offsetLeft, y: bar.offsetTop });
    } else {
      // A tap, not a drag: shrink to just the time, or expand again.
      compact = !compact;
      applyCompact();
      writeUi({ ...readUi(), compact });
      if (bar.style.transform === 'none') place(bar.offsetLeft, bar.offsetTop);
    }
  };
  bar.addEventListener('pointerup', finish);
  bar.addEventListener('pointercancel', finish);

  const tick = () => {
    const left = demo.expiresAt - Date.now();
    label.textContent = compact ? `Demo · ${format(left)}` : `Demo session · ${format(left)} left`;
    if (left <= 0) {
      window.clearInterval(timer);
      label.textContent = 'Demo session ended';
      void end();
    }
  };
  const timer = window.setInterval(tick, 1000);
  tick();
}
