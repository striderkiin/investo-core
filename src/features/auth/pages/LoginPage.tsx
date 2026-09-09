import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { isAdminRole } from '../../../types/roles';
import { AuthCard } from '../../../components/public/AuthCard';

export function LoginPage() {
  const { login, session, profile, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session && profile) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? (isAdminRole(profile.role) ? '/admin' : '/dashboard');
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your account.">
      {!isConfigured && (
          <div className="alert alert-warning" role="alert">
            Supabase is not configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file to enable authentication.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <Link to="/forgot-password" className="small">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="form-control"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || !isConfigured}>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>

      <p className="text-center text-secondary mt-4 mb-0">
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthCard>
  );
}
