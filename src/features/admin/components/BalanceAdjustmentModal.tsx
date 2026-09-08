import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../../components/modals/Modal';
import { createUserService } from '../../../services/api/userService';
import type { AdjustmentType, BalanceField } from '../../../services/api/userService';
import { useToast } from '../../../hooks/useToast';
import type { Profile } from '../../../types/database';

const userService = createUserService();

const FIELD_OPTIONS: { value: BalanceField; label: string }[] = [
  { value: 'available_balance', label: 'Available Balance' },
  { value: 'bonus_balance', label: 'Bonus Balance' },
  { value: 'invested_balance', label: 'Investment Amount' },
  { value: 'total_balance', label: 'Total Balance (override)' },
];

interface BalanceAdjustmentModalProps {
  user: Profile;
  show: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}

export function BalanceAdjustmentModal({ user, show, onClose, onAdjusted }: BalanceAdjustmentModalProps) {
  const { showSuccess, showError } = useToast();
  const [field, setField] = useState<BalanceField>('available_balance');
  const [type, setType] = useState<AdjustmentType>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required for every balance adjustment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.adjustBalance({ userId: user.id, field, amount: parsedAmount, type, reason: reason.trim(), notes: notes.trim() || undefined });
      showSuccess('Balance adjusted successfully.');
      setAmount('');
      setReason('');
      setNotes('');
      onAdjusted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to adjust balance';
      setError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={`Adjust Balance — ${user.fullName || user.email}`} show={show} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label htmlFor="field" className="form-label">
              Balance Field
            </label>
            <select id="field" className="form-select" value={field} onChange={(e) => setField(e.target.value as BalanceField)}>
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6">
            <label htmlFor="type" className="form-label">
              Adjustment Type
            </label>
            <select id="type" className="form-select" value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (-)</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="amount" className="form-label">
            Amount
          </label>
          <input id="amount" type="number" min={0} step="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label htmlFor="reason" className="form-label">
            Reason
          </label>
          <input id="reason" type="text" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label htmlFor="notes" className="form-label">
            Notes <span className="text-secondary">(optional)</span>
          </label>
          <textarea id="notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Applying…' : 'Apply Adjustment'}
        </button>
      </form>
    </Modal>
  );
}
