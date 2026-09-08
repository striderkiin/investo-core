import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createInvestmentService } from '../../../services/api/investmentService';
import type { InvestmentPlan, InvestmentPlanRateType, InvestmentPlanStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { NumericStepper } from '../../../components/controls/NumericStepper';
import { Modal } from '../../../components/modals/Modal';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';

const investmentService = createInvestmentService();
const RATE_STEP_PRESETS = [0.01, 0.1, 0.5, 1];

const STATUS_VARIANT: Record<InvestmentPlanStatus, string> = { active: 'success', paused: 'warning', inactive: 'secondary' };

interface PlanFormState {
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  rate: number;
  rateType: InvestmentPlanRateType;
  durationDays: string;
}

const EMPTY_FORM: PlanFormState = { name: '', description: '', minAmount: '', maxAmount: '', rate: 1, rateType: 'daily', durationDays: '30' };

export function AdminInvestmentsPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManage = can('investments.manage');

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setPlans(await investmentService.listPlans());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(plan: InvestmentPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      minAmount: String(plan.minAmount),
      maxAmount: String(plan.maxAmount),
      rate: plan.rate,
      rateType: plan.rateType,
      durationDays: String(plan.durationDays),
    });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        rate: form.rate,
        rateType: form.rateType,
        durationDays: Number(form.durationDays),
      };
      if (editingPlan) {
        await investmentService.updatePlan(editingPlan.id, payload);
        showSuccess('Plan updated.');
      } else {
        await investmentService.createPlan(payload);
        showSuccess('Plan created.');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(plan: InvestmentPlan, status: InvestmentPlanStatus) {
    try {
      await investmentService.updatePlan(plan.id, { status });
      showSuccess(`${plan.name} is now ${status}.`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update plan status');
    }
  }

  async function handleDuplicate(plan: InvestmentPlan) {
    try {
      await investmentService.createPlan({
        name: `${plan.name} (Copy)`,
        description: plan.description,
        minAmount: plan.minAmount,
        maxAmount: plan.maxAmount,
        rate: plan.rate,
        rateType: plan.rateType,
        durationDays: plan.durationDays,
      });
      showSuccess('Plan duplicated.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to duplicate plan');
    }
  }

  async function handleDelete(plan: InvestmentPlan) {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await investmentService.deletePlan(plan.id);
      showSuccess('Plan deleted.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete plan. It may have active investments.');
    }
  }

  async function handleRateChange(plan: InvestmentPlan, rate: number) {
    try {
      await investmentService.updatePlan(plan.id, { rate: Math.max(0, rate) });
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update rate');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading investment plans..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Investment Plans</h2>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            New Plan
          </button>
        )}
      </div>

      <div className="row g-3">
        {plans.map((plan) => (
          <div className="col-12 col-md-6 col-xl-3" key={plan.id}>
            <div className="card ic-card h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h3 className="h6 mb-0">{plan.name}</h3>
                  <span className={`badge text-bg-${STATUS_VARIANT[plan.status]} text-capitalize`}>{plan.status}</span>
                </div>
                <p className="text-secondary small mb-2">{plan.description}</p>
                <p className="small mb-2">
                  ${plan.minAmount.toLocaleString()} - ${plan.maxAmount.toLocaleString()} &middot; {plan.durationDays} days
                </p>
                <div className="mb-3">
                  <NumericStepper
                    label={`Rate (${plan.rateType})`}
                    value={plan.rate}
                    step={RATE_STEP_PRESETS[1]}
                    min={0}
                    suffix="%"
                    disabled={!canManage}
                    onChange={(value) => handleRateChange(plan, value)}
                  />
                </div>
                {canManage && (
                  <div className="mt-auto d-flex flex-wrap gap-1">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(plan)}>
                      Edit
                    </button>
                    {plan.status !== 'active' && (
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange(plan, 'active')}>
                        Activate
                      </button>
                    )}
                    {plan.status === 'active' && (
                      <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => handleStatusChange(plan, 'paused')}>
                        Pause
                      </button>
                    )}
                    {plan.status !== 'inactive' && (
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleStatusChange(plan, 'inactive')}>
                        Deactivate
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleDuplicate(plan)}>
                      Duplicate
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(plan)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal title={editingPlan ? 'Edit Plan' : 'New Plan'} show={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="planName" className="form-label">
              Name
            </label>
            <input id="planName" type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label htmlFor="planDescription" className="form-label">
              Description
            </label>
            <textarea
              id="planDescription"
              className="form-control"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="minAmount" className="form-label">
                Min Amount
              </label>
              <input
                id="minAmount"
                type="number"
                className="form-control"
                value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                required
              />
            </div>
            <div className="col-6">
              <label htmlFor="maxAmount" className="form-label">
                Max Amount
              </label>
              <input
                id="maxAmount"
                type="number"
                className="form-control"
                value={form.maxAmount}
                onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="rate" className="form-label">
                Rate (%)
              </label>
              <input
                id="rate"
                type="number"
                step="0.01"
                className="form-control"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                required
              />
            </div>
            <div className="col-6">
              <label htmlFor="rateType" className="form-label">
                Rate Type
              </label>
              <select
                id="rateType"
                className="form-select"
                value={form.rateType}
                onChange={(e) => setForm({ ...form, rateType: e.target.value as InvestmentPlanRateType })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="durationDays" className="form-label">
              Duration (days)
            </label>
            <input
              id="durationDays"
              type="number"
              className="form-control"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
