import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps a public-page icon in a soft rounded tint badge instead of a bare
 * glyph in a plain outline circle. Scroll-in (fade + shift up, staggered by
 * index) is framer-motion so it respects prefers-reduced-motion via the
 * app-wide MotionConfig; the hover stroke shift is plain CSS on the SVG
 * itself (see .ic-icon-badge in public-theme.css) rather than animating the
 * wrapper, since `stroke` isn't a wrapper-level CSS property.
 */
export function IconBadge({ children, index = 0, size = 48 }: { children: ReactNode; index?: number; size?: number }) {
  return (
    <motion.span
      className="ic-icon-badge"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.span>
  );
}
