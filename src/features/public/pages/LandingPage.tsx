import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: 'bi-graph-up-arrow', title: 'Live Market Data', text: 'Track portfolio performance with real-time charts.' },
  { icon: 'bi-shield-check', title: 'Secure by Design', text: 'Role-based access, audit logging, and server-side validation.' },
  { icon: 'bi-people', title: 'Referral Program', text: 'Earn rewards by inviting new investors to the platform.' },
  { icon: 'bi-piggy-bank', title: 'Flexible Plans', text: 'Choose from Starter, Growth, Professional, and Elite plans.' },
];

export function LandingPage() {
  return (
    <>
      <section className="bg-white border-bottom">
        <div className="container py-5 text-center">
          <span className="badge text-bg-primary-subtle text-primary mb-3">White-Label Investment Platform</span>
          <h1 className="display-5 fw-bold mb-3">Invest with confidence</h1>
          <p className="lead text-secondary mb-4 mx-auto" style={{ maxWidth: 640 }}>
            Investo Core Suite gives you a complete platform to manage deposits, withdrawals, investments, and
            referrals — all in one secure dashboard.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-outline-secondary btn-lg">
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4">
          {FEATURES.map((feature) => (
            <div className="col-12 col-md-6 col-lg-3" key={feature.title}>
              <div className="card ic-card h-100 p-4 text-center">
                <i className={`bi ${feature.icon} fs-1 text-primary mb-3`} aria-hidden="true" />
                <h2 className="h6">{feature.title}</h2>
                <p className="text-secondary small mb-0">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
