import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Fade + shift up as a block scrolls into view, matching IconBadge's motion
 * language (same easing/viewport margin) so the page reads as one system.
 * `once: true` in the viewport config means it never re-triggers, and
 * framer-motion's app-wide MotionConfig (reducedMotion="user") turns this
 * into a plain opacity snap for anyone with reduced-motion enabled.
 */
export function ScrollReveal({
  children,
  index = 0,
  className,
  y = 16,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
