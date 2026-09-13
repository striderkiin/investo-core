import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { createInvestmentService } from '../../../services/api/investmentService';
import { formatCurrency } from '../../../lib/format';
import type { InvestmentPlan } from '../../../types/database';

const investmentService = createInvestmentService();

const RATE_LABEL: Record<InvestmentPlan['rateType'], string> = {
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
};

export function InvestmentsPage() {
  const { profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successPlanId, setSuccessPlanId] = useState<string | null>(null);

  useEffect(() => {
    const preselectedPlanId = searchParams.get('plan');
    investmentService
      .listPlans()
      .then((result) => {
        const active = result.filter((p) => p.status === 'active');
        setPlans(active);
        const preselected = preselectedPlanId ? active.find((p) => p.id === preselectedPlanId) : undefined;
        if (preselected) {
          setActivePlanId(preselected.id);
          setAmount(String(preselected.minAmount));
        }
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Unable to load investment plans.'))
      .finally(() => setIsLoading(false));
    // Only ever read the plan param once, on the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openInvestForm(plan: InvestmentPlan) {
    setActivePlanId(plan.id);
    setAmount(String(plan.minAmount));
    setFormError(null);
    setSuccessPlanId(null);
  }

  async function handleInvest(plan: InvestmentPlan) {
    setFormError(null);
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (parsedAmount < plan.minAmount || parsedAmount > plan.maxAmount) {
      setFormError(`Amount must be between ${formatCurrency(plan.minAmount)} and ${formatCurrency(plan.maxAmount)}.`);
      return;
    }
    if (profile && parsedAmount > profile.availableBalance) {
      setFormError('That amount is more than your available balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      await investmentService.invest(plan.id, parsedAmount);
      setSuccessPlanId(plan.id);
      setActivePlanId(null);
      void refreshProfile();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to start this investment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="h3 mb-2">Investment Plans</h1>
        <p className="mb-0">Available balance: {profile ? formatCurrency(profile.availableBalance) : '...'}</p>
      </div>

      {loadError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <p className="text-center">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-center">No investment plans are available right now.</p>
      ) : (
        <div className="row g-4 justify-content-center">
          {plans.map((plan) => (
            <div className="col-12 col-md-6 col-lg-4" key={plan.id}>
              <div className="ic-public-card p-4 h-100 d-flex flex-column">
                <h2 className="h5 mb-2">{plan.name}</h2>
                <p className="mb-3 flex-grow-1">{plan.description}</p>
                <ul className="list-unstyled mb-3">
                  <li>
                    Rate:{' '}
                    <strong>
                      {plan.rate}% {RATE_LABEL[plan.rateType]}
                    </strong>
                  </li>
                  <li>
                    Duration: <strong>{plan.durationDays} days</strong>
                  </li>
                  <li>
                    Range:{' '}
                    <strong>
                      {formatCurrency(plan.minAmount)} to {formatCurrency(plan.maxAmount)}
                    </strong>
                  </li>
                </ul>

                {successPlanId === plan.id && (
                  <div className="alert alert-success py-2" role="status">
                    Investment started.
                  </div>
                )}

                {activePlanId === plan.id ? (
                  <div>
                    {formError && (
                      <div className="alert alert-danger py-2" role="alert">
                        {formError}
                      </div>
                    )}
                    <div className="input-group mb-2">
                      <input
                        type="number"
                        min={plan.minAmount}
                        max={plan.maxAmount}
                        step="0.01"
                        className="form-control"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn ic-public-btn-primary"
                        disabled={isSubmitting}
                        onClick={() => handleInvest(plan)}
                      >
                        {isSubmitting ? 'Investing…' : 'Confirm'}
                      </button>
                    </div>
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setActivePlanId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn ic-public-btn-primary w-100" onClick={() => openInvestForm(plan)}>
                    Invest
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center mt-5 mb-0">
        <a href="/client-app/account.html">View my investments</a> · <a href="/client-app/index.html">Back to dashboard</a>
      </p>
    </div>
  );
}
