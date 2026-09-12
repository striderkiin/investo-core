import { useEffect, useRef, useState } from 'react';

export interface AccordionFaqItem {
  question: string;
  answer: string;
}

const AUTO_ROTATE_MS = 5000;

/**
 * Behavioral port of SecureVest's "next-gen" accordion (assets/js/main.js,
 * the next-gen-accordion-wrapper block): click a header to open it, only
 * one item open at a time, a progress bar under the active item fills over
 * AUTO_ROTATE_MS and then advances to the next item, and hovering the
 * wrapper pauses the auto-rotate. The source drives this with GSAP and an
 * image crossfade; we drop the image column per the brief (no FAQ image
 * content exists for Investo) so this reimplements the same open/close +
 * timer behavior with plain state and CSS transitions instead of pulling
 * in GSAP for one interaction.
 */
export function SecureVestAccordion({ items }: { items: AccordionFaqItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return undefined;
    timeoutRef.current = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % items.length);
      setProgressKey((k) => k + 1);
    }, AUTO_ROTATE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeIndex, paused, items.length]);

  function handleSelect(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setProgressKey((k) => k + 1);
  }

  return (
    <div
      className="next-gen-accordion-wrapper excellence-accordion-wrapper tw:flex tw:flex-col tw:gap-4 md:tw:gap-6 lg:tw:gap-9"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <div className={`next-gen-item${active ? ' active' : ''}`} data-index={index} key={item.question}>
            <div
              className="next-gen-header tw:cursor-pointer tw:flex tw:justify-between tw:items-center tw:gap-4"
              onClick={() => handleSelect(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(index);
                }
              }}
            >
              <div className="tw:flex tw:items-start tw:gap-4 md:tw:gap-6 lg:tw:gap-9">
                <span className="next-gen-number tw:text-lg tw:font-semibold tw:leading-normal tw:text-paragraph_white">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="tw:flex-1">
                  <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:mb-2 md:tw:mb-3">
                    <h3 className="tw:text-xl md:tw:text-2xl tw:font-semibold tw:text-title_white tw:flex-1">{item.question}</h3>
                    <button type="button" aria-label="Toggle answer" className="excellence-accordion-toogle tw:w-[19px] tw:h-[9px]">
                      <svg className="tw:w-[19px] tw:h-[9px] tw:fill-none tw:text-primary" viewBox="0 0 19 9" aria-hidden="true">
                        <path d="M1 1l8.5 7L18 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <p className="next-gen-description tw:text-base tw:text-paragraph_white">{item.answer}</p>
                </div>
              </div>
            </div>
            <div className="next-gen-progress tw:relative tw:h-px tw:mt-4 tw:overflow-hidden tw:bg-white/10">
              {active && (
                <div
                  key={progressKey}
                  className="next-gen-progress-line tw:absolute tw:top-0 tw:left-0 tw:h-full tw:bg-primary"
                  style={{ animation: paused ? 'none' : `sv-accordion-progress ${AUTO_ROTATE_MS}ms linear forwards` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
