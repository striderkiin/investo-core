import { Link } from 'react-router-dom';

/* Structure verbatim from 404.php; the illustration is replaced with a small
   gold-linework graphic echoing the hero's circle-and-underline motif
   instead of SecureVest's own teal sad-face artwork. */
export function NotFoundPage() {
  return (
    <div className="sv-page">
      <div className="tw:py-15 tw:md:py-25 tw:lg:py-42.25">
        <div className="tw:container">
          <div>
            <div className="tw:max-w-80 tw:sm:max-w-110 tw:md:max-w-155.5 tw:max-h-76.5 tw:mx-auto tw:text-center">
              <svg viewBox="0 0 320 200" className="tw:w-full tw:h-auto" fill="none" role="img" aria-label="404, page not found">
                <circle cx="160" cy="88" r="72" className="tw:text-primary" stroke="currentColor" strokeWidth="1.5" />
                <text x="160" y="106" textAnchor="middle" fontSize="56" fontWeight="700" className="tw:fill-title_black" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  404
                </text>
                <path d="M50 172C110 148 210 148 270 172" className="tw:text-primary" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="tw:mt-6 tw:md:mt-10 tw:lg:mt-12.5 tw:text-center">
              <h1 className="tw:text-2xl tw:sm:text-3xl tw:md:text-4xl tw:lg:text-5xl tw:font-bold">Page Not Found!</h1>
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
