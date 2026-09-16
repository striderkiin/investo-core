/**
 * Shared helpers for the two things every client-app page's main() does
 * ad hoc (or not at all, per the earlier audit): show something while an
 * async section loads, and show a real error with a retry instead of
 * leaving the section blank when the fetch throws.
 */

/** Call at the top of a container that starts empty until its data resolves. */
export function showLoading(container: HTMLElement | null, label = 'Loading…'): void {
  if (!container) return;
  container.innerHTML = `<p class="f14-regular text-Gray text-center py-3">${label}</p>`;
}

/** Call in the catch of a section's data fetch — replaces the container with a message and a retry button that re-runs the same load. */
export function showLoadError(container: HTMLElement | null, err: unknown, onRetry: () => void): void {
  if (!container) return;
  const message = err instanceof Error ? err.message : 'Something went wrong loading this.';
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'f14-regular text-Gray text-center py-3';
  const text = document.createElement('p');
  text.className = 'mb-2';
  text.textContent = message;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tf-button f12-bold bg-Gainsboro';
  button.textContent = 'Retry';
  button.addEventListener('click', onRetry, { once: true });

  wrap.appendChild(text);
  wrap.appendChild(button);
  container.appendChild(wrap);
}

/** Wraps an async section loader so a thrown error renders showLoadError instead of leaving the page stuck. Retrying just re-invokes the same loader. */
export function loadSection(container: HTMLElement | null, loader: () => Promise<void>): Promise<void> {
  return loader().catch((err: unknown) => {
    showLoadError(container, err, () => void loadSection(container, loader));
  });
}
