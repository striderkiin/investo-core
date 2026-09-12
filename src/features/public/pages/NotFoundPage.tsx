import { Link } from 'react-router-dom';
import { HeroVisual } from '../../../components/public/HeroVisual';

/** Verbatim structure from 404.php, recolored + recontented per the brief §3.7. */
export function NotFoundPage() {
  return (
    <div className="sv-page">
      <div className="tw:py-15 md:tw:py-25 lg:tw:py-42.25 tw:bg-[#0a0a0a]">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:max-w-80 sm:tw:max-w-110 md:tw:max-w-155.5 tw:max-h-76.5 tw:mx-auto tw:text-center">
            <HeroVisual />
          </div>
          <div className="tw:mt-6 md:tw:mt-10 lg:tw:mt-12.5 tw:text-center">
            <h1 className="tw:text-4xl sm:tw:text-[40px] md:tw:text-5xl lg:tw:text-[52px] xl:tw:text-[64px] tw:font-bold tw:text-title_black">Page Not Found!</h1>
            <div className="tw:flex tw:items-center tw:justify-center">
              <Link to="/" className="button-primary tw:mt-6">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
