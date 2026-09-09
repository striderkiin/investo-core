import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createInvestmentService } from '../../../services/api/investmentService';
import { PublicPageHero } from '../../../components/public/PublicPageHero';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import type { InvestmentPlan } from '../../../types/database';

const investmentService = createInvestmentService();

const RATE_TYPE_LABEL: Record<InvestmentPlan['rateType'], string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PricingPage() {
  const [plans, setPlans] = useState<InvestmentPlan[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timed out loading plans')), 10000);
    });

    Promise.race([investmentService.listPlans(), timeout])
      .then((all) => {
        if (!cancelled) setPlans(all.filter((p) => p.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PublicPageHero
        eyebrow="Pricing"
        title="Simple, transparent investment plans"
        subtitle="Every rate, minimum, and duration below is live from the platform, set and updated by the operator at any time from the admin panel."
      />

      <div className="container py-5">
        {loadError ? (
          <p className="text-center">
            We couldn&apos;t load pricing right now. Please refresh the page, or{' '}
            <Link to="/contact" style={{ color: 'var(--pub-accent)' }}>
              contact us
            </Link>{' '}
            if this keeps happening.
          </p>
        ) : plans === null ? (
          <LoadingScreen label="Loading plans..." />
        ) : plans.length === 0 ? (
          <p className="text-center">No plans are currently available. Check back soon.</p>
        ) : (
          <motion.div className="row g-4 justify-content-center" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
            {plans.map((plan, index) => (
              <motion.div className="col-12 col-md-6 col-lg-3" key={plan.id} variants={staggerItem}>
                <div className={`ic-public-card h-100 p-4 d-flex flex-column ${index === plans.length - 1 ? 'ic-public-card-highlight' : ''}`}>
                  {index === plans.length - 1 && <span className="ic-public-badge align-self-start mb-2">Top Tier</span>}
                  <h2 className="h5 mb-1">{plan.name}</h2>
                  <p className="small mb-3">{plan.description}</p>
                  <div className="mb-4">
                    <span className="display-6 fw-bold ic-public-accent-text">{plan.rate}%</span>
                    <span className="small"> / {RATE_TYPE_LABEL[plan.rateType]}</span>
                  </div>
                  <ul className="list-unstyled small mb-4 flex-grow-1 d-flex flex-column gap-2">
                    <li>
                      <i className="bi bi-check2-circle me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                      Minimum {formatCurrency(plan.minAmount)}
                    </li>
                    <li>
                      <i className="bi bi-check2-circle me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                      Maximum {formatCurrency(plan.maxAmount)}
                    </li>
                    <li>
                      <i className="bi bi-check2-circle me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                      {plan.durationDays}-day duration
                    </li>
                    <li>
                      <i className="bi bi-check2-circle me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                      {RATE_TYPE_LABEL[plan.rateType]} returns
                    </li>
                  </ul>
                  <Link to="/register" className="btn ic-public-btn-primary mt-auto">
                    Get Started
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <PublicSection className="container pb-5 text-center">
        <div className="ic-public-card p-5 mx-auto" style={{ maxWidth: 720 }}>
          <h2 className="h4 fw-bold mb-2">Have questions about our plans?</h2>
          <p className="mb-4">Check our FAQ, or review the Risk Disclosure before investing.</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/faq" className="btn ic-public-btn-outline">
              View FAQ
            </Link>
            <Link to="/risk-disclosure" className="btn ic-public-btn-outline">
              Risk Disclosure
            </Link>
          </div>
        </div>
      </PublicSection>
    </>
  );
}
