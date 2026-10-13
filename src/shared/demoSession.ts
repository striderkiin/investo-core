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
  (import.meta.env.VITE_DEMO_RETURN_URL as string | undefined) || 'https://probable-fishstick-rouge.vercel.app/p/investo';

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
  bar.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)', 'z-index:2147483000',
    'display:flex', 'align-items:center', 'gap:12px', 'flex-wrap:wrap', 'justify-content:center',
    'max-width:calc(100vw - 32px)', 'padding:10px 16px', 'border-radius:999px',
    'background:#141416', 'color:#f5f5f5', 'border:1px solid #2a2830',
    'box-shadow:0 12px 32px rgba(0,0,0,.35)', 'font:600 14px/1.3 system-ui,sans-serif',
  ].join(';');

  const label = document.createElement('span');
  const link = document.createElement('a');
  link.href = DEMO_RETURN_URL;
  link.textContent = 'Get this platform';
  link.style.cssText = 'color:#0b0b0b;background:#b483e2;padding:6px 12px;border-radius:999px;text-decoration:none;font-weight:800';
  bar.append(label, link);
  document.body.appendChild(bar);

  const tick = () => {
    const left = demo.expiresAt - Date.now();
    label.textContent = `Demo session · ${format(left)} left`;
    if (left <= 0) {
      window.clearInterval(timer);
      label.textContent = 'Demo session ended';
      void end();
    }
  };
  const timer = window.setInterval(tick, 1000);
  tick();
}
