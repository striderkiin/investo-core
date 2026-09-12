import type { ComponentType, SVGProps } from 'react';
import type { SocialLinkPlatform } from '../../types/database';
import { IconTwitter, IconFacebook, IconInstagram, IconLinkedin, IconYoutube, IconTiktok } from './icons';

export const SOCIAL_PLATFORM_META: Record<SocialLinkPlatform, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  twitter: { label: 'X (Twitter)', icon: IconTwitter },
  facebook: { label: 'Facebook', icon: IconFacebook },
  instagram: { label: 'Instagram', icon: IconInstagram },
  linkedin: { label: 'LinkedIn', icon: IconLinkedin },
  youtube: { label: 'YouTube', icon: IconYoutube },
  tiktok: { label: 'TikTok', icon: IconTiktok },
};
