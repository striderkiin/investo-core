import { useState, type FormEvent } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import { userService } from '@/investo/services'
import { formatMoney } from '@/investo/format'
import type { AdjustmentType, BalanceField } from '../../../../../../../../../src/services/api/userService'
import type { Profile } from '../../../../../../../../../src/types/database'

const FIELDS: { value: BalanceField; label: string; current: (p: Profile) => number }[] = [
  { value: 'available_balance', label: 'Available balance', current: (p) => p.availableBalance },
  { value: 'bonus_balance', label: 'Bonus balance', current: (p) => p.bonusBalance },
  { value: 'invested_balance', label: 'Invested amount', current: (p) => p.investedBalance },
  { value: 'total_balance', label: 'Total balance (override)', current: (p) => p.totalBalance },
]

type Props = { customer: Profile; show: boolean; onClose: () => void; onDone: () => void }

// Same rules as the database function: positive amount, a reason every time,
// and a debit can't take a balance below zero. Every change is audit-logged.
const BalanceAdjustModal = ({ customer, show, onClose, onDone }: Props) => {
  const { showNotification } = useNotificationContext()
  const [field, setField] = useState<BalanceField>('available_balance')
  const [type, setType] = useState<AdjustmentType>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selected = FIELDS.find((f) => f.value === field) ?? FIELDS[0]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount above zero.')
    if (!reason.trim()) return setError('Give a reason. It is saved in the customer ledger and the audit log.')
    setSaving(true)
    try {
      await userService.adjustBalance({ userId: customer.id, field, amount: value, type, reason: reason.trim(), notes: notes.trim() || undefined })
      showNotification({ message: `${type === 'credit' ? 'Credited' : 'Debited'} ${formatMoney(value)}.`, variant: 'success' })
      setAmount('')
      setReason('')
      setNotes('')
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The adjustment failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <form onSubmit={submit} noValidate>
        <ModalHeader closeButton>
          <ModalTitle as="h5">Adjust balance: {customer.fullName || customer.email}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="row g-2 mb-3">
            <div className="col-7">
              <label htmlFor="adjust-field" className="form-label">
                Balance
              </label>
              <select id="adjust-field" className="form-select" value={field} onChange={(e) => setField(e.target.value as BalanceField)}>
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <small className="text-muted">Currently {formatMoney(selected.current(customer))}</small>
            </div>
            <div className="col-5">
              <label htmlFor="adjust-type" className="form-label">
                Type
              </label>
              <select id="adjust-type" className="form-select" value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
                <option value="credit">Credit (+)</option>
                <option value="debit">Debit (-)</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="adjust-amount" className="form-label">
              Amount (USD)
            </label>
            <input id="adjust-amount" type="number" min={0} step="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="mb-3">
            <label htmlFor="adjust-reason" className="form-label">
              Reason
            </label>
            <input id="adjust-reason" type="text" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Deposit credited manually" />
          </div>
          <div>
            <label htmlFor="adjust-notes" className="form-label">
              Internal notes <span className="text-muted">(optional)</span>
            </label>
            <textarea id="adjust-notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Applying…' : 'Apply adjustment'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default BalanceAdjustModal
