import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { AuthCard } from '../../../components/public/AuthCard';

export function RegisterPage() {
  const { register, session, isConfigured } = useAuth();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (registered) {
    return (
      <AuthCard>
        <div className="text-center">
          <i className="bi bi-envelope-check fs-1 mb-3" style={{ color: 'var(--pub-glow)' }} aria-hidden="true" />
          <h1 className="h5">Check your email</h1>
          <p className="mb-0">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Verify your email to finish setting up
            your account, then log in.
          </p>
          <Link to="/login" className="btn btn-primary mt-4">
            Go to Log In
          </Link>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email, password, fullName, referralCode: referralCode || undefined });
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Start investing today.">
      {!isConfigured && (
          <div className="alert alert-warning" role="alert">
            Supabase is not configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file to enable registration.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              className="form-control"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
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
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="referralCode" className="form-label">
              Referral code <span className="text-secondary">(optional)</span>
            </label>
            <input
              id="referralCode"
              type="text"
              className="form-control"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || !isConfigured}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

      <p className="text-center text-secondary mt-4 mb-0">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthCard>
  );
}
