/**
 * Every piece of the public landing page an admin can change from
 * Website > Landing page. The page and the admin editor both read this list,
 * so a field added here shows up in both places.
 *
 * `default` is what shows until an admin changes it (and again after they
 * press "Use default"). "{site}" is replaced with the site name from
 * Branding. Images are paths or full URLs.
 *
 * List fields (FAQ, feature cards) have a fixed number of slots. A slot whose
 * main text is empty is hidden on the page.
 */

export type ContentKind = 'text' | 'textarea' | 'image';

export interface ContentField {
  key: string;
  label: string;
  kind: ContentKind;
  default: string;
  hint?: string;
}

export interface ContentSection {
  id: string;
  title: string;
  description: string;
  fields: ContentField[];
}

const S = '/securevest';

const text = (key: string, label: string, value: string, hint?: string): ContentField => ({ key, label, kind: 'text', default: value, hint });
const area = (key: string, label: string, value: string, hint?: string): ContentField => ({ key, label, kind: 'textarea', default: value, hint });
const image = (key: string, label: string, value: string, hint?: string): ContentField => ({ key, label, kind: 'image', default: value, hint });

const FEATURE_CARDS = [
  { title: 'Real-Time Tracking', desc: 'Watch your balances, returns, and transaction history update live from your dashboard.' },
  { title: 'Bank-Grade Security', desc: 'Two-factor authentication, session controls, and server-validated transactions on every account.' },
  { title: 'Transparent Reporting', desc: 'A full, auditable ledger of every deposit, investment, and withdrawal, never a black box.' },
  { title: 'Referral Rewards', desc: 'Every account gets a referral code and link, with earnings tracked automatically.' },
];

const FEATURE_POINTS = [
  'Live Market Data: real-time charts and up-to-the-minute pricing across every plan.',
  'Secure by Design: role-based access, full audit logging, and server-side validation on every account.',
  'Referral Program: earn rewards for every investor you bring onto the platform.',
];

const STATS = [
  { value: '4', title: 'Investment Plans', desc: 'From steady starter returns to our top tier, each with a fixed rate and duration.' },
  { value: '24/7', title: 'Platform Availability', desc: 'Manage deposits, withdrawals, and investments from your dashboard any time.' },
  { value: '100%', title: 'Server-Validated Transactions', desc: 'Every balance-affecting action runs through audited, server-side logic, never the browser.' },
];

export const FAQ_SLOTS = 10;
const FAQ = [
  {
    q: 'How do I get started?',
    a: 'Create an account with your name, email, and password, then confirm your email from the link we send you. From there you can fund your account and choose a plan.',
  },
  {
    q: 'How are investment plan rates determined?',
    a: 'Every plan has a fixed rate, rate type (daily, weekly, or monthly), duration, and deposit range that we set and publish up front. Once you invest, that rate and duration are locked in for the life of your investment, even if the plan changes later.',
  },
  {
    q: 'How long do deposits take to confirm?',
    a: 'Deposits are held as pending until confirmed on the backend, which depends on network and provider conditions rather than a fixed schedule. You can track the live status of any deposit from your dashboard at any time.',
  },
  {
    q: 'How do withdrawals work?',
    a: "Withdrawals are paid in USDT. Submit a request with an amount and your wallet address, and it is checked against your available balance and the platform's withdrawal limits. Our team reviews every withdrawal before it is paid out.",
  },
  {
    q: 'Is there a referral program?',
    a: 'Yes, every account gets its own referral code and link to share. When someone you refer joins and becomes active, a referral reward is credited to your account, and you can track your referrals and earnings from your dashboard.',
  },
  {
    q: 'How is my account secured?',
    a: 'Your account supports two-factor authentication via an authenticator app, and you can view and sign out of your active sessions individually or all at once. Every balance-affecting action is logged and validated server-side, never left to the browser.',
  },
];

export const LANDING_SECTIONS: ContentSection[] = [
  {
    id: 'hero',
    title: 'Top banner',
    description: 'The first thing visitors see.',
    fields: [
      text('hero.eyebrow', 'Small heading', 'INVESTMENT INFRASTRUCTURE'),
      area('hero.title', 'Main heading', 'Your capital. In full view.'),
      area('hero.text', 'Text under the heading', 'A complete platform to manage deposits, withdrawals, investments, and referrals, all in one secure dashboard with real-time visibility into every action.'),
      text('hero.button', 'Button text', 'Create free account'),
      image('hero.image', 'Main picture', `${S}/img/home-v2/banner/banner-thumb.webp`, 'Shown on the right. A portrait picture around 630 x 700 works best.'),
      image('hero.small_image', 'Small card picture', `${S}/img/home-v2/banner/shape-02.webp`, 'The small card that overlaps the main picture.'),
      text('hero.badge_value', 'Badge number', '4'),
      text('hero.badge_label', 'Badge text', 'Investment Plans'),
    ],
  },
  {
    id: 'features',
    title: 'Why us',
    description: 'The section with the feature list and four cards.',
    fields: [
      text('features.eyebrow', 'Small heading', 'WHY {site}'),
      area('features.title', 'Heading', 'Built for the Next Generation of Investors'),
      area('features.text', 'Text under the heading', 'We give modern investors the tools, security, and clarity needed to manage capital with confidence.'),
      ...FEATURE_POINTS.map((point, i) => area(`features.point${i + 1}`, `List point ${i + 1}`, point, 'Leave empty to hide this point.')),
      ...FEATURE_CARDS.flatMap((card, i) => [
        image(`features.card${i + 1}.icon`, `Card ${i + 1} icon`, `${S}/img/home-v2/feature/feature-icon-0${i + 1}.svg`, 'A small square icon, 40 x 40.'),
        text(`features.card${i + 1}.title`, `Card ${i + 1} title`, card.title, 'Leave empty to hide this card.'),
        area(`features.card${i + 1}.text`, `Card ${i + 1} text`, card.desc),
      ]),
    ],
  },
  {
    id: 'stats',
    title: 'Numbers',
    description: 'The section with three numbers and two pictures.',
    fields: [
      text('stats.eyebrow', 'Small heading', 'PLATFORM RELIABILITY'),
      area('stats.title', 'Heading', 'Built for Trust, Measured in Numbers'),
      area('stats.text', 'Text beside the heading', 'We measure our own success by the reliability and transparency of the platform you depend on.'),
      image('stats.image1', 'Wide picture', `${S}/img/home-v2/counter-img/counter-1.webp`, 'Wide landscape picture, around 835 x 310.'),
      image('stats.image2', 'Small picture', `${S}/img/home-v2/counter-img/counter-2.webp`, 'Around 410 x 310.'),
      ...STATS.flatMap((stat, i) => [
        text(`stats.item${i + 1}.value`, `Number ${i + 1}`, stat.value),
        text(`stats.item${i + 1}.title`, `Number ${i + 1} title`, stat.title),
        area(`stats.item${i + 1}.text`, `Number ${i + 1} text`, stat.desc),
      ]),
    ],
  },
  {
    id: 'plans',
    title: 'Plans',
    description: 'The plan cards come from Plans in the admin panel. Only the heading and button are set here.',
    fields: [
      text('plans.eyebrow', 'Small heading', 'PRICING PLAN'),
      area('plans.title', 'Heading', 'Choose the Plan that Best Fits Your Goals'),
      area('plans.text', 'Text beside the heading', 'Every plan has a fixed rate, deposit range, and duration, no hidden fees, no surprises.'),
      text('plans.button', 'Button text on each plan', 'Get Started Today'),
    ],
  },
  {
    id: 'calculator',
    title: 'Return calculator',
    description: 'The calculator uses your real plans. Only the words around it are set here.',
    fields: [
      text('calc.eyebrow', 'Small heading', 'RETURN CALCULATOR'),
      area('calc.title', 'Heading', 'See What Your Money Could Earn'),
      area('calc.text', 'Text beside the heading', "Pick a plan and an amount to see a live projection based on that plan's real fixed rate and duration."),
      text('calc.cta_title', 'Bottom call to action heading', 'Ready to Put Your Capital to Work?'),
      area('calc.cta_text', 'Bottom call to action text', 'Create a free account and fund your first plan in minutes, then track everything live from your dashboard.'),
      text('calc.cta_button', 'Bottom call to action button', 'Create free account'),
    ],
  },
  {
    id: 'faq',
    title: 'Questions and answers',
    description: `Up to ${FAQ_SLOTS} questions. Leave a question empty to hide it.`,
    fields: [
      text('faq.eyebrow', 'Small heading', 'FREQUENTLY ASKED QUESTIONS'),
      area('faq.title', 'Heading', 'Everything You Need to Know'),
      area('faq.text', 'Text under the heading', 'Answers to the questions we hear most about getting started, rates, deposits, withdrawals, and account security.'),
      ...Array.from({ length: FAQ_SLOTS }, (_, i) => [
        text(`faq.q${i + 1}`, `Question ${i + 1}`, FAQ[i]?.q ?? ''),
        area(`faq.a${i + 1}`, `Answer ${i + 1}`, FAQ[i]?.a ?? ''),
      ]).flat(),
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'The contact form at the bottom of the page. Messages arrive in Support.',
    fields: [
      text('contact.eyebrow', 'Small heading', 'Contact'),
      text('contact.title', 'Heading', 'Get in touch'),
      area('contact.text', 'Text beside the form', "Have a question about a deposit or a withdrawal? Send us a message and our team will get back to you. Already have an account? You can also open a ticket from your dashboard's Support Center for the fastest response."),
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'The dark strip at the bottom of every public page.',
    fields: [area('footer.text', 'Text under the logo', 'A transparent, server-validated platform for tracking deposits, investments, and withdrawals, all in one dashboard.')],
  },
];

export const LANDING_FIELDS: ContentField[] = LANDING_SECTIONS.flatMap((section) => section.fields);
export const LANDING_DEFAULTS: Record<string, string> = Object.fromEntries(LANDING_FIELDS.map((field) => [field.key, field.default]));
