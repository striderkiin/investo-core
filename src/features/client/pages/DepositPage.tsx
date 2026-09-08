import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createDepositService } from '../../../services/api/depositService';
import { getSupabaseClient } from '../../../services/supabase/client';
import { mapDepositRow } from '../../../services/supabase/mappers';
import type { DepositRow } from '../../../services/supabase/mappers';
import type { Deposit } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const depositService = createDepositService();
const CURRENCIES = ['BTC', 'ETH', 'USDT'];
const NETWORKS: Record<string, string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['Ethereum (ERC-20)'],
  USDT: ['Ethereum (ERC-20)', 'Tron (TRC-20)'],
};

const STATUS_VARIANT: Record<Deposit['status'], string> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  rejected: 'danger',
};

export function DepositPage() {
  const { profile, refreshProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USDT');
  const [network, setNetwork] = useState(NETWORKS.USDT[0]);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<{ address: string; qrCodeData: string; deposit: Deposit } | null>(null);

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await depositService.listMine(profile.id);
      setDeposits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Watch the active deposit session for the demo provider's simulated webhook confirmation.
  useEffect(() => {
    if (!session) return;
    const client = getSupabaseClient();
    const channel = client
      .channel(`deposit:${session.deposit.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deposits', filter: `id=eq.${session.deposit.id}` },
        (payload) => {
          const updated = mapDepositRow(payload.new as DepositRow);
          setSession((current) => (current ? { ...current, deposit: updated } : current));
          if (updated.status === 'completed') {
            showSuccess(`Deposit of ${updated.amount} ${updated.currency} confirmed!`);
            void load();
            void refreshProfile();
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.deposit.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showError('Enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await depositService.createDeposit({ userId: profile.id, amount: parsedAmount, currency, network });
      setSession({ address: result.address ?? '', qrCodeData: result.qrCodeData ?? '', deposit: result.deposit });
      showSuccess('Deposit session created. Send funds to the address below.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create deposit');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading deposits..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Deposit Funds</h2>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card ic-card">
            <div className="card-body">
              {session ? (
                <div className="text-center">
                  <span className={`badge text-bg-${STATUS_VARIANT[session.deposit.status]} text-capitalize mb-3`}>
                    {session.deposit.status}
                  </span>
                  <div className="border rounded p-3 mb-3 bg-light">
                    <i className="bi bi-qr-code" style={{ fontSize: '6rem' }} aria-hidden="true" />
                    <p className="small text-secondary mb-0 text-break">{session.qrCodeData}</p>
                  </div>
                  <p className="mb-1 small text-secondary">Send exactly</p>
                  <p className="fs-4 fw-bold">
                    {session.deposit.amount} {session.deposit.currency}
                  </p>
                  <p className="small text-secondary mb-1">to address</p>
                  <p className="text-break small bg-light p-2 rounded">{session.address}</p>
                  <p className="small text-secondary mb-0">Network: {session.deposit.network}</p>
                  {session.deposit.status === 'pending' && (
                    <div className="mt-3 d-flex align-items-center justify-content-center gap-2 text-secondary small">
                      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                      Waiting for confirmation…
                    </div>
                  )}
                  <button type="button" className="btn btn-outline-secondary btn-sm mt-3" onClick={() => setSession(null)}>
                    New Deposit
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="currency" className="form-label">
                      Currency
                    </label>
                    <select
                      id="currency"
                      className="form-select"
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        setNetwork(NETWORKS[e.target.value][0]);
                      }}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="network" className="form-label">
                      Network
                    </label>
                    <select id="network" className="form-select" value={network} onChange={(e) => setNetwork(e.target.value)}>
                      {NETWORKS[currency].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
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
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating session…' : 'Get Deposit Address'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <h3 className="h6">Deposit History</h3>
          {deposits.length === 0 ? (
            <EmptyState icon="bi-arrow-down-circle" title="No deposits yet" message="Your deposit history will appear here." />
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Network</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td>{new Date(deposit.createdAt).toLocaleString()}</td>
                      <td>
                        {deposit.amount} {deposit.currency}
                      </td>
                      <td>{deposit.network}</td>
                      <td>
                        <span className={`badge text-bg-${STATUS_VARIANT[deposit.status]} text-capitalize`}>{deposit.status}</span>
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
