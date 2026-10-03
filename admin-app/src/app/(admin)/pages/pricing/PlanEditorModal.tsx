import { useState, type FormEvent } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import type { InvestmentPlan, InvestmentPlanRateType } from '../../../../../../src/types/database'

export type PlanInput = {
  name: string
  description: string
  minAmount: number
  maxAmount: number
  rate: number
  rateType: InvestmentPlanRateType
  durationDays: number
  minWithdrawal: number
}

type Props = { plan: InvestmentPlan | null; show: boolean; onClose: () => void; onSave: (input: PlanInput) => Promise<void> }

const PlanEditorModal = ({ plan, show, onClose, onSave }: Props) => {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    minAmount: String(plan?.minAmount ?? ''),
    maxAmount: String(plan?.maxAmount ?? ''),
    rate: String(plan?.rate ?? '1'),
    rateType: plan?.rateType ?? ('daily' as InvestmentPlanRateType),
    durationDays: String(plan?.durationDays ?? '30'),
    minWithdrawal: String(plan?.minWithdrawal ?? '50'),
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const input: PlanInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      minAmount: Number(form.minAmount),
      maxAmount: Number(form.maxAmount),
      rate: Number(form.rate),
      rateType: form.rateType,
      durationDays: Number(form.durationDays),
      minWithdrawal: Number(form.minWithdrawal),
    }
    if (!input.name) return setError('Give the plan a name.')
    if (!(input.minAmount > 0) || !(input.maxAmount >= input.minAmount)) return setError('Minimum must be above zero and the maximum at least the minimum.')
    if (!(input.rate > 0)) return setError('The rate must be above zero.')
    if (!Number.isInteger(input.durationDays) || input.durationDays < 1) return setError('Duration must be a whole number of days.')
    if (!(input.minWithdrawal >= 0)) return setError('The minimum withdrawal cannot be negative.')
    setError(null)
    setSaving(true)
    try {
      await onSave(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <form onSubmit={submit} noValidate>
        <ModalHeader closeButton>
          <ModalTitle as="h5">{plan ? `Edit ${plan.name}` : 'New plan'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="mb-3">
            <label htmlFor="plan-name" className="form-label">
              Name
            </label>
            <input id="plan-name" className="form-control" value={form.name} onChange={set('name')} />
          </div>
          <div className="mb-3">
            <label htmlFor="plan-description" className="form-label">
              Description
            </label>
            <textarea id="plan-description" className="form-control" rows={2} value={form.description} onChange={set('description')} />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="plan-min" className="form-label">
                Minimum (USD)
              </label>
              <input id="plan-min" type="number" min={0} className="form-control" value={form.minAmount} onChange={set('minAmount')} />
            </div>
            <div className="col-6">
              <label htmlFor="plan-max" className="form-label">
                Maximum (USD)
              </label>
              <input id="plan-max" type="number" min={0} className="form-control" value={form.maxAmount} onChange={set('maxAmount')} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-4">
              <label htmlFor="plan-rate" className="form-label">
                Rate (%)
              </label>
              <input id="plan-rate" type="number" min={0} step="0.01" className="form-control" value={form.rate} onChange={set('rate')} />
            </div>
            <div className="col-4">
              <label htmlFor="plan-rate-type" className="form-label">
                Paid
              </label>
              <select id="plan-rate-type" className="form-select" value={form.rateType} onChange={set('rateType')}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="col-4">
              <label htmlFor="plan-duration" className="form-label">
                Days
              </label>
              <input id="plan-duration" type="number" min={1} className="form-control" value={form.durationDays} onChange={set('durationDays')} />
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="plan-min-withdrawal" className="form-label">
              Minimum withdrawal ($)
            </label>
            <input id="plan-min-withdrawal" type="number" min={0} className="form-control" value={form.minWithdrawal} onChange={set('minWithdrawal')} />
            <small className="text-muted">
              Customers can move earnings to their balance once they reach this amount. A customer with several plans can withdraw from the lowest minimum among them.
            </small>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default PlanEditorModal
