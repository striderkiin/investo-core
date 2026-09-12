import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { createContactService } from '../../../services/api/contactService';
import { createSocialLinksService } from '../../../services/api/socialLinksService';
import { createInvestmentService } from '../../../services/api/investmentService';
import type { InvestmentPlan, SocialLink } from '../../../types/database';
import { useAuth } from '../../../hooks/useAuth';
import { IconBadge } from '../../../components/public/IconBadge';
import { SocialLinksRow } from '../../../components/public/SocialLinksRow';
import { IconMail } from '../../../components/public/icons';
import { SecureVestAccordion } from '../../../components/public/securevest/SecureVestAccordion';

const contactService = createContactService();
const socialLinksService = createSocialLinksService();
const investmentService = createInvestmentService();
const S = '/securevest';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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

export function LandingPage() {
  const location = useLocation();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [accordionActive, setAccordionActive] = useState(0);
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
    socialLinksService
      .listEnabled()
      .then(setSocialLinks)
      .catch((err) => console.error('Failed to load social links', err));
  }, []);

  useEffect(() => {
    investmentService
      .listPlans()
      .then(setPlans)
      .catch((err) => console.error('Failed to load investment plans', err))
      .finally(() => setPlansLoading(false));
  }, []);

  return (
    <div className="sv-page">
      {/* ===== 3.1 Hero — verbatim from index-two.php lines 14-60 ===== */}
      <section className="tw:py-14 tw:md:py-20 tw:lg:py-24 tw:xl:py-27 tw:bg-[#080808] tw:relative tw:z-1">
        <img className="tw:hidden tw:lg:block tw:absolute tw:top-[4%] tw:left-0 tw:-z-1" src={`${S}/img/home-v2/banner/background-shape.webp`} alt="background-shape" />
        <div className="tw:container">
          <div className="tw:flex tw:items-center tw:justify-between tw:gap-10 tw:flex-col tw:md:flex-row">
            <div className="tw:md:max-w-137.5 tw:w-full">
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <img className="rotate" src={`${S}/img/title-icon.svg`} alt="title-icon" />
                <p className="tw:text-base tw:sm:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase">SMART LENDING</p>
              </div>
              <h1 className="tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px] tw:font-bold tw:leading-[1.1]! tw:text-title_black tw:mt-4 tw:md:mt-5">
                Empowering your financial future
              </h1>
              <p className="tw:text-base tw:text-paragraph_black tw:mt-4">
                We help individuals and businesses grow wealth, reduce risk, and achieve long-term success. Our AI-driven platform analyzes your profile in real-time to unlock the best loan
                opportunities tailored to your needs.
              </p>
              <div className="tw:mt-6 tw:sm:mt-8 tw:lg:mt-12 tw:flex tw:items-center tw:gap-3">
                <a href="#global-access" className="button-primary">
                  Download App
                </a>
                <a
                  className="video-popup tw:w-10 tw:md:w-12 tw:h-10 tw:md:h-12 tw:rounded-full tw:bg-title_black tw:flex tw:items-center tw:justify-center tw:text-title_white"
                  href="https://www.youtube.com/embed/S_CGed6E610?si=8usIVmgCLNXWZE_K"
                >
                  <svg className="tw:fill-current tw:w-3.25 tw:h-3.75">
                    <use href="#playIcon" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="tw:max-w-120 tw:lg:max-w-157.25 tw:xl:max-w-145 tw:2xl:max-w-157.25 tw:w-full tw:xl:-mr-10.5 tw:pb-12 tw:px-3 tw:pt-3 tw:relative tw:z-1">
              {/* Main Thumb */}
              <img className="tw:max-w-157.25 tw:w-full tw:ml-auto" src={`${S}/img/home-v2/banner/banner-thumb.webp`} alt="thumb" />

              {/* Cercile Shpae */}
              <div className="tw:absolute tw:top-0 tw:right-[10%] tw:-z-1 tw:w-[70%] tw:bg-primary tw:aspect-square tw:rounded-full" />
              {/* Graph Shpae */}
              <img
                className="tw:w-[45%] tw:lg:w-auto tw:max-w-51.5 tw:absolute tw:bottom-0 tw:xl:bottom-auto tw:xl:top-[20%] tw:left-0 tw:xl:-left-[12%] tw:z-1 tw:shadow-[0px_4px_24px_0px_rgba(0,0,0,0.1)] tw:rounded-2xl tw:max-[380px]:hidden"
                src={`${S}/img/home-v2/banner/shape-02.webp`}
                alt="banner-sahpe"
              />
              {/* Counter Up */}
              <div className="tw:absolute tw:bottom-0 tw:max-[380px]:right-1/2 tw:transform tw:max-[380px]:translate-x-1/2 tw:right-0 tw:lg:right-auto tw:lg:left-[50%] tw:z-1 tw:p-4 tw:lg:p-6 tw:bg-secondary tw:rounded-xl tw:lg:rounded-2xl tw:shadow-[0px_4px_24px_0px_rgba(0,0,0,0.1)]">
                <div className="tw:flex">
                  <h2 className="counter tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:text-title_white tw:font-bold tw:leading-none!">10</h2>
                  <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:text-title_white tw:font-bold tw:leading-none!">+</h2>
                </div>
                <div className="tw:mt-2 tw:lg:mt-4 tw:flex tw:flex-col tw:gap-1.75">
                  <p className="tw:text-sm tw:text-title_white tw:font-semibold">Years Of Experience</p>
                  <svg width="136" height="5" viewBox="0 0 136 5" fill="none" className="tw:text-title_white">
                    <path d="M0.75 3.75601C18.75 1.256 77.75 -0.743972 135.25 2.25601" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3.2 Feature area — verbatim from index-two.php lines 63-109 + features.php ===== */}
      <section className="section-spacing-lg-md">
        <div className="tw:container-lg">
          <div className="tw:pt-10 tw:pb-4 tw:px-4 tw:sm:p-10 tw:xl:p-18 tw:2xl:p-25 tw:bg-secondary tw:rounded-2xl tw:md:rounded-3xl tw:relative tw:z-1 tw:overflow-hidden">
            <img className="tw:w-full tw:absolute tw:bottom-0 tw:select-none tw:left-0 tw:-z-1" src={`${S}/img/home-v2/feature/bg-shape.webp`} alt="background-shape" />
            <div className="tw:flex tw:xl:items-start tw:justify-between tw:gap-10 tw:flex-col tw:lg:flex-row tw:relative">
              <div className="tw:max-w-175 tw:lg:max-w-135 tw:w-full tw:lg:self-start">
                <div className="tw:flex tw:items-center tw:gap-2.5">
                  <img className="rotate" src={`${S}/img/title-icon-primary.svg`} alt="title-icon" />
                  <p className="tw:text-base tw:sm:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:capitalize">CORE BANKING FEATURES</p>
                </div>
                <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Trusted by the Next Gen. of Founders</h2>
                <p className="tw:mt-4 tw:text-base tw:sm:text-lg tw:text-paragraph_white">
                  We provide modern entrepreneurs with the digital tools, high-speed security, and financial clarity needed to scale business operations globally.
                </p>
                <ul className="tw:flex tw:flex-col tw:gap-4 tw:mt-9 tw:text-paragraph_white">
                  <li className="tw:text-base tw:flex tw:items-start tw:gap-3">
                    <svg className="tw:w-5 tw:h-5 tw:fill-current tw:mt-1">
                      <use href="#tmnlList-01" />
                    </svg>
                    <span className="tw:flex-1">Instant Capital Access: Apply for business credit lines and receive funding decisions in under 24 hours.</span>
                  </li>
                  <li className="tw:text-base tw:flex tw:items-start tw:gap-3">
                    <svg className="tw:w-5 tw:h-5 tw:fill-current tw:mt-1">
                      <use href="#tmnlList-02" />
                    </svg>
                    <span className="tw:flex-1">Enterprise-Grade Security: Every account is protected by multi-factor biometric encryption and real-time fraud monitoring.</span>
                  </li>
                  <li className="tw:text-base tw:flex tw:items-start tw:gap-3">
                    <svg className="tw:w-5 tw:h-5 tw:fill-current tw:mt-1">
                      <use href="#tmnlList-03" />
                    </svg>
                    <span className="tw:flex-1">Global Financial Network: Seamlessly manage multi-currency accounts and international transfers across 90+ countries.</span>
                  </li>
                </ul>
              </div>
              <div className="tw:lg:max-w-165 tw:w-full tw:grid tw:sm:grid-cols-2 tw:lg:grid-cols-1 tw:xl:grid-cols-2 tw:gap-4 tw:sm:gap-6 tw:max-xl:flex-1">
                {[
                  { img: `${S}/img/home-v2/feature/feature-icon-01.svg`, title: 'Financial Efficiency', desc: 'Get AI-powered analytics and real-time reports to make data-driven financial decisions effortlessly.' },
                  { img: `${S}/img/home-v2/feature/feature-icon-02.svg`, title: 'Scalable Infrastructure', desc: 'Access the tools needed to manage high-volume transactions and expand your reach to new markets.' },
                  { img: `${S}/img/home-v2/feature/feature-icon-03.svg`, title: 'Multi-User Collaboration', desc: 'Assign roles and manage team spending with granular permission controls and real-time activity tracking.' },
                  { img: `${S}/img/home-v2/feature/feature-icon-04.svg`, title: 'Vault-Level Protection', desc: 'Utilize our data-driven system to monitor account integrity and ensure your assets remain secure 24/7.' },
                ].map((item) => (
                  <div className="tw:p-5 tw:sm:p-6 tw:lg:p-8 tw:rounded-2xl tw:bg-black/5 tw:border tw:border-black/10 tw:backdrop-blur-[34px]" key={item.title}>
                    <img className="tw:w-12" src={item.img} alt="feature icon" />
                    <h3 className="tw:mt-6 tw:md:mt-9 tw:text-lg tw:md:text-xl tw:font-semibold tw:text-title_white">{item.title}</h3>
                    <p className="tw:mt-3 tw:text-base tw:text-paragraph_white">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3.3 Institutional stats — verbatim from index-two.php lines 111-134 + stats-counter.php ===== */}
      <section id="about" className="section-spacing-md-lg">
        <div className="tw:container">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:md:gap-10 tw:mb-12 tw:sm:mb-14 tw:md:mb-16 tw:lg:mb-20 tw:flex-col tw:md:flex-row tw:max-w-125 tw:md:max-w-full">
            <div className="tw:md:max-w-170 tw:w-full">
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <img className="rotate" src={`${S}/img/title-icon.svg`} alt="title-icon" />
                <span className="tw:text-base tw:lg:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase tw:block">INSTITUTIONAL EXCELLENCE</span>
              </div>
              <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:font-bold tw:leading-tight tw:text-title_black tw:mt-4">Precision Performance for Global Capital</h2>
            </div>
            <p className="tw:md:max-w-115 tw:w-full tw:text-base tw:sm:text-lg tw:text-paragraph_black">
              At SecureVest, we define success through the stability and growth of our clients. Our core metrics reflect a commitment to liquidity.
            </p>
          </div>
          <div className="tw:grid tw:sm:grid-cols-2 tw:lg:grid-cols-3 tw:gap-5 tw:lg:gap-8">
            <div className="tw:sm:col-span-2">
              <img src={`${S}/img/home-v2/counter-img/counter-1.webp`} alt="counter image" className="tw:rounded-lg tw:md:rounded-2xl tw:object-cover tw:aspect-835/310 tw:w-full tw:h-full" />
            </div>
            <div className="tw:bg-secondary tw:p-5 tw:sm:p-8 tw:rounded-2xl tw:flex tw:flex-col tw:justify-between tw:gap-5">
              <div className="tw:flex tw:items-start tw:gap-1">
                <h2 className="counter tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px]">
                  80<span className="tw:text-primary tw:font-bold tw:leading-[1.1]">%</span>
                </h2>
              </div>
              <div>
                <h3 className="tw:text-title_white tw:text-xl tw:md:text-2xl tw:font-semibold">Unexpected Fee Structure</h3>
                <p className="tw:pt-3 tw:sm:pt-4 tw:text-paragraph_white tw:text-base tw:leading-normal">Experience complete transparency with zero hidden costs, ensuring your capital.</p>
              </div>
            </div>
            <div className="tw:bg-[#621348] tw:p-5 tw:sm:p-8 tw:rounded-2xl tw:flex tw:flex-col tw:justify-between tw:gap-5">
              <div className="tw:flex tw:items-start tw:gap-1">
                <h2 className="counter tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px]">100</h2>
                <h2 className="tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px]">K</h2>
              </div>
              <div>
                <h3 className="tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold">Global Enterprise Clients</h3>
                <p className="tw:pt-3 tw:sm:pt-4 tw:text-white/80 tw:text-base tw:leading-[1.5]">Empowering over 100,000 corporate entities with seamless cross-border.</p>
              </div>
            </div>

            <div>
              <img src={`${S}/img/home-v2/counter-img/counter-2.webp`} alt="counter image" className="tw:rounded-lg tw:md:rounded-2xl tw:object-cover tw:aspect-410/310 tw:w-full tw:h-full" />
            </div>

            <div className="tw:bg-[#14265C] tw:p-5 tw:sm:p-8 tw:rounded-2xl tw:flex tw:flex-col tw:justify-between tw:gap-5">
              <div className="tw:flex tw:items-start tw:gap-1">
                <h2 className="counter tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px]">95</h2>
                <h2 className="tw:text-primary tw:font-bold tw:leading-[1.1] tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px]">%</h2>
              </div>
              <div>
                <h3 className="tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold">Faster Capital Approval</h3>
                <p className="tw:pt-3 tw:sm:pt-4 tw:text-white/80 tw:text-base tw:leading-[1.5]">Our streamlined underwriting process reduces traditional wait times by 95%.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3.4 Pricing — verbatim from services.php lines 55-106 (toggle at 68-93 excluded) + pricing-cards.php ===== */}
      <section id="pricing" className="section-spacing-md-lg">
        <div className="tw:container">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:md:gap-10 tw:mb-12 tw:sm:mb-14 tw:md:mb-16 tw:lg:mb-20 tw:flex-col tw:md:flex-row tw:max-w-125 tw:md:max-w-full">
            <div className="tw:md:max-w-170 tw:w-full">
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <img className="rotate" src={`${S}/img/title-icon.svg`} alt="title-icon" />
                <span className="tw:text-base tw:lg:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-secondary tw:uppercase tw:block">PRICING PLAN</span>
              </div>
              <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:font-bold tw:leading-tight tw:text-title_black tw:mt-4">Choose the Plan that Best Fits Your Needs</h2>
            </div>
            <p className="tw:md:max-w-115 tw:w-full tw:text-base tw:sm:text-lg tw:text-paragraph_black">
              Transparency in lending is the cornerstone of trust. Use our interactive calculator to estimate your monthly repayments, visualize interest breakdowns.
            </p>
          </div>
          <div>
            {/* Monthly/Yearly toggle (services.php lines 68-93) excluded per the brief — no equivalent in Investo's model */}
            {plansLoading ? (
              <p className="tw:text-center tw:text-paragraph_black tw:mt-11.75">Loading plans…</p>
            ) : plans.length === 0 ? (
              <p className="tw:text-center tw:text-paragraph_black tw:mt-11.75">Plans are being updated. Check back shortly.</p>
            ) : (
              <div className="pricing-table tw:grid tw:grid-cols-1 tw:sm:grid-cols-2 tw:lg:grid-cols-4 tw:gap-6 tw:mt-11.75">
                {plans.slice(0, 4).map((plan, index) => {
                  const highlighted = index === 1;
                  const periodNoun = { daily: 'day', weekly: 'week', monthly: 'month' }[plan.rateType];
                  const bullets = [
                    `${plan.rate}% ${plan.rateType} return`,
                    `${money.format(plan.minAmount)} – ${money.format(plan.maxAmount)} deposit range`,
                    `${plan.durationDays}-day fixed duration`,
                    'Real-time dashboard tracking',
                  ];
                  return (
                    <div key={plan.id}>
                      <div
                        className={
                          highlighted
                            ? 'tw:bg-secondary tw:border tw:border-secondary tw:rounded-2xl tw:p-6 tw:xl:p-8 tw:flex tw:flex-col tw:justify-between tw:gap-10 tw:md:gap-12'
                            : 'tw:bg-background tw:border tw:border-border tw:rounded-2xl tw:p-6 tw:xl:p-8 tw:transition tw:duration-300 tw:flex tw:flex-col tw:justify-between tw:gap-10 tw:md:gap-12 tw:h-full'
                        }
                      >
                        <div>
                          <p className={highlighted ? 'tw:text-lg tw:font-semibold tw:leading-none tw:text-paragraph_white' : 'tw:text-paragraph_black tw:text-lg tw:font-semibold tw:leading-none'}>
                            {plan.name}
                          </p>
                          <div className="tw:mt-5 tw:mb-4 tw:flex tw:flex-wrap tw:items-end tw:gap-1.5">
                            <h2 className={highlighted ? 'price tw:text-5xl tw:xl:text-[64px] tw:leading-none tw:text-title_white' : 'price tw:text-5xl tw:xl:text-[64px] tw:leading-none tw:text-title_black'}>
                              {plan.rate}%
                            </h2>
                            <p
                              className={
                                highlighted
                                  ? 'tw:text-paragraph_white tw:text-base tw:font-normal tw:leading-none tw:pb-2.5'
                                  : 'tw:text-paragraph_black tw:text-base tw:font-normal tw:leading-none tw:pb-2.5'
                              }
                            >
                              per {periodNoun}
                            </p>
                          </div>
                          <p className={highlighted ? 'tw:text-paragraph_white tw:text-base tw:font-normal' : 'tw:text-paragraph_black tw:text-base tw:font-normal'}>{plan.description}</p>
                        </div>
                        <div>
                          <ul className="tw:space-y-3">
                            {bullets.map((f) => (
                              <li
                                key={f}
                                className={
                                  highlighted
                                    ? 'tw:flex tw:gap-2 tw:items-start tw:leading-normal tw:text-base tw:font-normal tw:text-paragraph_white'
                                    : 'tw:flex tw:gap-2 tw:items-start tw:leading-normal tw:text-base tw:font-normal tw:text-paragraph_black'
                                }
                              >
                                <i className="bi bi-check2-circle" style={{ color: highlighted ? 'var(--tw-color-primary)' : undefined }} aria-hidden="true" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <a
                          href="/register"
                          className={
                            highlighted
                              ? 'tw:w-full tw:px-6 tw:py-4 tw:text-base tw:leading-none tw:font-semibold tw:text-title_white tw:bg-primary tw:rounded-full tw:cursor-pointer tw:text-center tw:justify-center!'
                              : 'tw:w-full tw:px-6 tw:py-4 tw:text-base tw:leading-none tw:font-semibold tw:text-title_white tw:bg-title_black tw:rounded-full tw:cursor-pointer hover:tw:text-title_white hover:tw:bg-primary tw:transition tw:duration-300 tw:text-center tw:justify-center!'
                          }
                        >
                          Get Started Today
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 3.5 Growth calculator — verbatim from financial-tools.php lines 95-106 + roi-calculator.php ===== */}
      <section className="section-spacing-lg-md">
        <div className="tw:container-lg">
          <div className="tw:pt-10 tw:pb-4 tw:px-4 tw:sm:p-10 tw:xl:p-18 tw:2xl:p-25 tw:bg-secondary tw:rounded-2xl tw:md:rounded-3xl tw:relative tw:z-1 tw:overflow-hidden">
            <img className="tw:w-full tw:hidden tw:md:block tw:xl:h-full tw:absolute tw:top-0 tw:left-0 tw:-z-1" src={`${S}/img/home-v1/roi-calculator-bg-shape.webp`} alt="background-shape" />
            <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:md:gap-10 tw:mb-12 tw:sm:mb-14 tw:md:mb-16 tw:lg:mb-20 tw:flex-col tw:md:flex-row tw:max-w-125 tw:md:max-w-full">
              <div className="tw:md:max-w-170 tw:w-full">
                <div className="tw:flex tw:items-center tw:gap-2.5">
                  <img className="rotate" src={`${S}/img/title-icon-primary.svg`} alt="title-icon" />
                  <span className="tw:text-base tw:lg:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:uppercase">ROI CALCULATOR</span>
                </div>
                <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Visualize Your Path to Financial Freedom</h2>
              </div>
              <p className="tw:md:max-w-115 tw:w-full tw:text-base tw:sm:text-lg tw:text-paragraph_white">
                Use our interactive ROI engine to project your wealth growth over time, allowing you to fine-tune your investment strategy.
              </p>
            </div>
            <div className="tw:flex tw:items-start tw:gap-6 tw:flex-col tw:lg:flex-row">
              <div className="tw:lg:max-w-87 tw:w-full">
                <form className="home-1-roi-calculator tw:grid tw:sm:grid-cols-2 tw:lg:flex tw:lg:flex-col tw:gap-6 tw:w-full" onSubmit={(e) => e.preventDefault()}>
                  <div className="select-box-dark">
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Investment Horizon (Years)</label>
                    <select className="select-active" defaultValue="1">
                      <option value="1">10</option>
                      <option value="2">20</option>
                      <option value="3">30</option>
                      <option value="4">40</option>
                      <option value="5">50</option>
                    </select>
                  </div>
                  <div className="select-box-dark">
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Risk Tolerance Profile</label>
                    <select className="select-active" defaultValue="1">
                      <option value="1">Balanced</option>
                      <option value="2">Conservative</option>
                      <option value="3">Moderately</option>
                      <option value="4">Moderately</option>
                      <option value="5">Aggressive</option>
                    </select>
                  </div>
                  <div className="select-box-dark">
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Asset Allocation Strategy</label>
                    <select className="select-active" defaultValue="1">
                      <option value="1">Diversified Growth</option>
                      <option value="2">Income Focused</option>
                      <option value="3">Balanced Allocation</option>
                      <option value="4">Growth Oriented</option>
                      <option value="5">Diversified Growth</option>
                    </select>
                  </div>
                  <div>
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Expected Annual Return (%)</label>
                    <div className="tw:relative">
                      <input
                        className="tw:h-10 tw:w-full tw:bg-black/5 tw:border tw:border-black/10 tw:backdrop-blur-[34px] tw:rounded-[100px] tw:cursor-pointer tw:text-base tw:font-semibold tw:text-title_white tw:flex tw:items-center tw:relative tw:pl-5 tw:pr-9 tw:appearance-none tw:outline-none tw:duration-300 focus:tw:border-primary"
                        type="number"
                        defaultValue={7}
                      />
                      <span className="tw:text-base tw:font-semibold tw:text-title_white tw:absolute tw:top-1/2 tw:transform tw:-translate-1/2 tw:right-5">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Initial Principal Investment</label>
                    <div className="tw:relative">
                      <input
                        className="tw:h-10 tw:w-full tw:bg-black/5 tw:border tw:border-black/10 tw:backdrop-blur-[34px] tw:rounded-[100px] tw:cursor-pointer tw:text-base tw:font-semibold tw:text-title_white tw:flex tw:items-center tw:relative tw:pl-9 tw:pr-5 tw:appearance-none tw:outline-none tw:duration-300 focus:tw:border-primary"
                        type="number"
                        defaultValue={100000}
                      />
                      <span className="tw:text-base tw:font-semibold tw:text-title_white tw:absolute tw:top-1/2 tw:transform tw:-translate-1/2 tw:left-6.25">$</span>
                    </div>
                  </div>
                  <div>
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Recurring Monthly Deposit</label>
                    <div className="tw:relative">
                      <input
                        className="tw:h-10 tw:w-full tw:bg-black/5 tw:border tw:border-black/10 tw:backdrop-blur-[34px] tw:rounded-[100px] tw:cursor-pointer tw:text-base tw:font-semibold tw:text-title_white tw:flex tw:items-center tw:relative tw:pl-9 tw:pr-5 tw:appearance-none tw:outline-none tw:duration-300 focus:tw:border-primary"
                        type="number"
                        defaultValue={1000}
                      />
                      <span className="tw:text-base tw:font-semibold tw:text-title_white tw:absolute tw:top-1/2 tw:transform tw:-translate-1/2 tw:left-6.25">$</span>
                    </div>
                  </div>
                  <div className="select-box-dark">
                    <label className="tw:text-base tw:font-normal tw:leading-normal tw:text-title_white tw:mb-2 tw:block">Compound Frequency</label>
                    <select className="select-active" defaultValue="1">
                      <option value="1">Monthly</option>
                      <option value="2">Quarterly</option>
                      <option value="3">Semi-Annual</option>
                      <option value="4">Annual</option>
                      <option value="5">One-Time</option>
                    </select>
                  </div>
                  <div className="tw:flex tw:items-end">
                    <button className="button-primary tw:w-full tw:flex-1" type="submit">
                      Calculate results
                    </button>
                  </div>
                </form>
              </div>
              <div className="tw:md:max-w-227 tw:w-full tw:grid tw:gap-6">
                <div className="tw:p-5 tw:sm:p-6 tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-2xl tw:backdrop-blur-[34px] tw:text-center">
                  <h3 className="tw:text-title_white tw:font-bold tw:text-2xl tw:md:text-3xl tw:lg:text-4xl tw:leading-none">$374,051</h3>
                  <p className="tw:text-base tw:sm:text-lg tw:mt-3 tw:text-title_white tw:font-medium">Total Investment fund after 10 years</p>
                </div>
                <div className="tw:w-full tw:p-3 tw:sm:p-6 tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-2xl tw:backdrop-blur-[34px] tw:overflow-hidden">
                  <canvas id="investmentChart" />
                </div>
                <div className="tw:p-5 tw:sm:p-6 tw:bg-black/5 tw:border tw:border-black/10 tw:rounded-2xl tw:backdrop-blur-[34px] tw:flex tw:items-start tw:lg:items-center tw:justify-between tw:gap-4 tw:lg:gap-6 tw:flex-col tw:lg:flex-row">
                  <div className="tw:flex-1">
                    <p className="tw:text-title_white tw:text-lg tw:font-semibold">Get Started On Planning Your Finances</p>
                    <p className="tw:text-base tw:mt-3 tw:text-paragraph_white tw:max-w-154.25">Our AI-driven AdvisorMatch tool will help you find a certified specialist to plan your custom portfolio.</p>
                  </div>
                  <div className="tw:w-fit">
                    <a href="/contact" className="button-autline-white tw:w-fit">
                      Find an advisor
                      <svg className="tw:w-2.75 tw:h-2.75 tw:fill-current">
                        <use href="#buttonArrow" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3.6 FAQ — verbatim from security.php lines 85-127 + accordion.php + its JS behavior ===== */}
      <section id="faq" className="section-spacing-lg tw:bg-secondary">
        <div className="tw:container">
          <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:md:gap-10 tw:mb-12 tw:sm:mb-14 tw:md:mb-16 tw:lg:mb-20 tw:flex-col tw:md:flex-row tw:max-w-125 tw:md:max-w-full">
            <div className="tw:md:max-w-170 tw:w-full">
              <div className="tw:flex tw:items-center tw:gap-2.5">
                <img className="rotate" src={`${S}/img/title-icon-primary.svg`} alt="title-icon" />
                <span className="tw:text-base tw:lg:text-lg tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:uppercase">ENGINEERED FOR EXCELLENCE</span>
              </div>
              <h2 className="tw:text-3xl tw:md:text-4xl tw:lg:text-[40px] tw:xl:text-5xl tw:font-bold tw:leading-tight tw:text-title_white tw:mt-4">Technology Stack We Use and Can Provide</h2>
            </div>
            <p className="tw:md:max-w-115 tw:w-full tw:text-base tw:sm:text-lg tw:text-paragraph_white">
              Empower your financial future with a high-performance technology stack that aligns with the global digital economy.
            </p>
          </div>
          <div>
            <div className="tw:items-start tw:gap-6 tw:grid tw:md:grid-cols-2 tw:grid-cols-1">
              <div className="md:tw:max-w-151.75 tw:w-full next-gen-accordion-wrapper excellence-accordion-wrapper tw:flex tw:flex-col tw:gap-4 tw:md:gap-6 tw:lg:gap-9">
                <SecureVestAccordion activeIndex={accordionActive} onSelect={setAccordionActive} />
              </div>
              <div className="tw:md:max-w-125 tw:ml-auto tw:w-full tw:h-full tw:max-h-142.5 tw:hidden tw:md:block">
                <div className="next-gen-image-wrapper tw:relative tw:overflow-hidden tw:w-full tw:h-full">
                  <div className="next-gen-image-container tw:relative tw:flex tw:items-start tw:justify-center tw:h-full tw:w-full">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <img
                        key={n}
                        className={`next-gen-image tw:max-h-full${n - 1 === accordionActive ? ' active' : ''}`}
                        src={`${S}/img/excellence-accordion/excellence-acordion-thumb-0${n}.webp`}
                        alt={`excellence-accordion-thumb-0${n}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact — kept on the landing page at the user's request even though it isn't one of the brief's listed sections; not sourced from SecureVest */}
      <section id="contact" className="tw:bg-[#080808] tw:py-5">
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
                Have a question about a deposit or a withdrawal? Send us a message and our team will get back to you. Already have an account? You can also open a ticket from your dashboard&apos;s
                Support Center for the fastest response.
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
