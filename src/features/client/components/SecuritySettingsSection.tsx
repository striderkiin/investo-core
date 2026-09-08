import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createSecurityService } from '../../../services/api/securityService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { EmptyState } from '../../../components/common/EmptyState';

const securityService = createSecurityService();

interface EnrollState {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function SecuritySettingsSection() {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [factors, setFactors] = useState<{ id: string; status: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollState, setEnrollState] = useState<EnrollState | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState<number | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const list = await securityService.listMfaFactors();
      setFactors(list.map((f) => ({ id: f.id, status: f.status })));
    } catch {
      setFactors([]);
    }
    if (profile) {
      try {
        const sessions = await securityService.listMySessions(profile.id);
        setSessionCount(sessions.length);
      } catch {
        setSessionCount(null);
      }
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function handleStartEnroll() {
    try {
      const data = await securityService.enrollMfa();
      setEnrollState({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start 2FA enrollment');
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!enrollState || verifyCode.trim().length !== 6) {
      showError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setIsSubmitting(true);
    try {
      await securityService.verifyMfaEnrollment(enrollState.factorId, verifyCode.trim());
      showSuccess('Two-factor authentication enabled.');
      setEnrollState(null);
      setVerifyCode('');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Invalid code — try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisable(factorId: string) {
    if (!window.confirm('Disable two-factor authentication?')) return;
    try {
      await securityService.unenrollMfa(factorId);
      showSuccess('Two-factor authentication disabled.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  }

  async function handleTerminateOthers() {
    if (!window.confirm('Log out of all other devices/sessions?')) return;
    try {
      await securityService.terminateOtherSessions();
      showSuccess('All other sessions have been signed out.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to terminate sessions');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading security settings..." />;

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Two-Factor Authentication</h3>
          {verifiedFactor ? (
            <div className="d-flex justify-content-between align-items-center">
              <span className="badge text-bg-success">
                <i className="bi bi-shield-check me-1" aria-hidden="true" />
                Enabled
              </span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDisable(verifiedFactor.id)}>
                Disable 2FA
              </button>
            </div>
          ) : enrollState ? (
            <form onSubmit={handleVerify} noValidate>
              <p className="small text-secondary">Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.):</p>
              {enrollState.qrCode && (
                <img
                  src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollState.qrCode)}`}
                  alt="Two-factor authentication QR code"
                  className="mb-2"
                  style={{ maxWidth: 200 }}
                />
              )}
              <p className="small">
                Can&apos;t scan? Enter this key manually: <code>{enrollState.secret}</code>
              </p>
              <div className="mb-3">
                <label htmlFor="verifyCode" className="form-label">
                  6-digit code
                </label>
                <input
                  id="verifyCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="form-control"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Verifying…' : 'Verify & Enable'}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEnrollState(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="d-flex justify-content-between align-items-center">
              <span className="badge text-bg-secondary">
                <i className="bi bi-shield-slash me-1" aria-hidden="true" />
                Disabled
              </span>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleStartEnroll}>
                Enable 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Active Sessions</h3>
          {sessionCount === null ? (
            <EmptyState icon="bi-display" title="Session data unavailable" />
          ) : (
            <>
              <p className="text-secondary small">You have {sessionCount} tracked session{sessionCount === 1 ? '' : 's'} on this account.</p>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleTerminateOthers}>
                Terminate All Other Sessions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
