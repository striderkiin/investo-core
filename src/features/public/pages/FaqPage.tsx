import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PublicPageHero } from '../../../components/public/PublicPageHero';
import { staggerContainer, staggerItem } from '../../../components/public/PublicSection';

const FAQS = [
  {
    question: 'How do I get started?',
    answer: 'Create a free account, verify your email, then make a deposit from your dashboard to activate an investment plan that fits your goals.',
  },
  {
    question: 'How are investment plan rates determined?',
    answer:
      'Rates, minimums, maximums, and durations for each plan are configured by the platform operator and shown on the Pricing page. They can change for future investments at any time.',
  },
  {
    question: 'How long do deposits take to confirm?',
    answer:
      'Deposits are confirmed automatically once our backend verifies the payment — we never mark a deposit as complete based on the browser alone, so confirmation timing depends on the payment method used.',
  },
  {
    question: 'How do withdrawals work?',
    answer:
      'Request a withdrawal from your dashboard with your amount and destination. It moves through review and processing, and you receive real-time status updates until it completes.',
  },
  {
    question: 'Is there a referral program?',
    answer: 'Yes — every account gets a referral code and link. Track your direct referrals, earnings, and bonuses from your dashboard.',
  },
  {
    question: 'How is my account secured?',
    answer:
      'Every account supports two-factor authentication, and you can view and terminate active sessions at any time from Settings → Security. All financial actions are validated server-side.',
  },
  {
    question: 'What if I need help?',
    answer: 'Open a ticket from your dashboard\'s Support Center once logged in, or use our Contact page if you don\'t have an account yet.',
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

export function FaqPage() {
  return (
    <>
      <PublicPageHero eyebrow="FAQ" title="Frequently asked questions" subtitle="Everything you need to know before getting started." />
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FAQS.map((faq, index) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} index={index} />
          ))}
        </motion.div>
        <p className="text-center mt-5 mb-0">
          Still have questions? <Link to="/contact">Contact us</Link>.
        </p>
      </div>
    </>
  );
}
