import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createContactService } from '../../../services/api/contactService';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { PublicSection, staggerContainer, staggerItem } from '../../../components/public/PublicSection';

const contactService = createContactService();

const BENEFITS = [
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

const BEST_FEATURES = [
  { icon: 'bi-lock', title: 'Security First', text: 'Every balance-affecting action runs through server-side, audited logic, never trusted from the browser.' },
  { icon: 'bi-eye', title: 'Transparency', text: 'Clear, real-time status on every deposit, withdrawal, and investment, with no black boxes.' },
  { icon: 'bi-lightning-charge', title: 'Built for Scale', text: 'A modular architecture designed to grow from a handful of investors to a full platform.' },
];

type PricingTier = {
  name: string;
  rate: string;
  rateLabel: string;
  minAmount: string;
  maxAmount: string;
  durationDays: number;
  highlighted?: boolean;
};

const PRICING_TIERS: PricingTier[] = [
  { name: 'Starter', rate: '1.2%', rateLabel: 'daily', minAmount: '$100', maxAmount: '$999', durationDays: 30 },
  { name: 'Growth', rate: '1.8%', rateLabel: 'daily', minAmount: '$1,000', maxAmount: '$4,999', durationDays: 60, highlighted: true },
  { name: 'Elite', rate: '2.5%', rateLabel: 'daily', minAmount: '$5,000', maxAmount: '$25,000', durationDays: 90 },
];

const FAQS = [
  {
    question: 'How do I get started?',
    answer: 'Create a free account, verify your email, then make a deposit from your dashboard to activate an investment plan that fits your goals.',
  },
  {
    question: 'How are investment plan rates determined?',
    answer: 'Rates, minimums, maximums, and durations for each plan are shown above. They can change for future investments at any time.',
  },
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
  {
    question: 'Is there a referral program?',
    answer: 'Yes, every account gets a referral code and link. Track your direct referrals, earnings, and bonuses from your dashboard.',
  },
  {
    question: 'How is my account secured?',
    answer:
      'Every account supports two-factor authentication, and you can view and terminate active sessions at any time from Settings, Security. All financial actions are validated server-side.',
  },
  {
    question: 'What if I need help?',
    answer: "Open a ticket from your dashboard's Support Center once logged in, or use the contact form below if you don't have an account yet.",
  },
];

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div className="ic-public-card mb-3 overflow-hidden" variants={staggerItem}>
      <button
        type="button"
        className="btn w-100 text-start d-flex justify-content-between align-items-center p-4 border-0 bg-transparent"
        style={{ color: 'var(--pub-text)' }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="fw-semibold">{question}</span>
        <motion.i className="bi bi-chevron-down" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} aria-hidden="true" />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <p className="px-4 pb-4 mb-0 small">{answer}</p>
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

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash]);

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
            <div className="col-12 col-lg-5 d-none d-lg-block" aria-hidden="true" />
          </div>
        </div>
      </section>

      <PublicSection className="container py-5">
        <div className="row g-4 g-lg-0">
          {BENEFITS.map((benefit, index) => (
            <div
              className="col-12 col-md-6 col-lg-3 px-lg-4"
              key={benefit.title}
              style={index > 0 ? { borderLeft: '1px solid var(--pub-border)' } : undefined}
            >
              <i className={`bi ${benefit.icon} fs-4 mb-3 d-block`} style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
              <h2 className="h6">{benefit.title}</h2>
              <p className="small mb-0">{benefit.text}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection as="div" id="about" className="container py-5" style={{ maxWidth: 960 }}>
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
                  <div className="ic-public-card p-4 h-100">
                    <div className="h3 mb-1 ic-public-accent-text" style={{ fontFamily: 'var(--pub-font-display)' }}>
                      {stat.value}
                      {stat.suffix}
                    </div>
                    <div className="small" style={{ color: 'var(--pub-text-subtle)' }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection className="container py-5 border-top" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="text-center mb-5">
          <h2 className="h3 mb-2">Why choose us</h2>
        </div>
        <motion.div className="row g-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {BEST_FEATURES.map((feature) => (
            <motion.div className="col-12 col-md-4" key={feature.title} variants={staggerItem}>
              <div className="ic-public-card h-100 p-4 text-center">
                <i className={`bi ${feature.icon} fs-1 mb-3`} style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                <h3 className="h6">{feature.title}</h3>
                <p className="small mb-0">{feature.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </PublicSection>

      <PublicSection as="div" id="pricing" className="border-top border-bottom py-5" style={{ borderColor: 'var(--pub-border)' }}>
        <div className="container">
          <div className="text-center mb-5">
            <span className="ic-public-eyebrow mb-2 d-inline-flex">Pricing</span>
            <h2 className="h3 mb-0">Pick the plan that fits your goals</h2>
          </div>

          <motion.div className="row g-4 justify-content-center" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
            {PRICING_TIERS.map((tier) => (
              <motion.div className="col-12 col-md-6 col-lg-4" key={tier.name} variants={staggerItem}>
                <div className={`ic-public-card h-100 p-4 d-flex flex-column ${tier.highlighted ? 'ic-public-card-highlight' : ''}`}>
                  {tier.highlighted && <span className="ic-public-badge align-self-start mb-2">Most Popular</span>}
                  <h3 className="h5 mb-3">{tier.name}</h3>
                  <div className="mb-3">
                    <span className="display-6 ic-public-accent-text" style={{ fontFamily: 'var(--pub-font-display)' }}>
                      {tier.rate}
                    </span>
                    <span className="small"> / {tier.rateLabel}</span>
                  </div>
                  <ul className="list-unstyled small mb-4 flex-grow-1">
                    <li className="mb-1">
                      <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {tier.minAmount} to {tier.maxAmount}
                    </li>
                    <li className="mb-1">
                      <i className="bi bi-check2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" /> {tier.durationDays}-day duration
                    </li>
                  </ul>
                  <Link to="/register" className="btn ic-public-btn-outline mt-auto">
                    Get Started
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </PublicSection>

      <PublicSection as="div" id="faq" className="container py-5" style={{ maxWidth: 720 }}>
        <div className="text-center mb-5">
          <span className="ic-public-eyebrow mb-2 d-inline-flex">FAQ</span>
          <h2 className="h3 mb-0">Frequently asked questions</h2>
        </div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FAQS.map((faq, index) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} index={index} />
          ))}
        </motion.div>
      </PublicSection>

      <PublicSection as="div" id="contact" className="container py-5 border-top" style={{ maxWidth: 640, borderColor: 'var(--pub-border)' }}>
        <div className="text-center mb-5">
          <span className="ic-public-eyebrow mb-2 d-inline-flex">Contact</span>
          <h2 className="h3 mb-2">Get in touch</h2>
          <p className="mb-0">
            Have a question about {branding.siteName}, a deposit, or a withdrawal? Send us a message and our team
            will get back to you. Already have an account? You can also open a ticket from your dashboard&apos;s
            Support Center for the fastest response.
          </p>
        </div>
        <ContactSection />
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
