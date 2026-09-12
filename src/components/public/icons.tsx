import type { SVGProps } from 'react';

/**
 * Hand-drawn line icons for the public marketing pages — plain Bootstrap
 * Icon glyphs (icon fonts) can't be targeted with a per-stroke hover/scroll
 * animation, so the landing page spec calls for real inline SVG here
 * instead. Same visual vocabulary (thin stroke, rounded caps), sized to
 * fill an IconBadge via currentColor.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconTrendUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

export function IconShieldCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconPeople(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M15.5 14.2a5 5 0 0 1 5.5 5.3" />
    </svg>
  );
}

export function IconPiggyBank(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12.5a6 6 0 0 1 6-6h3.5a6 6 0 0 1 4.8 2.4l1.7-.6-.7 2.5A6 6 0 0 1 20 14.5v2a1.3 1.3 0 0 1-1.3 1.3H17v2h-2v-2H9v2H7v-2H5.3A1.3 1.3 0 0 1 4 16.5v-1" />
      <circle cx="15" cy="11" r="0.5" fill="currentColor" stroke="none" />
      <path d="M7.5 9V7" />
    </svg>
  );
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <path d="M12 15v2" />
    </svg>
  );
}

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconLightning(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function IconUserPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M19 8v5" />
      <path d="M16.5 10.5h5" />
    </svg>
  );
}

export function IconWallet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M16 14h3" />
    </svg>
  );
}

export function IconChartBar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M2 20h20" />
    </svg>
  );
}

export function IconArrowsExchange(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h13" />
      <path d="M14 4l3 4-3 4" />
      <path d="M20 16H7" />
      <path d="M10 12l-3 4 3 4" />
    </svg>
  );
}

/* Social platform marks — simplified line-art versions in the same stroke
   vocabulary as the rest of this file, so they sit inside an IconBadge
   like any other icon here rather than looking like a dropped-in brand
   asset. */

export function IconTwitter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M21 5.5c-.7.35-1.5.6-2.3.7a4 4 0 0 0 1.75-2.2 8 8 0 0 1-2.5 1 4 4 0 0 0-6.9 3.6A11.4 11.4 0 0 1 3 4.6a4 4 0 0 0 1.24 5.3 4 4 0 0 1-1.8-.5v.05a4 4 0 0 0 3.2 3.9 4 4 0 0 1-1.8.07 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 17.5a11.3 11.3 0 0 0 6.1 1.8c7.3 0 11.3-6.1 11.3-11.3v-.5c.8-.55 1.4-1.25 1.9-2" />
    </svg>
  );
}

export function IconFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M14 21v-7h2.5l.5-3H14V9c0-.9.3-1.5 1.7-1.5H17V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4v2.1H8v3h2.6v7h3.4z" />
    </svg>
  );
}

export function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLinkedin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5v6" />
      <circle cx="8" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 16.5v-3.5a2 2 0 0 1 4 0v3.5" />
      <path d="M12 10.5v6" />
    </svg>
  );
}

export function IconYoutube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
      <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTiktok(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3v10.5a3 3 0 1 1-2.5-2.96" />
      <path d="M14 3c.4 2.3 2 4 4.5 4.3" />
    </svg>
  );
}
