import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { countryName } from '@/investo/format'
import { MONEY, reviewDeposit, reviewWithdrawal, setWithdrawalTxHash, type MoneyRecord } from '@/investo/money'
import type { WithdrawalReviewAction } from '../../../../../../../../../src/services/api/withdrawalService'
import { usePermission } from '../../../../../../../../../src/hooks/usePermission'

const InfoRow = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
  <div className="d-flex justify-content-between mb-2 gap-2">
    <p className="text-body fw-semibold mb-0">
      <IconifyIcon icon={icon} className="text-secondary fs-20 align-middle me-1" />
      {label} :
    </p>
    <p className="text-body-emphasis fw-semibold mb-0 text-end text-break">{children}</p>
  </div>
)

type Action = { key: string; label: string; variant: string; confirm?: string; needsHash?: boolean }

// What an admin can do next, by kind and status.
const actionsFor = (order: MoneyRecord): Action[] => {
  if (order.kind === 'deposit') {
    if (!MONEY.deposit.open.includes(order.status as never)) return []
    return [
      { key: 'confirm', label: 'Confirm and credit', variant: 'primary', confirm: 'Credit this deposit to the customer’s available balance?' },
      { key: 'reject', label: 'Reject', variant: 'outline-danger', confirm: 'Reject this deposit? The customer is told it could not be confirmed.' },
    ]
  }
  if (['pending', 'review'].includes(order.status)) {
    return [
      { key: 'approve', label: 'Approve', variant: 'primary' },
      ...(order.status === 'pending' ? [{ key: 'hold', label: 'Hold for review', variant: 'light' }] : []),
      { key: 'reject', label: 'Reject and refund', variant: 'outline-danger', confirm: 'Reject this withdrawal? The amount goes back to the customer’s available balance.' },
    ]
  }
  if (order.status === 'processing') {
    return [{ key: 'complete', label: 'Mark as paid', variant: 'primary', confirm: 'Mark this withdrawal as paid out?', needsHash: true }]
  }
  return []
}

const OrderInformation = ({ order, onChanged }: { order: MoneyRecord; onChanged: () => void }) => {
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [notes, setNotes] = useState('')
  const [txHash, setTxHash] = useState(order.txHash ?? '')
  const [busy, setBusy] = useState(false)
  const allowed = order.kind === 'deposit' ? can('deposits.manage') : can('withdrawals.approve')
  const actions = allowed ? actionsFor(order) : []
  const customer = order.customer
  const name = customer?.fullName || customer?.email || 'Unknown customer'

  const run = async (action: Action) => {
    if (action.confirm && !window.confirm(action.confirm)) return
    setBusy(true)
    try {
      if (order.kind === 'deposit') {
        await reviewDeposit(order.id, action.key as 'confirm' | 'reject', notes.trim(), txHash.trim())
      } else {
        if (txHash.trim() && txHash.trim() !== order.txHash) await setWithdrawalTxHash(order.id, txHash.trim())
        await reviewWithdrawal(order.id, action.key as WithdrawalReviewAction, notes.trim())
      }
      showNotification({ message: `${MONEY[order.kind].singular} updated.`, variant: 'success' })
      setNotes('')
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'The update failed.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const saveHash = async () => {
    setBusy(true)
    try {
      await setWithdrawalTxHash(order.id, txHash.trim())
      showNotification({ message: 'Transaction hash saved.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save the hash.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const showHashField = allowed && (actions.length > 0 || (order.kind === 'withdrawal' && order.status === 'completed'))

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as={'h4'}>Customer</CardTitle>
          </Col>
          <Col xs="auto">
            <Link href={`/customers/${order.userId}`} className="text-secondary icons-center">
              <IconifyIcon icon="iconoir:profile-circle" className="me-1" /> Open profile
            </Link>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="d-flex align-items-center mb-3">
          <UserAvatar photoUrl={customer?.avatarUrl} avatarKey={customer?.avatarKey} name={name} className="thumb-lg me-2" />
          <div>
            <h5 className="mb-0">{name}</h5>
            {customer?.fullName && <small className="text-muted">{customer.email}</small>}
          </div>
        </div>
        <InfoRow icon="iconoir:mail" label="Email">
          {customer?.email ?? '-'}
        </InfoRow>
        <InfoRow icon="iconoir:globe" label="Country">
          {customer?.country ? countryName(customer.country) : '-'}
        </InfoRow>

        {showHashField && (
          <>
            <hr className="hr-dashed" />
            <div className="mb-2">
              <label htmlFor="tx-hash" className="form-label">
                Transaction hash {order.kind === 'deposit' ? '(from the blockchain)' : '(of your payout)'}
              </label>
              <div className="input-group">
                <input id="tx-hash" className="form-control" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x… or txid" />
                {order.kind === 'withdrawal' && order.status === 'completed' && (
                  <button type="button" className="btn btn-light" disabled={busy || txHash.trim() === (order.txHash ?? '')} onClick={() => void saveHash()}>
                    Save
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        {actions.length > 0 && (
          <>
            <div className="mb-3">
              <label htmlFor="review-notes" className="form-label">
                Note <span className="text-muted">(optional, the customer sees it if you reject)</span>
              </label>
              <textarea id="review-notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="d-flex flex-wrap gap-2">
              {actions.map((action) => (
                <button key={action.key} type="button" className={`btn btn-${action.variant}`} disabled={busy} onClick={() => void run(action)}>
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}
        {!allowed && MONEY[order.kind].open.includes(order.status as never) && (
          <p className="text-muted mb-0 mt-2">Your role can view this but not change it.</p>
        )}
      </CardBody>
    </Card>
  )
}

export default OrderInformation
