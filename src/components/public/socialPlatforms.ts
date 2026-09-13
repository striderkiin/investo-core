import type { ComponentType, SVGProps } from 'react';
import type { SocialLink, SocialLinkPlatform } from '../../types/database';
import { IconTwitter, IconFacebook, IconInstagram, IconLinkedin, IconYoutube, IconTiktok } from './icons';

export const SOCIAL_PLATFORM_META: Record<SocialLinkPlatform, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  twitter: { label: 'X (Twitter)', icon: IconTwitter },
  facebook: { label: 'Facebook', icon: IconFacebook },
  instagram: { label: 'Instagram', icon: IconInstagram },
  linkedin: { label: 'LinkedIn', icon: IconLinkedin },
  youtube: { label: 'YouTube', icon: IconYoutube },
  tiktok: { label: 'TikTok', icon: IconTiktok },
};

/**
 * Shown on the public site until an admin configures real links (Admin →
 * Social Proof). Each points at the platform's own homepage rather than a
 * dead "#" so the icons are never broken, just generic — admins replace
 * these with the account's real URLs from the admin panel.
 */
export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: 'default-twitter', platform: 'twitter', url: 'https://twitter.com', enabled: true, sortOrder: 0, updatedAt: '' },
  { id: 'default-facebook', platform: 'facebook', url: 'https://facebook.com', enabled: true, sortOrder: 1, updatedAt: '' },
  { id: 'default-instagram', platform: 'instagram', url: 'https://instagram.com', enabled: true, sortOrder: 2, updatedAt: '' },
  { id: 'default-linkedin', platform: 'linkedin', url: 'https://linkedin.com', enabled: true, sortOrder: 3, updatedAt: '' },
];
