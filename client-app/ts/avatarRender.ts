import { resolveAvatar, BRAND_MARK_SVG_PATHS } from '../../src/shared/avatar';
import type { AvatarInput, AvatarResolution } from '../../src/shared/avatar';

const ICON_SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

/**
 * Every avatar slot in the static client-app pages is a plain <img> whose
 * parent already sizes and (mostly) clips it — see .wg-user .image (40px
 * header avatar) and .wg-profile .avatar (129px Account page avatar) in
 * public/client-app/css/styles.css. The fallback tiers below aren't
 * photos, so they're built as a same-size div instead — explicit
 * width/height/border-radius/overflow on the node itself rather than
 * relying on the parent, since .wg-user .image puts the radius on the img
 * tag, not the container.
 */
export function buildAvatarNode(resolution: AvatarResolution, id?: string): HTMLElement {
  const isImage = resolution.tier === 'photo' || resolution.tier === 'illustrated';
  const node = document.createElement(isImage ? 'img' : 'div');
  if (id) node.id = id;
  node.style.width = '100%';
  node.style.height = '100%';
  node.style.borderRadius = '50%';
  node.style.flexShrink = '0';

  if (isImage) {
    const img = node as HTMLImageElement;
    img.src = resolution.tier === 'photo' ? resolution.url : resolution.entry.imageDataUri;
    img.alt = '';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    return node;
  }

  node.style.overflow = 'hidden';
  node.style.display = 'flex';
  node.style.alignItems = 'center';
  node.style.justifyContent = 'center';
  node.style.background = 'var(--ic-primary)';
  node.style.color = '#fff';

  if (resolution.tier === 'initials') {
    const span = document.createElement('span');
    span.textContent = resolution.letter;
    span.style.fontWeight = '600';
    span.style.fontSize = '1.1rem';
    span.style.lineHeight = '1';
    node.appendChild(span);
  } else {
    node.innerHTML = `<svg ${ICON_SVG_ATTRS} width="56%" height="56%">${BRAND_MARK_SVG_PATHS}</svg>`;
  }
  return node;
}

/** Finds the element by id (an <img>, or a previous fallback div from an earlier call) and swaps in the correct tier for the given input, keeping the same id so later calls and other code that looks it up keep working. */
export function renderAvatar(id: string, input: AvatarInput): void {
  const existing = document.getElementById(id);
  if (!existing) return;
  existing.replaceWith(buildAvatarNode(resolveAvatar(input), id));
}
