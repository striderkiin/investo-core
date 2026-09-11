import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createContactService } from '../../../services/api/contactService';
import { createInvestmentService } from '../../../services/api/investmentService';
import type { InvestmentPlan } from '../../../types/database';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';
import { IconBadge } from '../../../components/public/IconBadge';
import { HeroVisual } from '../../../components/public/HeroVisual';
import { HowItWorksFlow } from '../../../components/public/HowItWorksFlow';
import { IconTrendUp, IconShieldCheck, IconPeople, IconPiggyBank, IconLock, IconEye, IconLightning, IconMail } from '../../../components/public/icons';

const contactService = createContactService();
const investmentService = createInvestmentService();
const planAmountFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const BENEFITS = [
  { icon: IconTrendUp, title: 'Live Market Data', text: 'Real-time charts and up-to-the-minute pricing.' },
  { icon: IconShieldCheck, title: 'Secure by Design', text: 'Role-based access, full audit logging, server-side validation.' },
  { icon: IconPeople, title: 'Referral Program', text: 'Earn rewards for every investor you bring in.' },
  { icon: IconPiggyBank, title: 'Flexible Plans', text: 'From steady starter returns to our top tier.' },
];

const STATS = [
  { value: '4', suffix: '', label: 'Investment plans' },
  { value: '24', suffix: '/7', label: 'Platform availability' },
  { value: '100', suffix: '%', label: 'Server-validated transactions' },
];

const BEST_FEATURES = [
  { icon: IconLock, title: 'Security First', text: 'Every balance-affecting action runs through server-side, audited logic, never trusted from the browser.' },
  { icon: IconEye, title: 'Transparency', text: 'Clear, real-time status on every deposit, withdrawal, and investment, with no black boxes.' },
  { icon: IconLightning, title: 'Built for Scale', text: 'A modular architecture designed to grow from a handful of investors to a full platform.' },
];

const FAQ_GROUPS = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'How do I get started?',
        answer: 'Create a free account, verify your email, then make a deposit from your dashboard to activate an investment plan that fits your goals.',
      },
    ],
  },
  {
    category: 'Investment Plans',
    items: [
      {
        question: 'How are investment plan rates determined?',
        answer: 'Rates, minimums, maximums, and durations for each plan are shown above. They can change for future investments at any time.',
      },
    ],
  },
  {
    category: 'Deposits & Withdrawals',
    items: [
      {
        question: 'How long do deposits take to confirm?',
        answer:
          'Deposits are confirmed automatically once our backend verifies the payment. We never mark a deposit as complete based on the browser alone, so confirmation timing depends on the payment method used.',
      },
      {
        question: 'How do withdrawals work?',
        answer:
          'Request a withdrawal from your dashboard with your amount and destination. It moves through review and processing, and you receive real-time status updates until it completes.',
      },
    ],
  },
  {
    category: 'Referrals',
    items: [
      {
        question: 'Is there a referral program?',
        answer: 'Yes, every account gets a referral code and link. Track your direct referrals, earnings, and bonuses from your dashboard.',
      },
    ],
  },
  {
    category: 'Security & Support',
    items: [
      {
        question: 'How is my account secured?',
        answer:
          'Every account supports two-factor authentication, and you can view and terminate active sessions at any time from Settings, Security. All financial actions are validated server-side.',
      },
      {
        question: 'What if I need help?',
        answer: "Open a ticket from your dashboard's Support Center once logged in, or use the contact form below if you don't have an account yet.",
      },
    ],
  },
];

function FaqRow({ question, answer, defaultOpen }: { question: string; answer: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div className={`ic-faq-row ${open ? 'is-open' : ''}`} variants={staggerItem}>
      <button type="button" className="ic-faq-row-button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="fw-semibold">{question}</span>
        <span className="ic-faq-icon">
          <i className="bi bi-plus" aria-hidden="true" />
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <p className="pb-3 mb-0 small">{answer}</p>
      </motion.div>
    </motion.div>
  );
}

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
              <input
                id="contactName"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="contactEmail" className="form-label small">
                Email
              </label>
              <input
                id="contactEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'submitting'}
              />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="contactSubject" className="form-label small">
              Subject
            </label>
            <input
              id="contactSubject"
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={status === 'submitting'}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="contactMessage" className="form-label small">
              Message
            </label>
            <textarea
              id="contactMessage"
              className="form-control"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={status === 'submitting'}
            />
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

export function LandingPage() {
  const { branding } = useBranding();
  const location = useLocation();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

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
                <Link to="/#pricing" className="ic-public-link d-inline-flex align-items-center">
                  View plans <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
            <div className="col-12 col-lg-5 d-none d-lg-block" aria-hidden="true">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      <PublicSection className="container py-5">
        <div className="row g-4 g-lg-0">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                className="col-12 col-md-6 col-lg-3 px-lg-4"
                key={benefit.title}
                style={index > 0 ? { borderLeft: '1px solid var(--pub-border)' } : undefined}
              >
                <div className="mb-3">
                  <IconBadge index={index} size={44}>
                    <Icon width={20} height={20} />
                  </IconBadge>
                </div>
                <h2 className="h6">{benefit.title}</h2>
                <p className="small mb-0">{benefit.text}</p>
              </div>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection as="div" id="about" className="ic-public-band-light py-5">
        <div className="container" style={{ maxWidth: 960 }}>
        <div className="row g-5 align-items-center">
          <div className="col-12 col-lg-6">
            <span className="ic-public-eyebrow mb-3 d-inline-flex">About</span>
            <h2 className="h3 mb-3">What is {branding.siteName}?</h2>
            <p className="mb-3">
              A secure, transparent platform for managing your portfolio, with real-time visibility into every
              deposit, investment, and withdrawal, and a support team that treats your questions seriously.
            </p>
            <p className="mb-0">
              Every account holder, from a first-time investor to a long-term client, gets full confidence in how
              funds are handled, backed by clear audit trails and modern security practices.
            </p>
          </div>
          <div className="col-12 col-lg-6">
            <div className="row g-3">
              {STATS.map((stat) => (
                <div className="col-12 col-sm-6" key={stat.label}>
                  <div className="ic-public-card ic-public-stat-card p-4 h-100">
                    <div className="ic-public-stat-value mb-1 ic-public-accent-text">
                      {stat.value}
                      {stat.suffix}
                    </div>
                    <div className="ic-public-stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </PublicSection>

      <PublicSection className="container py-5 border-top" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="text-center mb-5">
          <h2 className="h3 mb-2">Why choose us</h2>
        </div>
        <motion.div className="row g-4 mb-5" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {BEST_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div className="col-12 col-md-4" key={feature.title} variants={staggerItem}>
                <div className="ic-public-card ic-public-card-interactive h-100 p-4 text-center">
                  <div className="mb-3">
                    <IconBadge size={56}>
                      <Icon width={26} height={26} />
                    </IconBadge>
                  </div>
                  <h3 className="h6 mb-0">{feature.title}</h3>
                  <hr className="ic-public-title-rule" />
                  <p className="small mb-0">{feature.text}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <HowItWorksFlow />
      </PublicSection>

      <PublicSection as="div" id="pricing" className="border-top border-bottom py-5" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="container">
          <div className="text-center mb-5">
            <span className="ic-public-eyebrow mb-2 d-inline-flex">Pricing</span>
            <h2 className="h3 mb-0">Pick the plan that fits your goals</h2>
          </div>

          {plansLoading ? (
            <p className="text-center small mb-0">Loading plans…</p>
          ) : plans.length === 0 ? (
            <p className="text-center small mb-0">Plans are being updated. Check back shortly.</p>
          ) : (
            <motion.div className="row g-4 justify-content-center" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
              {plans.map((plan, index) => {
                const highlighted = index === 1;
                return (
                  <motion.div className="col-12 col-md-6 col-lg-3" key={plan.id} variants={staggerItem}>
                    <div className={`ic-public-card ic-public-card-interactive h-100 p-4 d-flex flex-column ${highlighted ? 'ic-public-card-highlight' : ''}`}>
                      {highlighted && <span className="ic-public-badge align-self-start mb-2">Most Popular</span>}
                      <h3 className="h5 mb-3">{plan.name}</h3>
                      <div className="mb-3">
                        <span className="display-6 ic-public-accent-text" style={{ fontFamily: 'var(--pub-font-display)' }}>
                          {plan.rate}%
                        </span>
                        <span className="small"> / {plan.rateType}</span>
                      </div>
                      <ul className="list-unstyled small mb-4 flex-grow-1">
                        <li className="mb-1">
                          <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {planAmountFormatter.format(plan.minAmount)} to{' '}
                          {planAmountFormatter.format(plan.maxAmount)}
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
                );
              })}
            </motion.div>
          )}
        </div>
      </PublicSection>

      <PublicSection as="div" id="faq" className="container py-5" style={{ maxWidth: 720 }}>
        <div className="text-center mb-5">
          <span className="ic-public-eyebrow mb-2 d-inline-flex">FAQ</span>
          <h2 className="h3 mb-0">Frequently asked questions</h2>
        </div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FAQ_GROUPS.map((group, groupIndex) => (
            <div key={group.category}>
              <div className="ic-faq-category">{group.category}</div>
              {group.items.map((faq, itemIndex) => (
                <FaqRow key={faq.question} question={faq.question} answer={faq.answer} defaultOpen={groupIndex === 0 && itemIndex === 0} />
              ))}
            </div>
          ))}
        </motion.div>
      </PublicSection>

      <PublicSection as="div" id="contact" className="container py-5 border-top" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="text-center mb-5">
          <span className="ic-public-eyebrow mb-2 d-inline-flex">Contact</span>
          <h2 className="h3 mb-0">Get in touch</h2>
        </div>
        <div className="row g-5" style={{ maxWidth: 840, margin: '0 auto' }}>
          <div className="col-12 col-lg-4">
            <div className="mb-3">
              <IconBadge size={48}>
                <IconMail width={22} height={22} />
              </IconBadge>
            </div>
            <p className="mb-0">
              Have a question about {branding.siteName}, a deposit, or a withdrawal? Send us a message and our team
              will get back to you. Already have an account? You can also open a ticket from your dashboard&apos;s
              Support Center for the fastest response.
            </p>
          </div>
          <div className="col-12 col-lg-8 ps-lg-5 ic-public-contact-info">
            <ContactSection />
          </div>
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
