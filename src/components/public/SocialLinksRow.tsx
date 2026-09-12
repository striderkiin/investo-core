import type { SocialLink } from '../../types/database';
import { IconBadge } from './IconBadge';
import { SOCIAL_PLATFORM_META } from './socialPlatforms';

/** Renders nothing if the operator hasn't enabled any platform yet — no placeholder icons pointing nowhere. */
export function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="d-flex gap-2">
      {links.map((link) => {
        const meta = SOCIAL_PLATFORM_META[link.platform];
        const Icon = meta.icon;
        return (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={meta.label}>
            <IconBadge size={40}>
              <Icon width={18} height={18} />
            </IconBadge>
          </a>
        );
      })}
    </div>
  );
}
