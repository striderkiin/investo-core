import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { createDepositService } from '../../../services/api/depositService';
import type { DepositSession } from '../../../services/payments/PaymentProvider';
import type { DepositStatus } from '../../../types/database';

const depositService = createDepositService();

const CURRENCIES = ['BTC', 'ETH', 'USDT'] as const;
const NETWORKS: Record<(typeof CURRENCIES)[number], string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['ERC20'],
  USDT: ['ERC20', 'TRC20'],
};

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES: DepositStatus[] = ['completed', 'failed', 'rejected'];

export function DepositPage() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USDT');
  const [network, setNetwork] = useState(NETWORKS.USDT[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<DepositSession | null>(null);
  const [status, setStatus] = useState<DepositStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const result = await depositService.createDeposit({
        userId: profile.id,
        amount: parsedAmount,
        currency,
        network,
      });
      setSession(result);
      setStatus(result.deposit.status);

      pollRef.current = setInterval(async () => {
        try {
          const latest = await depositService.getStatus(result.deposit.id);
          setStatus(latest);
          if (TERMINAL_STATUSES.includes(latest) && pollRef.current) {
            clearInterval(pollRef.current);
          }
        } catch {
          // Transient poll failure. The next tick will try again.
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyAddress() {
    if (!session?.address) return;
    try {
      await navigator.clipboard.writeText(session.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied. Nothing to fall back to.
    }
  }

  function startOver() {
    if (pollRef.current) clearInterval(pollRef.current);
    setSession(null);
    setStatus(null);
    setAmount('');
  }

  const isTerminal = status ? TERMINAL_STATUSES.includes(status) : false;

  return (
    <div className="container py-5 position-relative" style={{ maxWidth: 480 }}>
      <div
        className="ic-public-glow"
        style={{ width: 360, height: 360, top: -40, left: '50%', transform: 'translateX(-50%)', background: 'var(--pub-accent)' }}
      />
      <div className="ic-public-card p-4 position-relative">
        <h1 className="h4 mb-1">Deposit Funds</h1>
        <p className="mb-4">Add funds to your balance to start investing.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!session ? (
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
            <div className="mb-4">
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
            <button type="submit" className="btn ic-public-btn-primary w-100" disabled={isSubmitting}>
              {isSubmitting ? 'Starting deposit…' : 'Continue'}
            </button>
          </form>
        ) : (
          <div>
            <p className="mb-2">
              Send{' '}
              <strong>
                {amount} {session.deposit.currency}
              </strong>{' '}
              via <strong>{session.deposit.network}</strong> to the address below.
            </p>
            {session.address && (
              <div className="input-group mb-3">
                <input type="text" className="form-control" readOnly value={session.address} />
                <button type="button" className="btn ic-public-btn-outline" onClick={copyAddress}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
            <div className="alert alert-info" role="status">
              Status: <strong className="text-capitalize">{status ?? session.deposit.status}</strong>.{' '}
              {!isTerminal && 'This updates automatically once your deposit is received.'}
            </div>
            {isTerminal ? (
              <div className="d-flex gap-2">
                <button type="button" className="btn ic-public-btn-primary flex-grow-1" onClick={startOver}>
                  Make Another Deposit
                </button>
                <a href="/client-app/my-wallet.html" className="btn ic-public-btn-outline">
                  View Wallet
                </a>
              </div>
            ) : (
              <button type="button" className="btn ic-public-btn-outline w-100" onClick={startOver}>
                Cancel
              </button>
            )}
          </div>
        )}

        <p className="text-center mt-4 mb-0">
          <a href="/client-app/index.html">Back to dashboard</a>
        </p>
      </div>
    </div>
  );
}
