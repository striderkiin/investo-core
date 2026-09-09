import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createInvestmentService } from '../../../services/api/investmentService';
import { useBranding } from '../../../hooks/useBranding';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';
import type { InvestmentPlan } from '../../../types/database';

const investmentService = createInvestmentService();

const FEATURES = [
  { icon: 'bi-graph-up-arrow', title: 'Live Market Data', text: 'Track portfolio performance with real-time charts and up-to-the-minute pricing.' },
  { icon: 'bi-shield-check', title: 'Secure by Design', text: 'Role-based access, full audit logging, and every balance change validated server-side.' },
  { icon: 'bi-people', title: 'Referral Program', text: 'Earn rewards by inviting new investors, and track earnings and your referral tree from your dashboard.' },
  { icon: 'bi-piggy-bank', title: 'Flexible Plans', text: 'Choose the plan that matches your goals, from steady starter returns to our top Elite tier.' },
];

const STATS = [
  { value: '4', suffix: '', label: 'Investment Plans' },
  { value: '24', suffix: '/7', label: 'Platform Availability' },
  { value: '100', suffix: '%', label: 'Server-Validated Transactions' },
];

const RATE_TYPE_LABEL: Record<InvestmentPlan['rateType'], string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function LandingPage() {
  const { branding } = useBranding();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);

  useEffect(() => {
    investmentService
      .listPlans()
      .then((all) => setPlans(all.filter((p) => p.status === 'active')))
      .catch(() => setPlans([]));
  }, []);

  return (
    <>
      <section className="position-relative overflow-hidden">
        <div className="ic-public-starfield" />
        <div className="ic-public-glow" style={{ width: 560, height: 560, top: -220, left: '50%', transform: 'translateX(-50%)', background: 'var(--pub-accent)' }} />
        <div className="container py-5 text-center position-relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <span className="ic-public-badge mb-4">
              <i className="bi bi-stars" aria-hidden="true" />
              Secure Investment Platform
            </span>
            <h1 className="display-4 fw-bold mb-3 mx-auto" style={{ maxWidth: 780 }}>
              Invest with <span className="ic-public-accent-text">confidence</span>, in real time
            </h1>
            <p className="lead mx-auto mb-4" style={{ maxWidth: 620 }}>
              {branding.siteName} gives you a complete platform to manage deposits, withdrawals, investments, and
              referrals, all in one secure dashboard.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/register" className="btn ic-public-btn-primary btn-lg px-4">
                Create Free Account
              </Link>
              <Link to="/pricing" className="btn ic-public-btn-outline btn-lg px-4">
                View Plans
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="row g-4 mt-4 mx-auto"
            style={{ maxWidth: 680 }}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {STATS.map((stat) => (
              <motion.div className="col-4" key={stat.label} variants={staggerItem}>
                <div className="ic-public-card p-3">
                  <div className="h3 fw-bold mb-0 ic-public-accent-text">
                    {stat.value}
                    {stat.suffix}
                  </div>
                  <div className="small">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <PublicSection className="container py-5">
        <motion.div className="row g-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FEATURES.map((feature) => (
            <motion.div className="col-12 col-md-6 col-lg-3" key={feature.title} variants={staggerItem}>
              <div className="ic-public-card h-100 p-4 text-center">
                <i className={`bi ${feature.icon} fs-1 mb-3`} style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                <h2 className="h6">{feature.title}</h2>
                <p className="small mb-0">{feature.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </PublicSection>

      {plans.length > 0 && (
        <PublicSection className="border-top border-bottom py-5" style={{ borderColor: 'var(--pub-border)' }}>
          <div className="container">
            <div className="text-center mb-5">
              <span className="ic-public-badge mb-3">Investment Plans</span>
              <h2 className="h3 fw-bold mb-2 mt-2">Pick the plan that fits your goals</h2>
              <p className="mb-0">Rates and limits are set by the platform operator and can change at any time.</p>
            </div>
            <motion.div className="row g-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
              {plans.map((plan, index) => (
                <motion.div className="col-12 col-md-6 col-lg-3" key={plan.id} variants={staggerItem}>
                  <div className={`ic-public-card h-100 p-4 d-flex flex-column ${index === plans.length - 1 ? 'ic-public-card-highlight' : ''}`}>
                    {index === plans.length - 1 && <span className="ic-public-badge align-self-start mb-2">Top Tier</span>}
                    <h3 className="h5 mb-1">{plan.name}</h3>
                    <p className="small mb-3">{plan.description}</p>
                    <div className="mb-3">
                      <span className="display-6 fw-bold ic-public-accent-text">{plan.rate}%</span>
                      <span className="small"> / {RATE_TYPE_LABEL[plan.rateType]}</span>
                    </div>
                    <ul className="list-unstyled small mb-4 flex-grow-1">
                      <li className="mb-1">
                        <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {formatCurrency(plan.minAmount)} –{' '}
                        {formatCurrency(plan.maxAmount)}
                      </li>
                      <li className="mb-1">
                        <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {plan.durationDays}-day duration
                      </li>
                    </ul>
                    <Link to="/register" className="btn ic-public-btn-outline mt-auto">
                      Get Started
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            <p className="small text-center mt-4 mb-0">
              Rates shown are current and not guaranteed. See our <Link to="/risk-disclosure">Risk Disclosure</Link> before investing, or view the
              full <Link to="/pricing">Pricing</Link> page.
            </p>
          </div>
        </PublicSection>
      )}

      <PublicSection className="container py-5 text-center">
        <h2 className="h3 fw-bold mb-3">Ready to get started?</h2>
        <p className="mb-4 mx-auto" style={{ maxWidth: 480 }}>
          Create your free account in minutes and start managing your portfolio on {branding.siteName}.
        </p>
        <Link to="/register" className="btn ic-public-btn-primary btn-lg px-4">
          Create Free Account
        </Link>
      </PublicSection>
    </>
  );
}
