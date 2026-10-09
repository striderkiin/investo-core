import { ScrollReveal } from '../ScrollReveal';

/* Structure verbatim from Base/Components/AllPages/security/accordion.php. The
   questions come from the landing page content (Website > Landing page). */
export interface AccordionItem {
  title: string;
  desc: string;
}

/**
 * The source (assets/js/main.js) drives this with GSAP: click-to-select,
 * a 5s auto-rotate that pauses on hover, and a crossfading thumbnail image
 * synced to the active index. Reimplemented here with plain state — same
 * click/active behavior, without pulling in GSAP for one interaction.
 * Only one item is open at a time, and tapping the open item toggles it
 * closed (unlike the source, which always kept exactly one open).
 */
export function SecureVestAccordion({ items, activeIndex, onSelect }: { items: AccordionItem[]; activeIndex: number | null; onSelect: (index: number | null) => void }) {
  return (
    <>
      {items.map((item, index) => {
        const active = index === activeIndex;
        const toggle = () => onSelect(active ? null : index);
        return (
          <ScrollReveal className={`next-gen-item${active ? ' active' : ''}`} index={index} y={12} key={index}>
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
                <span className="next-gen-number tw:text-lg tw:font-semibold tw:leading-tight tw:text-paragraph_white tw:duration-300">{String(index + 1).padStart(2, '0')}</span>
                <div className="tw:flex-1">
                  <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:mb-2 tw:md:mb-3">
                    <h3 className="tw:text-lg tw:md:text-xl tw:font-semibold tw:leading-tight tw:m-0 tw:text-title_white tw:flex-1">{item.title}</h3>
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
          </ScrollReveal>
        );
      })}
    </>
  );
}
