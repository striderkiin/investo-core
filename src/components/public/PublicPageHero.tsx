import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Compact animated header used at the top of inner public pages (Pricing, FAQ, legal pages, etc). */
export function PublicPageHero({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="position-relative overflow-hidden border-bottom" style={{ borderColor: 'var(--pub-border)' }}>
      <div className="ic-public-glow" style={{ width: 480, height: 480, top: -220, left: '50%', transform: 'translateX(-50%)', background: 'var(--pub-accent)' }} />
      <div className="container py-5 text-center position-relative">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {eyebrow && <span className="ic-public-badge mb-3">{eyebrow}</span>}
          <h1 className="display-6 fw-bold mb-3 mt-2">{title}</h1>
          {subtitle && (
            <p className="mx-auto mb-0" style={{ maxWidth: 640 }}>
              {subtitle}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
