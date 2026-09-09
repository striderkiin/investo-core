import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

/** Scroll-reveal wrapper used across the public marketing pages. Fires once, respects prefers-reduced-motion via framer's built-in handling. */
export function PublicSection({
  children,
  className = '',
  style,
  delay = 0,
  as = 'section',
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  as?: 'section' | 'div';
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  );
}

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};
