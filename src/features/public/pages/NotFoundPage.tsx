import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 min-vh-100">
      <i className="bi bi-signpost-split fs-1 text-secondary mb-3" aria-hidden="true" />
      <h1 className="h3">Page not found</h1>
      <p className="text-secondary mb-4">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className="btn btn-primary">
        Go Home
      </Link>
    </div>
  );
}
