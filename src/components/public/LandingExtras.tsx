import { ScrollReveal } from './ScrollReveal';
import { STEP_SLOTS, TEAM_SLOTS, TESTIMONIAL_SLOTS } from '../../features/siteContent/landingContent';

const S = '/securevest';

type Content = (key: string) => string;

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** The eyebrow + heading + side text block every landing section opens with. */
function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <ScrollReveal className="tw:flex tw:items-start tw:gap-4 tw:mb-12 tw:sm:mb-14 tw:md:mb-16 tw:flex-col tw:max-w-125 tw:md:max-w-170">
      <div className="tw:md:max-w-170 tw:w-full">
        <div className="tw:flex tw:items-center tw:gap-2.5">
          <img className="rotate" src={`${S}/img/title-icon-primary.svg`} alt="title-icon" />
          <span className="tw:text-xs tw:sm:text-sm tw:font-semibold tw:leading-[1.1]! tw:text-primary tw:uppercase tw:tracking-wide tw:block">{eyebrow}</span>
        </div>
        <h2 className="tw:text-2xl tw:sm:text-[28px] tw:md:text-3xl tw:lg:text-4xl tw:xl:text-[40px] tw:font-bold tw:leading-tight tw:text-title_black tw:mt-4! tw:md:mt-5!">{title}</h2>
      </div>
      {text && <p className="tw:md:max-w-115 tw:w-full tw:text-base tw:sm:text-lg tw:text-paragraph_black">{text}</p>}
    </ScrollReveal>
  );
}

/** A round photo, or the person's initials when no photo was uploaded. */
function Portrait({ src, name, size }: { src: string; name: string; size: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
  const style = { width: size, height: size };
  return src.trim() ? (
    <img src={src} alt={name} style={style} className="tw:rounded-full tw:object-cover tw:shrink-0" />
  ) : (
    <span style={{ ...style, fontSize: size / 2.8 }} className="tw:rounded-full tw:shrink-0 tw:flex tw:items-center tw:justify-center tw:font-semibold tw:bg-primary/15 tw:text-primary">
      {initials}
    </span>
  );
}

export function HowItWorks({ c }: { c: Content }) {
  const steps = range(STEP_SLOTS).filter((n) => c(`how.step${n}.title`).trim());
  if (steps.length === 0) return null;
  return (
    <section id="how-it-works" className="section-spacing-md-lg">
      <div className="tw:container">
        <SectionHeading eyebrow={c('how.eyebrow')} title={c('how.title')} text={c('how.text')} />
        <div className="tw:grid tw:md:grid-cols-3 tw:gap-5 tw:lg:gap-8">
          {steps.map((n, i) => (
            <ScrollReveal key={n} index={i} className="tw:border tw:border-border tw:rounded-2xl tw:p-6 tw:sm:p-8 tw:flex tw:flex-col tw:gap-5">
              <span className="tw:w-12 tw:h-12 tw:rounded-full tw:bg-primary tw:text-white tw:font-bold tw:text-lg tw:flex tw:items-center tw:justify-center">{i + 1}</span>
              <div>
                <h3 className="tw:text-lg tw:md:text-xl tw:font-semibold tw:text-title_black">{c(`how.step${n}.title`)}</h3>
                <p className="tw:mt-3 tw:text-base tw:text-paragraph_black">{c(`how.step${n}.text`)}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ c }: { c: Content }) {
  const items = range(TESTIMONIAL_SLOTS).filter((n) => c(`testimonials.item${n}.name`).trim() && c(`testimonials.item${n}.quote`).trim());
  if (c('testimonials.show') !== 'on' || items.length === 0) return null;
  return (
    <section id="testimonials" className="section-spacing-md-lg">
      <div className="tw:container">
        <SectionHeading eyebrow={c('testimonials.eyebrow')} title={c('testimonials.title')} />
        <div className="tw:grid tw:md:grid-cols-3 tw:gap-5 tw:lg:gap-8">
          {items.map((n, i) => {
            const name = c(`testimonials.item${n}.name`);
            return (
              <ScrollReveal key={n} index={i} className="tw:border tw:border-border tw:rounded-2xl tw:p-6 tw:sm:p-8 tw:flex tw:flex-col tw:justify-between tw:gap-8">
                <p className="tw:text-base tw:sm:text-lg tw:text-title_black tw:leading-relaxed">&ldquo;{c(`testimonials.item${n}.quote`)}&rdquo;</p>
                <div className="tw:flex tw:items-center tw:gap-4">
                  <Portrait src={c(`testimonials.item${n}.photo`)} name={name} size={52} />
                  <div>
                    <p className="tw:m-0! tw:font-semibold tw:text-title_black">{name}</p>
                    {c(`testimonials.item${n}.place`).trim() && <p className="tw:m-0! tw:text-sm tw:text-paragraph_black">{c(`testimonials.item${n}.place`)}</p>}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
        {c('testimonials.note').trim() && <p className="tw:mt-8! tw:text-sm tw:text-paragraph_black">{c('testimonials.note')}</p>}
      </div>
    </section>
  );
}

export function Team({ c }: { c: Content }) {
  const people = range(TEAM_SLOTS).filter((n) => c(`team.member${n}.name`).trim());
  if (c('team.show') !== 'on' || people.length === 0) return null;
  return (
    <section id="team" className="section-spacing-md-lg">
      <div className="tw:container">
        <SectionHeading eyebrow={c('team.eyebrow')} title={c('team.title')} text={c('team.text')} />
        <div className="tw:grid tw:grid-cols-2 tw:lg:grid-cols-4 tw:gap-5 tw:lg:gap-8">
          {people.map((n, i) => {
            const name = c(`team.member${n}.name`);
            return (
              <ScrollReveal key={n} index={i} className="tw:border tw:border-border tw:rounded-2xl tw:p-6 tw:flex tw:flex-col tw:items-center tw:text-center tw:gap-4">
                <Portrait src={c(`team.member${n}.photo`)} name={name} size={112} />
                <div>
                  <h3 className="tw:text-lg tw:font-semibold tw:text-title_black">{name}</h3>
                  {c(`team.member${n}.role`).trim() && <p className="tw:mt-1 tw:text-sm tw:text-paragraph_black">{c(`team.member${n}.role`)}</p>}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
