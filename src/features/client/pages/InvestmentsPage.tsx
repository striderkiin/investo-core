import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createInvestmentService } from '../../../services/api/investmentService';
import type { Investment, InvestmentPlan, InvestmentStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';

const investmentService = createInvestmentService();

function StatusBadge({ status }: { status: InvestmentStatus }) {
  const variant = { active: 'success', completed: 'primary', paused: 'warning', cancelled: 'secondary' }[status];
  return <span className={`badge text-bg-${variant} text-capitalize`}>{status}</span>;
}

function InvestmentCard({ investment, plan }: { investment: Investment; plan?: InvestmentPlan }) {
  const totalDurationMs = new Date(investment.endsAt).getTime() - new Date(investment.startedAt).getTime();
  const elapsedMs = Date.now() - new Date(investment.startedAt).getTime();
  const progress = totalDurationMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100)) : 0;

  return (
    <div className="card ic-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className="h6 mb-0">{plan?.name ?? 'Investment Plan'}</h3>
          <StatusBadge status={investment.status} />
        </div>
        <p className="fs-4 fw-bold mb-1">${investment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-secondary small mb-3">
          {investment.rate}% {investment.rateType} &middot; {investment.durationDays} days
        </p>
        <div className="progress mb-2" style={{ height: 6 }}>
          <div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
        </div>
        <div className="d-flex justify-content-between text-secondary small mb-2">
          <span>Started {new Date(investment.startedAt).toLocaleDateString()}</span>
          <span>Ends {new Date(investment.endsAt).toLocaleDateString()}</span>
        </div>
        <p className="mb-0 small">
          Current earnings: <strong className="text-success">${investment.currentEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </p>
      </div>
    </div>
  );
}

export function InvestmentsPage() {
  const { profile, refreshProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const [plansData, investmentsData] = await Promise.all([
        investmentService.listPlans(),
        investmentService.listMyInvestments(profile.id),
      ]);
      setPlans(plansData);
      setInvestments(investmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investments');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const active = investments.filter((i) => i.status === 'active');
  const completed = investments.filter((i) => i.status === 'completed');
  const paused = investments.filter((i) => i.status === 'paused');
  const totalEarnings = investments.reduce((sum, i) => sum + i.currentEarnings, 0);
  const selectedPlan = planById.get(selectedPlanId);

  async function handleInvest(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsedAmount = Number(amount);

    if (!selectedPlan) {
      setFormError('Select a plan first.');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (parsedAmount < selectedPlan.minAmount || parsedAmount > selectedPlan.maxAmount) {
      setFormError(`Amount must be between $${selectedPlan.minAmount} and $${selectedPlan.maxAmount}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await investmentService.invest(selectedPlan.id, parsedAmount);
      showSuccess('Investment created successfully.');
      setShowInvestModal(false);
      setAmount('');
      setSelectedPlanId('');
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create investment';
      setFormError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading investments..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">Investments</h2>
          <p className="text-secondary mb-0">
            {active.length} active &middot; {completed.length} completed &middot; {paused.length} paused &middot; $
            {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })} total earnings
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowInvestModal(true)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          New Investment
        </button>
      </div>

      {investments.length === 0 ? (
        <EmptyState
          icon="bi-piggy-bank"
          title="No investments yet"
          message="Choose a plan to start earning."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setShowInvestModal(true)}>
              Browse Plans
            </button>
          }
        />
      ) : (
        <div className="row g-3">
          {investments.map((investment) => (
            <div className="col-12 col-md-6 col-xl-4" key={investment.id}>
              <InvestmentCard investment={investment} plan={planById.get(investment.planId)} />
            </div>
          ))}
        </div>
      )}

      <Modal title="New Investment" show={showInvestModal} onClose={() => setShowInvestModal(false)}>
        <form onSubmit={handleInvest} noValidate>
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="plan" className="form-label">
              Investment Plan
            </label>
            <select
              id="plan"
              className="form-select"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              required
            >
              <option value="">Select a plan…</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.rate}% {plan.rateType} (${plan.minAmount}-${plan.maxAmount})
                </option>
              ))}
            </select>
          </div>
          {selectedPlan && <p className="text-secondary small">{selectedPlan.description}</p>}
          <div className="mb-3">
            <label htmlFor="amount" className="form-label">
              Amount ($)
            </label>
            <input
              id="amount"
              type="number"
              className="form-control"
              min={selectedPlan?.minAmount ?? 0}
              max={selectedPlan?.maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="form-text">Available balance: ${profile?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Investing…' : 'Confirm Investment'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
