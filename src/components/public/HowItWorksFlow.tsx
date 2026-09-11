import { motion } from 'framer-motion';
import { IconUserPlus, IconWallet, IconChartBar, IconArrowsExchange } from './icons';
import { staggerContainer, staggerItem } from './PublicSection';

const STEPS = [
  { icon: IconUserPlus, title: 'Sign Up', text: 'Create a free account in minutes.' },
  { icon: IconWallet, title: 'Deposit', text: 'Fund your account securely.' },
  { icon: IconChartBar, title: 'Investment Plan', text: 'Pick the plan that fits your goals.' },
  { icon: IconArrowsExchange, title: 'Withdraw / Earn', text: 'Track earnings, withdraw anytime.' },
];

/**
 * The spec's highest-leverage addition against the "generic AI template"
 * feel: a small custom flow diagram, not another icon-in-a-card row. Nodes
 * connect via a single hairline that runs behind them; on mobile it
 * collapses to a vertical stack with a vertical connector instead of
 * trying to force the horizontal line to wrap.
 */
export function HowItWorksFlow() {
  return (
    <motion.div
      className="ic-flow position-relative"
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
    >
      <div className="ic-flow-line" aria-hidden="true" />
      <div className="row g-4 g-lg-0 position-relative">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div className="col-12 col-md-6 col-lg-3 text-center" key={step.title} variants={staggerItem}>
              <div className="ic-flow-node mx-auto mb-3">
                <Icon width={22} height={22} />
              </div>
              <h4 className="h6 mb-1">{step.title}</h4>
              <p className="small mb-0">{step.text}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
