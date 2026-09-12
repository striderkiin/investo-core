/** Verbatim content/structure from Base/Components/AllPages/security/accordion.php (5 items). */
const ITEMS = [
  {
    title: 'Cloud Infrastructure',
    desc: 'Our platform operates on a resilient, multi-regional cloud network, ensuring 99.9% uptime and lightning-fast transaction processing for users worldwide.',
  },
  {
    title: 'Blockchain Integration',
    desc: 'Send and receive money across borders instantly, without the high fees and long wait times. Experience truly global financial freedom.',
  },
  {
    title: 'Real-time Monitoring Systems',
    desc: 'Set smart contracts and automated spending rules. Control your finances with programmable money that works exactly how you want it to, when you want it to.',
  },
  {
    title: 'Open Banking APIs',
    desc: 'Experience the stability of traditional currency with the flexibility of digital assets. Our stablecoin maintains a consistent value, making it perfect for everyday transactions and long-term savings.',
  },
  {
    title: 'AI Machine Learning Capabilities',
    desc: 'Experience the stability of traditional currency with the flexibility of digital assets. Our stablecoin maintains a consistent value, making it perfect for everyday transactions and long-term savings.',
  },
];

/**
 * The source (assets/js/main.js) drives this with GSAP: click-to-select,
 * a 5s auto-rotate that pauses on hover, and a crossfading thumbnail image
 * synced to the active index. Reimplemented here with plain state — same
 * click/active behavior, same active-index sync exposed to the parent for
 * the image column, without pulling in GSAP for one interaction.
 */
export function SecureVestAccordion({ activeIndex, onSelect }: { activeIndex: number; onSelect: (index: number) => void }) {
  return (
    <>
      {ITEMS.map((item, index) => {
        const active = index === activeIndex;
        return (
          <div className={`next-gen-item${active ? ' active' : ''}`} data-index={index} key={item.title}>
            <div
              className="next-gen-header tw:cursor-pointer tw:flex tw:justify-between tw:items-center tw:gap-4"
              onClick={() => onSelect(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(index);
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
