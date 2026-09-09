import { motion } from 'framer-motion';
import { useBranding } from '../../../hooks/useBranding';
import { PublicPageHero } from '../../../components/public/PublicPageHero';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';

const VALUES = [
  { icon: 'bi-shield-check', title: 'Security First', text: 'Every balance-affecting action runs through server-side, audited logic — never trusted from the browser.' },
  { icon: 'bi-eye', title: 'Transparency', text: 'Clear, real-time status on every deposit, withdrawal, and investment — no black boxes.' },
  { icon: 'bi-lightning-charge', title: 'Built for Scale', text: 'A modular architecture designed to grow from a handful of investors to a full platform.' },
];

export function MissionVisionPage() {
  const { branding } = useBranding();

  return (
    <>
      <PublicPageHero eyebrow="About" title="Our mission &amp; vision" subtitle={`Why ${branding.siteName} exists, and where we're headed.`} />

      <PublicSection className="container py-5" style={{ maxWidth: 780 }}>
        <div className="ic-public-card p-4 p-md-5 mb-5">
          <h2 className="h4 fw-bold mb-3">
            <i className="bi bi-flag me-2" style={{ color: 'var(--pub-glow)' }} aria-hidden="true" />
            Our Mission
          </h2>
          <p className="mb-0">
            To give investors a secure, transparent platform for managing their portfolio — with real-time visibility
            into every deposit, investment, and withdrawal, and a support team that treats your questions seriously.
          </p>
        </div>
        <div className="ic-public-card p-4 p-md-5">
          <h2 className="h4 fw-bold mb-3">
            <i className="bi bi-binoculars me-2" style={{ color: 'var(--pub-glow)' }} aria-hidden="true" />
            Our Vision
          </h2>
          <p className="mb-0">
            A platform where every account holder — from a first-time investor to a long-term client — has full
            confidence in how their funds are handled, backed by clear audit trails and modern security practices.
          </p>
        </div>
      </PublicSection>

      <PublicSection className="container pb-5">
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold mb-2">What we stand for</h2>
        </div>
        <motion.div className="row g-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {VALUES.map((value) => (
            <motion.div className="col-12 col-md-4" key={value.title} variants={staggerItem}>
              <div className="ic-public-card h-100 p-4 text-center">
                <i className={`bi ${value.icon} fs-1 mb-3`} style={{ color: 'var(--pub-glow)' }} aria-hidden="true" />
                <h3 className="h6">{value.title}</h3>
                <p className="small mb-0">{value.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </PublicSection>
    </>
  );
}
