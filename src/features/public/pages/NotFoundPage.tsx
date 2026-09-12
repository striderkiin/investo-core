import { Link } from 'react-router-dom';

const S = '/securevest';

/** Verbatim from 404.php in full. */
export function NotFoundPage() {
  return (
    <div className="sv-page">
      <div className="tw:py-15 tw:md:py-25 tw:lg:py-42.25">
        <div className="tw:container">
          <div>
            <div className="tw:max-w-80 tw:sm:max-w-110 tw:md:max-w-155.5 tw:max-h-76.5 tw:mx-auto tw:text-center">
              <img src={`${S}/img/404.svg`} alt="SecureVest illustration" />
            </div>
            <div className="tw:mt-6 tw:md:mt-10 tw:lg:mt-12.5 tw:text-center">
              <h1 className="tw:text-4xl tw:sm:text-[40px] tw:md:text-5xl tw:lg:text-[52px] tw:xl:text-[64px] tw:font-bold">Page Not Found!</h1>
              <div className="tw:flex tw:items-center tw:justify-center">
                <Link to="/" className="button-primary tw:mt-6">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
