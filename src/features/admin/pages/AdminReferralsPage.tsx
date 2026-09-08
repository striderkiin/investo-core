import { useEffect, useState } from 'react';
import { createReferralService } from '../../../services/api/referralService';
import type { Profile } from '../../../types/database';
import { MetricCard } from '../../../components/common/MetricCard';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { ReferralTreeNode } from '../components/ReferralTreeNode';

const referralService = createReferralService();

interface Analytics {
  totalReferrals: number;
  activeReferrers: number;
  referralEarnings: number;
  topReferrers: { user: Profile; referralCount: number }[];
}

export function AdminReferralsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setAnalytics(await referralService.getAdminAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral analytics');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingScreen label="Loading referral analytics..." />;
  if (error || !analytics) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  const conversionRate = analytics.activeReferrers > 0 ? analytics.totalReferrals / analytics.activeReferrers : 0;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Referral Analytics</h2>

      <div className="row g-3">
        <div className="col-6 col-lg-3">
          <MetricCard label="Total Referrals" value={analytics.totalReferrals} icon="bi-diagram-3" prefix="" decimals={0} variant="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Active Referrers" value={analytics.activeReferrers} icon="bi-people" prefix="" decimals={0} variant="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Referral Earnings" value={analytics.referralEarnings} icon="bi-gift" variant="success" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Avg. Referrals / Referrer" value={conversionRate} icon="bi-graph-up" prefix="" decimals={1} variant="secondary" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Top Referrers</h3>
              {analytics.topReferrers.length === 0 ? (
                <EmptyState icon="bi-trophy" title="No referrers yet" />
              ) : (
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Referrals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topReferrers.map(({ user, referralCount }) => (
                      <tr key={user.id}>
                        <td>{user.fullName || user.email}</td>
                        <td>{referralCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Referral Tree</h3>
              <p className="text-secondary small">Expand each top referrer to explore their downline.</p>
              {analytics.topReferrers.length === 0 ? (
                <EmptyState icon="bi-diagram-3" title="No referral tree yet" />
              ) : (
                <div>
                  {analytics.topReferrers.map(({ user }) => (
                    <ReferralTreeNode
                      key={user.id}
                      user={{
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        investedBalance: user.investedBalance,
                        totalBalance: user.totalBalance,
                        joinedAt: user.createdAt,
                      }}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
