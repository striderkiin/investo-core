import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createInvestmentService } from '../../../services/api/investmentService';
import { useBranding } from '../../../hooks/useBranding';
import type { InvestmentPlan } from '../../../types/database';

const investmentService = createInvestmentService();

const FEATURES = [
  { icon: 'bi-graph-up-arrow', title: 'Live Market Data', text: 'Track portfolio performance with real-time charts and up-to-the-minute pricing.' },
  { icon: 'bi-shield-check', title: 'Secure by Design', text: 'Role-based access, full audit logging, and every balance change validated server-side.' },
  { icon: 'bi-people', title: 'Referral Program', text: 'Earn rewards by inviting new investors — track earnings and your referral tree from your dashboard.' },
  { icon: 'bi-piggy-bank', title: 'Flexible Plans', text: 'Choose the plan that matches your goals, from steady starter returns to our top Elite tier.' },
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
      <section className="bg-white border-bottom">
        <div className="container py-5 text-center">
          <span className="badge text-bg-primary-subtle text-primary mb-3">White-Label Investment Platform</span>
          <h1 className="display-5 fw-bold mb-3">Invest with confidence</h1>
          <p className="lead text-secondary mb-4 mx-auto" style={{ maxWidth: 640 }}>
            {branding.siteName} gives you a complete platform to manage deposits, withdrawals, investments, and
            referrals — all in one secure dashboard.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-outline-secondary btn-lg">
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4">
          {FEATURES.map((feature) => (
            <div className="col-12 col-md-6 col-lg-3" key={feature.title}>
              <div className="card ic-card h-100 p-4 text-center">
                <i className={`bi ${feature.icon} fs-1 text-primary mb-3`} aria-hidden="true" />
                <h2 className="h6">{feature.title}</h2>
                <p className="text-secondary small mb-0">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="bg-light border-top border-bottom py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="h3 fw-bold mb-2">Investment Plans</h2>
              <p className="text-secondary mb-0">Pick the plan that fits your investment goals. Rates and limits are set by the platform operator.</p>
            </div>
            <div className="row g-4">
              {plans.map((plan, index) => (
                <div className="col-12 col-md-6 col-lg-3" key={plan.id}>
                  <div className={`card ic-card h-100 p-4 ${index === plans.length - 1 ? 'border-primary border-2' : ''}`}>
                    {index === plans.length - 1 && <span className="badge text-bg-primary align-self-start mb-2">Top Tier</span>}
                    <h3 className="h5 mb-1">{plan.name}</h3>
                    <p className="text-secondary small mb-3">{plan.description}</p>
                    <div className="mb-3">
                      <span className="display-6 fw-bold">{plan.rate}%</span>
                      <span className="text-secondary"> / {RATE_TYPE_LABEL[plan.rateType]}</span>
                    </div>
                    <ul className="list-unstyled small text-secondary mb-4 flex-grow-1">
                      <li className="mb-1">
                        <i className="bi bi-check2 text-success me-1" aria-hidden="true" />
                        {formatCurrency(plan.minAmount)} – {formatCurrency(plan.maxAmount)} investment range
                      </li>
                      <li className="mb-1">
                        <i className="bi bi-check2 text-success me-1" aria-hidden="true" />
                        {plan.durationDays}-day duration
                      </li>
                    </ul>
                    <Link to="/register" className="btn btn-outline-primary mt-auto">
                      Get Started
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-secondary small text-center mt-4 mb-0">
              Rates shown are current as configured by the platform operator and are not guaranteed. See our{' '}
              <Link to="/risk-disclosure">Risk Disclosure</Link> before investing.
            </p>
          </div>
        </section>
      )}

      <section className="container py-5 text-center">
        <h2 className="h3 fw-bold mb-3">Ready to get started?</h2>
        <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: 480 }}>
          Create your free account in minutes and start managing your portfolio on {branding.siteName}.
        </p>
        <Link to="/register" className="btn btn-primary btn-lg">
          Create Free Account
        </Link>
      </section>
    </>
  );
}
