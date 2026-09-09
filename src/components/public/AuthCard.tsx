import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Shared dark card shell for the auth pages (login/register/forgot/reset). */
export function AuthCard({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="container py-5 position-relative" style={{ maxWidth: 440 }}>
      <div className="ic-public-glow" style={{ width: 360, height: 360, top: -40, left: '50%', transform: 'translateX(-50%)', background: 'var(--pub-accent)' }} />
      <motion.div
        className="ic-public-card p-4 position-relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {title && <h1 className="h4 mb-1">{title}</h1>}
        {subtitle && <p className="mb-4">{subtitle}</p>}
        {children}
      </motion.div>
    </div>
  );
}
