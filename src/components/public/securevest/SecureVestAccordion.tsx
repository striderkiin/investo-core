/* Structure verbatim from Base/Components/AllPages/security/accordion.php; content
   replaced with Investo's real FAQ per the step-3 content pass. */
const ITEMS = [
  {
    title: 'How do I get started?',
    desc: 'Create an account with your name, email, and password, then confirm your email from the link we send you. From there you can fund your account and choose a plan; there is no separate identity verification step required to sign up.',
  },
  {
    title: 'How are investment plan rates determined?',
    desc: 'Every plan has a fixed rate, rate type (daily, weekly, or monthly), duration, and deposit range that we set and publish up front. Once you invest, that rate and duration are locked in for the life of your investment, even if the plan changes later.',
  },
  {
    title: 'How long do deposits take to confirm?',
    desc: 'Deposits are held as pending until confirmed on the backend, which depends on network and provider conditions rather than a fixed schedule. You can track the live status of any deposit from your dashboard at any time.',
  },
  {
    title: 'How do withdrawals work?',
    desc: 'Submit a withdrawal request with an amount and destination, and it is checked against your available balance and the platform&apos;s withdrawal limits. Our team reviews every withdrawal before it is approved and paid out.',
  },
  {
    title: 'Is there a referral program?',
    desc: 'Yes, every account gets its own referral code and link to share. When someone you refer joins and becomes active, a referral reward is credited to your account, and you can track your referrals and earnings from your dashboard.',
  },
  {
    title: 'How is my account secured?',
    desc: 'Your account supports two-factor authentication via an authenticator app, and you can view and sign out of your active sessions individually or all at once. Every balance-affecting action is logged and validated server-side, never left to the browser.',
  },
];

/**
 * The source (assets/js/main.js) drives this with GSAP: click-to-select,
 * a 5s auto-rotate that pauses on hover, and a crossfading thumbnail image
 * synced to the active index. Reimplemented here with plain state — same
 * click/active behavior, without pulling in GSAP for one interaction.
 * Only one item is open at a time, and tapping the open item toggles it
 * closed (unlike the source, which always kept exactly one open).
 */
export function SecureVestAccordion({ activeIndex, onSelect }: { activeIndex: number | null; onSelect: (index: number | null) => void }) {
  return (
    <>
      {ITEMS.map((item, index) => {
        const active = index === activeIndex;
        const toggle = () => onSelect(active ? null : index);
        return (
          <div className={`next-gen-item${active ? ' active' : ''}`} data-index={index} key={item.title}>
            <div
              className="next-gen-header tw:cursor-pointer tw:flex tw:justify-between tw:items-center tw:gap-4"
              onClick={toggle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
              <div className="tw:flex tw:items-start tw:gap-4 tw:md:gap-6 tw:lg:gap-9">
                <span className="next-gen-number tw:text-lg tw:font-semibold tw:leading-normal tw:text-paragraph_white tw:duration-300">{String(index + 1).padStart(2, '0')}</span>
                <div className="tw:flex-1">
                  <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:mb-2 tw:md:mb-3">
                    <h3 className="tw:text-xl tw:md:text-2xl tw:font-semibold tw:text-title_white tw:flex-1">{item.title}</h3>
                    <button type="button" aria-label="Toggle section" className="excellence-accordion-toogle tw:w-4.75 tw:h-2.25">
                      <svg className="tw:w-4.75 tw:h-2.25 tw:fill-none tw:text-primary">
                        <use href="#excellence-accortion-arrow" />
                      </svg>
                    </button>
                  </div>
                  <p className="next-gen-description tw:text-base tw:text-paragraph_white">{item.desc}</p>
                </div>
              </div>
            </div>
            <div className="next-gen-progress tw:relative tw:h-px tw:mt-4 tw:overflow-hidden tw:bg-black/10">
              <div className="next-gen-progress-line tw:absolute tw:top-0 tw:left-0 tw:h-full tw:bg-primary" style={{ width: active ? '100%' : '0%' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}
