import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createAuthService } from '../../../services/auth/authService';
import { isSupabaseConfigured } from '../../../services/supabase/client';
import { AuthCard } from '../../../components/public/AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const isConfigured = isSupabaseConfigured();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const authService = createAuthService();
      await authService.requestPasswordReset(email, `${window.location.origin}/reset-password`);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to reset your password.">
      {!isConfigured && (
          <div className="alert alert-warning" role="alert">
            Supabase is not configured yet.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {sent ? (
          <div className="alert alert-success" role="status">
            If an account exists for {email}, a reset link is on its way.
          </div>
        ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || !isConfigured}>
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

      <p className="text-center text-secondary mt-4 mb-0">
        <Link to="/login">Back to log in</Link>
      </p>
    </AuthCard>
  );
}
