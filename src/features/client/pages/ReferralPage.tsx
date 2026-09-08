import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createReferralService } from '../../../services/api/referralService';
import type { ReferredUserSummary } from '../../../services/api/referralService';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { MetricCard } from '../../../components/common/MetricCard';

const referralService = createReferralService();

export function ReferralPage() {
  const { profile } = useAuth();
  const { showSuccess } = useToast();
  const [referrals, setReferrals] = useState<ReferredUserSummary[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const referralLink = profile ? `${window.location.origin}/register?ref=${profile.referralCode}` : '';

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const [users, totalEarnings] = await Promise.all([
        referralService.getReferredUsers(profile.id),
        referralService.getTotalEarnings(profile.id),
      ]);
      setReferrals(users);
      setEarnings(totalEarnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    showSuccess('Referral link copied to clipboard.');
  }

  if (isLoading) return <LoadingScreen label="Loading referral data..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Referral Program</h2>

      <div className="card ic-card">
        <div className="card-body">
          <p className="text-secondary small mb-2">Your referral code</p>
          <p className="fs-3 fw-bold mb-3">{profile?.referralCode}</p>
          <div className="input-group">
            <input type="text" className="form-control" readOnly value={referralLink} aria-label="Referral link" />
            <button type="button" className="btn btn-primary" onClick={copyLink}>
              <i className="bi bi-clipboard me-1" aria-hidden="true" />
              Copy Link
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-6 col-md-4">
          <MetricCard label="Direct Referrals" value={referrals.length} icon="bi-people" prefix="" decimals={0} variant="primary" />
        </div>
        <div className="col-6 col-md-4">
          <MetricCard label="Referral Earnings" value={earnings} icon="bi-gift" variant="success" />
        </div>
      </div>

      <div>
        <h3 className="h6">Your Referrals</h3>
        {referrals.length === 0 ? (
          <EmptyState icon="bi-people" title="No referrals yet" message="Share your link to start earning referral bonuses." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Invested</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName || user.email}</td>
                    <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                    <td>${user.investedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
