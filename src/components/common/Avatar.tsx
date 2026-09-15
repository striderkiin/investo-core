import { resolveAvatar, BRAND_MARK_SVG_PATHS } from '../../shared/avatar';
import type { AvatarInput } from '../../shared/avatar';

const ICON_SVG_ATTRS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export interface AvatarProps extends AvatarInput {
  size?: number;
  className?: string;
}

/** React counterpart of client-app/ts/avatarRender.ts — same fallback chain (resolveAvatar), same visual result: a photo (real or picked-illustration), an initial, or the brand mark. */
export function Avatar({ photoUrl, avatarKey, displayName, size = 32, className }: AvatarProps) {
  const resolution = resolveAvatar({ photoUrl, avatarKey, displayName });
  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 };

  if (resolution.tier === 'photo' || resolution.tier === 'illustrated') {
    const src = resolution.tier === 'photo' ? resolution.url : resolution.entry.imageDataUri;
    return <img src={src} alt="" className={className} style={{ ...style, objectFit: 'cover', display: 'block' }} />;
  }

  const fallbackStyle = { ...style, background: 'var(--ic-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const };

  if (resolution.tier === 'initials') {
    return (
      <span className={className} style={fallbackStyle} aria-hidden="true">
        <span style={{ fontWeight: 600, fontSize: size * 0.42, lineHeight: 1 }}>{resolution.letter}</span>
      </span>
    );
  }

  return (
    <span className={className} style={fallbackStyle} aria-hidden="true">
      <svg {...ICON_SVG_ATTRS} width="56%" height="56%" dangerouslySetInnerHTML={{ __html: BRAND_MARK_SVG_PATHS }} />
    </span>
  );
}
