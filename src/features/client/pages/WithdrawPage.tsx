import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createWithdrawalService } from '../../../services/api/withdrawalService';
import type { Withdrawal } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const withdrawalService = createWithdrawalService();

const STATUS_VARIANT: Record<Withdrawal['status'], string> = {
  pending: 'warning',
  review: 'info',
  processing: 'info',
  completed: 'success',
  rejected: 'danger',
  failed: 'danger',
};

const RESTRICTED_STATUSES = new Set(['suspended', 'frozen', 'withdrawal_freeze']);

export function WithdrawPage() {
  const { profile, refreshProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDT');
  const [network, setNetwork] = useState('Tron (TRC-20)');
  const [destination, setDestination] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isRestricted = profile ? RESTRICTED_STATUSES.has(profile.accountStatus) : false;

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await withdrawalService.listMine(profile.id);
      setWithdrawals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (!destination.trim()) {
      setFormError('Enter a destination address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await withdrawalService.request({ amount: parsedAmount, currency, network, destination });
      showSuccess('Withdrawal request submitted.');
      setAmount('');
      setDestination('');
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit withdrawal';
      setFormError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading withdrawals..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Withdraw Funds</h2>

      {isRestricted && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          Withdrawals are currently unavailable for your account ({profile?.accountStatus.replace('_', ' ')}). Contact
          support if you believe this is an error.
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card ic-card">
            <div className="card-body">
              <p className="text-secondary small mb-3">
                Available balance: <strong>${profile?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </p>
              <form onSubmit={handleSubmit} noValidate>
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="currency" className="form-label">
                    Currency
                  </label>
                  <select id="currency" className="form-select" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isRestricted}>
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="network" className="form-label">
                    Network
                  </label>
                  <input id="network" type="text" className="form-control" value={network} onChange={(e) => setNetwork(e.target.value)} disabled={isRestricted} />
                </div>
                <div className="mb-3">
                  <label htmlFor="destination" className="form-label">
                    Destination Address
                  </label>
                  <input
                    id="destination"
                    type="text"
                    className="form-control"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={isRestricted}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="amount" className="form-label">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    className="form-control"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isRestricted}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || isRestricted}>
                  {isSubmitting ? 'Submitting…' : 'Request Withdrawal'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <h3 className="h6">Withdrawal History</h3>
          {withdrawals.length === 0 ? (
            <EmptyState icon="bi-arrow-up-circle" title="No withdrawals yet" message="Your withdrawal history will appear here." />
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Destination</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id}>
                      <td>{new Date(withdrawal.createdAt).toLocaleString()}</td>
                      <td>
                        {withdrawal.amount} {withdrawal.currency}
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 160 }}>
                        {withdrawal.destination}
                      </td>
                      <td>
                        <span className={`badge text-bg-${STATUS_VARIANT[withdrawal.status]} text-capitalize`}>{withdrawal.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
