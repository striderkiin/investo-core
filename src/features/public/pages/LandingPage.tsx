import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createInvestmentService } from '../../../services/api/investmentService';
import { useBranding } from '../../../hooks/useBranding';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';
import type { InvestmentPlan } from '../../../types/database';

const investmentService = createInvestmentService();

const FEATURES = [
  { icon: 'bi-graph-up-arrow', title: 'Live Market Data', text: 'Real-time charts and up-to-the-minute pricing.' },
  { icon: 'bi-shield-check', title: 'Secure by Design', text: 'Role-based access, full audit logging, server-side validation.' },
  { icon: 'bi-people', title: 'Referral Program', text: 'Earn rewards for every investor you bring in.' },
  { icon: 'bi-piggy-bank', title: 'Flexible Plans', text: 'From steady starter returns to our top tier.' },
];

const STATS = [
  { value: '4', suffix: '', label: 'Investment plans' },
  { value: '24', suffix: '/7', label: 'Platform availability' },
  { value: '100', suffix: '%', label: 'Server-validated transactions' },
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
        <div className="container py-5 position-relative">
          <div className="row align-items-center gy-5">
            <motion.div
              className="col-12 col-lg-7"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="ic-public-eyebrow mb-3 d-inline-flex">Investment infrastructure</span>
              <h1 className="display-4 mb-3">
                Your capital. <span className="ic-public-accent-text">In full view.</span>
              </h1>
              <p className="lead mb-4" style={{ maxWidth: 520 }}>
                {branding.siteName} gives you a complete platform to manage deposits, withdrawals, investments, and
                referrals, all in one secure dashboard.
              </p>
              <div className="d-flex gap-3 flex-wrap mb-5">
                <Link to="/register" className="btn ic-public-btn-primary btn-lg px-4">
                  Create Free Account
                </Link>
                <Link to="/pricing" className="ic-public-link d-inline-flex align-items-center">
                  View plans <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </Link>
              </div>

              <motion.div className="d-flex flex-wrap" variants={staggerContainer} initial="hidden" animate="show" style={{ gap: '2.5rem' }}>
                {STATS.map((stat, index) => (
                  <motion.div
                    className={index > 0 ? 'ps-4' : ''}
                    style={index > 0 ? { borderLeft: '1px solid var(--pub-border)' } : undefined}
                    key={stat.label}
                    variants={staggerItem}
                  >
                    <div className="h4 mb-0 ic-public-accent-text" style={{ fontFamily: 'var(--pub-font-display)' }}>
                      {stat.value}
                      {stat.suffix}
                    </div>
                    <div className="small" style={{ color: 'var(--pub-text-subtle)' }}>
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            <div className="col-12 col-lg-5 d-none d-lg-block" aria-hidden="true" />
          </div>
        </div>
      </section>

      <PublicSection className="container py-5">
        <div className="row g-4 g-lg-0">
          {FEATURES.map((feature, index) => (
            <div
              className="col-12 col-md-6 col-lg-3 px-lg-4"
              key={feature.title}
              style={index > 0 ? { borderLeft: '1px solid var(--pub-border)' } : undefined}
            >
              <i className={`bi ${feature.icon} fs-4 mb-3 d-block`} style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
              <h2 className="h6">{feature.title}</h2>
              <p className="small mb-0">{feature.text}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection className="border-top border-bottom py-5" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-end mb-5 gap-3">
            <div>
              <span className="ic-public-eyebrow mb-2 d-inline-flex">Pricing</span>
              <h2 className="h3 mb-0">Pick the plan that fits your goals</h2>
            </div>
            <Link to="/pricing" className="ic-public-link d-inline-flex align-items-center">
              View full pricing <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
            </Link>
          </div>

          {plans.length > 0 ? (
            <motion.div className="row g-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
              {plans.map((plan, index) => (
                <motion.div className="col-12 col-md-6 col-lg-3" key={plan.id} variants={staggerItem}>
                  <div className={`ic-public-card h-100 p-4 d-flex flex-column ${index === plans.length - 1 ? 'ic-public-card-highlight' : ''}`}>
                    {index === plans.length - 1 && <span className="ic-public-badge align-self-start mb-2">Top Tier</span>}
                    <h3 className="h5 mb-1">{plan.name}</h3>
                    <p className="small mb-3">{plan.description}</p>
                    <div className="mb-3">
                      <span className="display-6 ic-public-accent-text" style={{ fontFamily: 'var(--pub-font-display)' }}>
                        {plan.rate}%
                      </span>
                      <span className="small"> / {RATE_TYPE_LABEL[plan.rateType]}</span>
                    </div>
                    <ul className="list-unstyled small mb-4 flex-grow-1">
                      <li className="mb-1">
                        <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {formatCurrency(plan.minAmount)} to{' '}
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
          ) : (
            <p className="mb-0" style={{ color: 'var(--pub-text-subtle)' }}>
              Plan details are loading. See the full <Link to="/pricing" className="ic-public-link">Pricing</Link> page for current rates and terms.
            </p>
          )}
        </div>
      </PublicSection>

      <PublicSection className="container py-5 text-center">
        <h2 className="h3 mb-3">Ready to get started?</h2>
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
