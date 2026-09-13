import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { createWithdrawalService } from '../../../services/api/withdrawalService';
import { formatCurrency } from '../../../lib/format';
import type { Withdrawal } from '../../../types/database';

const withdrawalService = createWithdrawalService();

const CURRENCIES = ['BTC', 'ETH', 'USDT'] as const;
const NETWORKS: Record<(typeof CURRENCIES)[number], string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['ERC20'],
  USDT: ['ERC20', 'TRC20'],
};

export function WithdrawPage() {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USDT');
  const [network, setNetwork] = useState(NETWORKS.USDT[0]);
  const [destination, setDestination] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Withdrawal | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (profile && parsedAmount > profile.availableBalance) {
      setError('That amount is more than your available balance.');
      return;
    }
    if (!destination.trim()) {
      setError('Enter a destination address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const withdrawal = await withdrawalService.request({
        amount: parsedAmount,
        currency,
        network,
        destination: destination.trim(),
      });
      setResult(withdrawal);
      void refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit withdrawal request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startOver() {
    setResult(null);
    setAmount('');
    setDestination('');
  }

  return (
    <div className="container py-5 position-relative" style={{ maxWidth: 480 }}>
      <div
        className="ic-public-glow"
        style={{ width: 360, height: 360, top: -40, left: '50%', transform: 'translateX(-50%)', background: 'var(--pub-accent)' }}
      />
      <div className="ic-public-card p-4 position-relative">
        <h1 className="h4 mb-1">Withdraw Funds</h1>
        <p className="mb-1">Available balance: {profile ? formatCurrency(profile.availableBalance) : '...'}</p>
        <p className="mb-4">Withdrawals are reviewed before funds are released.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!result ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="amount" className="form-label">
                Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="currency" className="form-label">
                Currency
              </label>
              <select
                id="currency"
                className="form-select"
                value={currency}
                onChange={(e) => {
                  const next = e.target.value as (typeof CURRENCIES)[number];
                  setCurrency(next);
                  setNetwork(NETWORKS[next][0]);
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
            <div className="mb-4">
              <label htmlFor="destination" className="form-label">
                Destination address
              </label>
              <input
                id="destination"
                type="text"
                className="form-control"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <button type="submit" className="btn ic-public-btn-primary w-100" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Request Withdrawal'}
            </button>
          </form>
        ) : (
          <div>
            <div className="alert alert-info" role="status">
              Your withdrawal request for {formatCurrency(result.amount)} {result.currency} has been submitted. Status:{' '}
              <strong className="text-capitalize">{result.status}</strong>.
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn ic-public-btn-primary flex-grow-1" onClick={startOver}>
                Request Another
              </button>
              <a href="/client-app/transaction.html" className="btn ic-public-btn-outline">
                View Transactions
              </a>
            </div>
          </div>
        )}

        <p className="text-center mt-4 mb-0">
          <a href="/client-app/index.html">Back to dashboard</a>
        </p>
      </div>
    </div>
  );
}
