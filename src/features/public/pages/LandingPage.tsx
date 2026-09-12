import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { createContactService } from '../../../services/api/contactService';
import { createInvestmentService } from '../../../services/api/investmentService';
import { createSocialLinksService } from '../../../services/api/socialLinksService';
import type { InvestmentPlan, SocialLink } from '../../../types/database';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { HeroVisual } from '../../../components/public/HeroVisual';
import { SocialLinksRow } from '../../../components/public/SocialLinksRow';
import { IconBadge } from '../../../components/public/IconBadge';
import { IconMail } from '../../../components/public/icons';
import { SecureVestAccordion } from '../../../components/public/securevest/SecureVestAccordion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const contactService = createContactService();
const investmentService = createInvestmentService();
const socialLinksService = createSocialLinksService();
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// --- Section 3.2 Feature area content (index-two.php "CORE BANKING FEATURES" block + features.php cards) ---
const DIFFERENTIATOR_BULLETS = [
  'Live Market Data: real-time charts and up-to-the-minute pricing across every plan.',
  'Secure by Design: role-based access, full audit logging, and server-side validation on every action.',
  'Referral Program: earn rewards for every investor you bring onto the platform.',
];

const FEATURE_CARDS = [
  { title: 'Real-Time Tracking', desc: 'Watch your balances, returns, and transaction history update live from your dashboard.' },
  { title: 'Bank-Grade Security', desc: 'Two-factor authentication, session controls, and server-validated transactions on every account.' },
  { title: 'Transparent Reporting', desc: 'A full, auditable ledger of every deposit, investment, and withdrawal — never a black box.' },
  { title: 'Referral Rewards', desc: 'Every account gets a referral code and link, with earnings tracked automatically.' },
];

// --- Section 3.3 Institutional stats (index-two.php + stats-counter.php) ---
const PLATFORM_STATS = [
  { value: '4', label: 'Investment Plans', desc: 'From steady starter returns to our top tier, each with a fixed rate and duration.' },
  { value: '24/7', label: 'Platform Availability', desc: 'Manage deposits, withdrawals, and investments from your dashboard any time.' },
  { value: '100%', label: 'Server-Validated Transactions', desc: 'Every balance-affecting action runs through audited, server-side logic — never the browser.' },
];

// --- Section 3.6 FAQ (security.php "Engineered for Excellence" + accordion.php) ---
const FAQ_ITEMS = [
  { question: 'How do I get started?', answer: 'Create a free account, verify your email, then make a deposit from your dashboard to activate an investment plan that fits your goals.' },
  { question: 'How are investment plan rates determined?', answer: 'Rates, minimums, maximums, and durations for each plan are shown above and can change for future investments at any time.' },
  { question: 'How long do deposits take to confirm?', answer: 'Deposits are confirmed automatically once our backend verifies the payment. We never mark a deposit as complete based on the browser alone, so confirmation timing depends on the payment method used.' },
  { question: 'How do withdrawals work?', answer: 'Request a withdrawal from your dashboard with your amount and destination. It moves through review and processing, and you receive real-time status updates until it completes.' },
  { question: 'Is there a referral program?', answer: 'Yes, every account gets a referral code and link. Track your direct referrals, earnings, and bonuses from your dashboard.' },
  { question: 'How is my account secured?', answer: 'Every account supports two-factor authentication, and you can view and terminate active sessions at any time from Settings, Security. All financial actions are validated server-side.' },
];

function ContactSection() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) return;

    setStatus('submitting');
    setError(null);
    try {
      await contactService.submit({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setStatus('sent');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong sending your message. Please try again.');
    }
  }

  return (
    <>
      {status === 'sent' ? (
        <div className="alert alert-success d-flex align-items-center gap-2" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <span>Thanks, your message has been sent. We&apos;ll reply to {email} as soon as we can.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {status === 'error' && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label htmlFor="contactName" className="form-label small">
                Name
              </label>
              <input id="contactName" type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required disabled={status === 'submitting'} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="contactEmail" className="form-label small">
                Email
              </label>
              <input id="contactEmail" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={status === 'submitting'} />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="contactSubject" className="form-label small">
              Subject
            </label>
            <input id="contactSubject" type="text" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} required disabled={status === 'submitting'} />
          </div>
          <div className="mb-4">
            <label htmlFor="contactMessage" className="form-label small">
              Message
            </label>
            <textarea id="contactMessage" className="form-control" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required disabled={status === 'submitting'} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
            {status === 'submitting' ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Sending...
              </>
            ) : (
              'Send Message'
            )}
          </button>
        </form>
      )}
    </>
  );
}

function GrowthCalculator({ plans }: { plans: InvestmentPlan[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const [amount, setAmount] = useState(plan?.minAmount ?? 0);

  useEffect(() => {
    if (plan) setAmount(plan.minAmount);
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clampedAmount = plan ? Math.min(Math.max(amount, plan.minAmount), plan.maxAmount) : amount;
  const projectedTotal = plan ? clampedAmount + clampedAmount * (plan.rate / 100) * plan.durationDays : 0;

  const chartData = useMemo(() => {
    if (!plan) return null;
    const points = 10;
    const labels = Array.from({ length: points + 1 }, (_, i) => Math.round((plan.durationDays / points) * i));
    const values = labels.map((day) => clampedAmount + clampedAmount * (plan.rate / 100) * day);
    return {
      labels: labels.map((d) => `Day ${d}`),
      datasets: [
        {
          data: values,
          borderColor: '#c6a15b',
          backgroundColor: 'rgba(198, 161, 91, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [plan, clampedAmount]);

  if (!plan) {
    return <p className="tw:text-white tw:text-center tw:mb-0">Plans are being updated. Check back shortly.</p>;
  }

  return (
    <div
      className="tw:pt-10 tw:pb-4 tw:px-4 sm:tw:p-10 xl:tw:p-18 tw:bg-secondary tw:rounded-2xl md:tw:rounded-3xl tw:relative"
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 md:tw:gap-10 tw:mb-10 tw:flex-col md:tw:flex-row">
        <div className="md:tw:max-w-170 tw:w-full">
          <div className="tw:flex tw:items-center tw:gap-2.5">
            <span className="tw:text-base lg:tw:text-lg tw:font-semibold tw:text-primary tw:uppercase">GROWTH CALCULATOR</span>
          </div>
          <h2 className="tw:text-3xl md:tw:text-4xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Visualize Your Path to Financial Freedom</h2>
        </div>
        <p className="md:tw:max-w-115 tw:w-full tw:text-base sm:tw:text-lg tw:text-paragraph_white">
          Pick a plan and an amount to see your projected return at the plan&apos;s fixed rate and duration.
        </p>
      </div>
      <div className="tw:flex tw:items-start tw:gap-6 tw:flex-col lg:tw:flex-row">
        <div className="lg:tw:max-w-87 tw:w-full">
          <form className="tw:grid sm:tw:grid-cols-2 lg:tw:flex lg:tw:flex-col tw:gap-6 tw:w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="select-box-dark">
              <label htmlFor="calc-plan" className="tw:text-base tw:font-normal tw:text-title_white tw:mb-2 tw:block">
                Investment Plan
              </label>
              <select id="calc-plan" className="select-active" value={plan.id} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.rate}%/{p.rateType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="calc-amount" className="tw:text-base tw:font-normal tw:text-title_white tw:mb-2 tw:block">
                Investment Amount
              </label>
              <div className="tw:relative">
                <input
                  id="calc-amount"
                  className="tw:h-10 tw:w-full tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-[100px] tw:text-base tw:font-semibold tw:text-title_white tw:pl-9 tw:pr-5 tw:outline-none focus:tw:border-primary"
                  type="number"
                  min={plan.minAmount}
                  max={plan.maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <span className="tw:text-base tw:font-semibold tw:text-title_white tw:absolute tw:top-1/2 -tw:translate-y-1/2 tw:left-5">$</span>
              </div>
              <div className="tw:text-paragraph_white tw:text-sm tw:mt-2">
                Deposit range: {money.format(plan.minAmount)} – {money.format(plan.maxAmount)}
              </div>
            </div>
            <div className="tw:flex tw:items-end">
              <Link to="/register" className="button-primary tw:w-full tw:flex-1 tw:text-center">
                Create free account
              </Link>
            </div>
          </form>
        </div>
        <div className="md:tw:max-w-227 tw:w-full tw:grid tw:gap-6">
          <div className="tw:p-5 sm:tw:p-6 tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-2xl tw:text-center">
            <h3 className="tw:text-title_white tw:font-bold tw:text-2xl md:tw:text-3xl lg:tw:text-4xl tw:leading-none">{money.format(Math.round(projectedTotal))}</h3>
            <p className="tw:text-base sm:tw:text-lg tw:mt-3 tw:text-title_white tw:font-medium">Total projected return after {plan.durationDays} days</p>
          </div>
          <div className="tw:w-full tw:p-3 sm:tw:p-6 tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-2xl" style={{ height: 220 }}>
            {chartData && (
              <Line
                data={chartData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { display: false }, y: { display: false } },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { branding } = useBranding();
  const location = useLocation();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash]);

  useEffect(() => {
    investmentService
      .listPlans()
      .then(setPlans)
      .catch((err) => console.error('Failed to load investment plans', err))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    socialLinksService
      .listEnabled()
      .then(setSocialLinks)
      .catch((err) => console.error('Failed to load social links', err));
  }, []);

  return (
    <div className="sv-page">
      {/* 3.1 Hero — verbatim from index-two.php lines 14-60, recolored + recontented */}
      <section className="tw:py-14 md:tw:py-20 lg:tw:py-24 xl:tw:py-27 tw:bg-[#0a0a0a] tw:relative">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-center tw:justify-between tw:gap-10 tw:flex-col md:tw:flex-row">
            <div className="md:tw:max-w-137.5 tw:w-full">
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <p className="tw:text-base sm:tw:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase">INVESTMENT INFRASTRUCTURE</p>
              </div>
              <h1 className="tw:text-4xl sm:tw:text-[40px] md:tw:text-5xl lg:tw:text-[52px] xl:tw:text-[64px] tw:font-bold tw:leading-[1.1]! tw:text-title_black tw:mt-4 md:tw:mt-5">
                Your capital. In full view.
              </h1>
              <p className="tw:text-base tw:text-paragraph_black tw:mt-4">
                {branding.siteName} gives you a complete platform to manage deposits, withdrawals, investments, and referrals, all in one secure dashboard with real-time visibility into every action.
              </p>
              <div className="tw:mt-6 sm:tw:mt-8 lg:tw:mt-12 tw:flex tw:items-center tw:gap-3">
                <Link to="/register" className="button-primary">
                  Create free account
                </Link>
                <Link
                  to="/#pricing"
                  className="tw:w-10 md:tw:w-12 tw:h-10 md:tw:h-12 tw:rounded-full tw:bg-title_white tw:flex tw:items-center tw:justify-center tw:text-title_black"
                  aria-label="View plans"
                >
                  <svg className="tw:fill-current tw:w-[13px] tw:h-[15px]" viewBox="0 0 13 15" aria-hidden="true">
                    <path d="M0 0l13 7.5L0 15V0z" fill="currentColor" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="tw:max-w-120 lg:tw:max-w-157.25 xl:tw:max-w-145 2xl:tw:max-w-157.25 tw:w-full xl:-tw:mr-10.5 tw:pb-12 tw:px-3 tw:pt-3 tw:relative">
              <div className="tw:max-w-157.25 tw:w-full tw:ml-auto">
                <HeroVisual />
              </div>
              <div className="tw:absolute tw:top-0 tw:right-[10%] -tw:z-1 tw:w-[70%] tw:bg-primary tw:aspect-square tw:rounded-full" />
              <div className="tw:absolute tw:bottom-0 tw:right-0 lg:tw:right-auto lg:tw:left-[50%] tw:p-4 lg:tw:p-6 tw:bg-secondary tw:rounded-xl lg:tw:rounded-2xl">
                <div className="tw:flex">
                  <h2 className="tw:text-3xl md:tw:text-4xl lg:tw:text-[40px] xl:tw:text-5xl tw:text-title_white tw:font-bold tw:leading-none!">4</h2>
                </div>
                <div className="tw:mt-2 lg:tw:mt-4 tw:flex tw:flex-col tw:gap-1.75">
                  <p className="tw:text-sm tw:text-title_white tw:font-semibold">Investment Plans</p>
                  <svg width="136" height="5" viewBox="0 0 136 5" fill="none" aria-hidden="true">
                    <path d="M0.75 3.75601C18.75 1.256 77.75 -0.743972 135.25 2.25601" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="tw:text-title_white" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.2 Feature area — verbatim from index-two.php lines 63-109 + features.php */}
      <section className="section-spacing-lg-md tw:bg-[#0a0a0a]">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:pt-10 tw:pb-4 tw:px-4 sm:tw:p-10 xl:tw:p-18 2xl:tw:p-25 tw:bg-secondary tw:rounded-2xl md:tw:rounded-3xl tw:relative tw:overflow-hidden">
            <div className="tw:flex xl:tw:items-start tw:justify-between tw:gap-10 tw:flex-col lg:tw:flex-row tw:relative">
              <div className="tw:max-w-175 lg:tw:max-w-135 tw:w-full lg:tw:self-start">
                <span className="tw:text-base sm:tw:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:capitalize">WHY INVESTO</span>
                <h2 className="tw:text-3xl md:tw:text-4xl lg:tw:text-[40px] xl:tw:text-5xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Built for the Next Generation of Investors</h2>
                <p className="tw:mt-4 tw:text-base sm:tw:text-lg tw:text-paragraph_white">
                  We give modern investors the tools, security, and clarity needed to manage capital with confidence.
                </p>
                <ul className="tw:flex tw:flex-col tw:gap-4 tw:mt-9 tw:text-paragraph_white">
                  {DIFFERENTIATOR_BULLETS.map((text) => (
                    <li className="tw:text-base tw:flex tw:items-start tw:gap-3" key={text}>
                      <i className="bi bi-check2-circle tw:mt-1 tw:text-primary" aria-hidden="true" />
                      <span className="tw:flex-1">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:tw:max-w-165 tw:w-full tw:grid sm:tw:grid-cols-2 lg:tw:grid-cols-1 xl:tw:grid-cols-2 tw:gap-4 sm:tw:gap-6">
                {FEATURE_CARDS.map((f) => (
                  <div className="tw:p-5 sm:tw:p-6 lg:tw:p-8 tw:rounded-2xl tw:bg-black/5 tw:border tw:border-black/10" key={f.title}>
                    <h3 className="tw:mt-2 tw:text-lg md:tw:text-xl tw:font-semibold tw:text-title_white">{f.title}</h3>
                    <p className="tw:mt-3 tw:text-base tw:text-paragraph_white">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.3 Institutional stats — verbatim from index-two.php lines 111-134 + stats-counter.php */}
      <section id="about" className="section-spacing-md-lg tw:bg-[#0a0a0a]">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 md:tw:gap-10 tw:mb-12 sm:tw:mb-14 md:tw:mb-16 lg:tw:mb-20 tw:flex-col md:tw:flex-row">
            <div className="md:tw:max-w-170 tw:w-full">
              <span className="tw:text-base lg:tw:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase tw:block">PLATFORM RELIABILITY</span>
              <h2 className="tw:text-3xl md:tw:text-4xl lg:tw:text-[40px] xl:tw:text-5xl tw:font-bold tw:leading-tight tw:text-title_black tw:mt-4">Built for Trust, Measured in Numbers</h2>
            </div>
            <p className="md:tw:max-w-115 tw:w-full tw:text-base sm:tw:text-lg tw:text-paragraph_black">
              We measure our own success by the reliability and transparency of the platform you depend on.
            </p>
          </div>
          <div className="tw:grid sm:tw:grid-cols-2 lg:tw:grid-cols-3 tw:gap-5 lg:tw:gap-8">
            {PLATFORM_STATS.map((stat, i) => (
              <div key={stat.label} className={`tw:bg-secondary tw:p-5 sm:tw:p-8 tw:rounded-2xl tw:flex tw:flex-col tw:justify-between tw:gap-5${i === 0 ? ' sm:tw:col-span-2 lg:tw:col-span-1' : ''}`}>
                <h2 className="tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl sm:tw:text-[40px] md:tw:text-5xl">{stat.value}</h2>
                <div>
                  <h3 className="tw:text-title_white tw:text-xl md:tw:text-2xl tw:font-semibold">{stat.label}</h3>
                  <p className="tw:pt-3 sm:tw:pt-4 tw:text-paragraph_white tw:text-base tw:leading-normal">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3.4 Pricing — verbatim from services.php lines 55-106 (toggle excluded) + pricing-cards.php, extended to 4 cards */}
      <section id="pricing" className="section-spacing-md-lg tw:bg-[#0a0a0a]">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 md:tw:gap-10 tw:mb-12 sm:tw:mb-14 md:tw:mb-16 lg:tw:mb-20 tw:flex-col md:tw:flex-row">
            <div className="md:tw:max-w-170 tw:w-full">
              <span className="tw:text-base lg:tw:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase tw:block">PRICING PLAN</span>
              <h2 className="tw:text-3xl md:tw:text-4xl lg:tw:text-[40px] xl:tw:text-5xl tw:font-bold tw:leading-tight tw:text-title_black tw:mt-4">Choose the Plan that Best Fits Your Goals</h2>
            </div>
            <p className="md:tw:max-w-115 tw:w-full tw:text-base sm:tw:text-lg tw:text-paragraph_black">
              Every plan has a fixed daily rate, deposit range, and duration — no hidden fees, no surprises.
            </p>
          </div>

          {plansLoading ? (
            <p className="tw:text-center tw:text-paragraph_black">Loading plans…</p>
          ) : plans.length === 0 ? (
            <p className="tw:text-center tw:text-paragraph_black">Plans are being updated. Check back shortly.</p>
          ) : (
            <div className="pricing-table tw:grid tw:grid-cols-1 sm:tw:grid-cols-2 lg:tw:grid-cols-4 tw:gap-6">
              {plans.slice(0, 4).map((plan, index) => {
                const highlighted = index === 1;
                const bullets = [
                  `${plan.rate}% ${plan.rateType} return`,
                  `${money.format(plan.minAmount)} – ${money.format(plan.maxAmount)} deposit range`,
                  `${plan.durationDays}-day fixed duration`,
                  'Real-time dashboard tracking',
                  '24/7 withdrawal requests',
                ];
                return (
                  <div
                    key={plan.id}
                    className={
                      highlighted
                        ? 'tw:bg-secondary tw:border tw:border-secondary tw:rounded-2xl tw:p-6 xl:tw:p-8 tw:flex tw:flex-col tw:justify-between tw:gap-10'
                        : 'tw:bg-background tw:border tw:border-border tw:rounded-2xl tw:p-6 xl:tw:p-8 tw:flex tw:flex-col tw:justify-between tw:gap-10'
                    }
                  >
                    <div>
                      <p className={highlighted ? 'tw:text-paragraph_white tw:text-lg tw:font-semibold' : 'tw:text-paragraph_black tw:text-lg tw:font-semibold'}>{plan.name}</p>
                      <div className="tw:mt-5 tw:mb-4 tw:flex tw:flex-wrap tw:items-end tw:gap-1">
                        <h3 className={highlighted ? 'tw:text-5xl xl:tw:text-[64px] tw:leading-none tw:text-title_white' : 'tw:text-5xl xl:tw:text-[64px] tw:leading-none tw:text-title_black'}>
                          {plan.rate}%
                        </h3>
                        <p className={highlighted ? 'tw:text-paragraph_white tw:text-base tw:pb-2.5' : 'tw:text-paragraph_black tw:text-base tw:pb-2.5'}>/ {plan.rateType}</p>
                      </div>
                      <p className={highlighted ? 'tw:text-paragraph_white tw:text-base' : 'tw:text-paragraph_black tw:text-base'}>
                        {money.format(plan.minAmount)} to {money.format(plan.maxAmount)}
                      </p>
                    </div>
                    <ul className="tw:space-y-3">
                      {bullets.map((b) => (
                        <li key={b} className={highlighted ? 'tw:flex tw:gap-2 tw:items-start tw:text-base tw:text-paragraph_white' : 'tw:flex tw:gap-2 tw:items-start tw:text-base tw:text-paragraph_black'}>
                          <i className={`bi bi-check2-circle tw:mt-0.5 ${highlighted ? 'tw:text-primary' : 'tw:text-secondary'}`} aria-hidden="true" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/register"
                      className={
                        highlighted
                          ? 'tw:w-full tw:px-6 tw:py-4 tw:text-base tw:font-semibold tw:text-title_black tw:bg-primary tw:rounded-full tw:text-center'
                          : 'tw:w-full tw:px-6 tw:py-4 tw:text-base tw:font-semibold tw:text-title_white tw:bg-title_black tw:rounded-full tw:text-center hover:tw:bg-primary hover:tw:text-title_black tw:transition'
                      }
                    >
                      Get Started Today
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3.5 Growth calculator — verbatim from financial-tools.php lines 95-106 + roi-calculator.php, simplified inputs */}
      {!plansLoading && plans.length > 0 && (
        <section className="section-spacing-lg-md tw:bg-[#0a0a0a]">
          <div className="tw:container tw:mx-auto tw:px-4">
            <GrowthCalculator plans={plans} />
          </div>
        </section>
      )}

      {/* 3.6 FAQ — verbatim from security.php lines 85-127 + accordion.php + its JS behavior (image column dropped, no equivalent content) */}
      <section id="faq" className="section-spacing-lg tw:bg-secondary">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 md:tw:gap-10 tw:mb-12 sm:tw:mb-14 md:tw:mb-16 lg:tw:mb-20 tw:flex-col md:tw:flex-row">
            <div className="md:tw:max-w-170 tw:w-full">
              <span className="tw:text-base lg:tw:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:uppercase">FREQUENTLY ASKED QUESTIONS</span>
              <h2 className="tw:text-3xl md:tw:text-4xl lg:tw:text-[40px] xl:tw:text-5xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Everything You Need to Know</h2>
            </div>
            <p className="md:tw:max-w-115 tw:w-full tw:text-base sm:tw:text-lg tw:text-paragraph_white">
              Can&apos;t find what you&apos;re looking for? Reach out using the contact form below.
            </p>
          </div>
          <div className="md:tw:max-w-full tw:w-full">
            <SecureVestAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>

      {/* Contact — kept on the landing page at the user's request even though it isn't one of the brief's listed sections */}
      <section id="contact" className="tw:bg-[#0a0a0a] tw:py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="ic-public-eyebrow mb-2 d-inline-flex">Contact</span>
            <h2 className="h3 mb-0 text-white">Get in touch</h2>
          </div>
          <div className="row g-5" style={{ maxWidth: 840, margin: '0 auto' }}>
            <div className="col-12 col-lg-4">
              <div className="mb-3">
                <IconBadge size={48}>
                  <IconMail width={22} height={22} />
                </IconBadge>
              </div>
              <p className="mb-3 text-white-50">
                Have a question about {branding.siteName}, a deposit, or a withdrawal? Send us a message and our team will get back to you. Already have an account? You can also open a ticket from
                your dashboard&apos;s Support Center for the fastest response.
              </p>
              <SocialLinksRow links={socialLinks} />
            </div>
            <div className="col-12 col-lg-8 ps-lg-5 ic-public-contact-info">
              <ContactSection />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
