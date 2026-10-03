import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { countryName } from '@/investo/format'
import { MONEY, payramPayout, reviewDeposit, reviewWithdrawal, setWithdrawalTxHash, type MoneyRecord } from '@/investo/money'
import { supabase } from '@/investo/services'
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

// PayRam pays out USDT on Tron or Ethereum only.
const PAYRAM_NETWORKS = ['TRC20', 'TRON', 'ERC20', 'ETHEREUM']
const payramCanSend = (order: MoneyRecord) =>
  order.kind === 'withdrawal' && order.currency.toUpperCase() === 'USDT' && PAYRAM_NETWORKS.includes((order.network ?? '').toUpperCase())
const PAYOUT_FAILED = ['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'CANCELED', 'ERROR', 'DECLINED']

// What an admin can do next, by kind and status.
const actionsFor = (order: MoneyRecord, payram: boolean): Action[] => {
  if (order.kind === 'deposit') {
    if (!MONEY.deposit.open.includes(order.status as never)) return []
    return [
      { key: 'confirm', label: 'Confirm and credit', variant: 'primary', confirm: 'Credit this deposit to the customer’s available balance?' },
      { key: 'reject', label: 'Reject', variant: 'outline-danger', confirm: 'Reject this deposit? The customer is told it could not be confirmed.' },
    ]
  }
  const sendable = payram && payramCanSend(order)
  const sendAction: Action = {
    key: 'payram-send',
    label: 'Approve and send with PayRam',
    variant: 'primary',
    confirm: `Send $${(order.amount - order.fee).toFixed(2)} USDT (${order.network}) to ${order.address ?? 'the customer'} from your PayRam hot wallet? Crypto payments cannot be reversed.`,
  }
  if (['pending', 'review'].includes(order.status)) {
    return [
      ...(sendable ? [sendAction] : []),
      { key: 'approve', label: sendable ? 'Approve (pay by hand)' : 'Approve', variant: sendable ? 'light' : 'primary' },
      ...(order.status === 'pending' ? [{ key: 'hold', label: 'Hold for review', variant: 'light' }] : []),
      { key: 'reject', label: 'Reject and refund', variant: 'outline-danger', confirm: 'Reject this withdrawal? The amount goes back to the customer’s available balance.' },
    ]
  }
  if (order.status === 'processing') {
    const viaPayram = order.payoutProvider === 'payram'
    const payoutFailed = PAYOUT_FAILED.includes(order.payoutStatus ?? '')
    return [
      ...(viaPayram && !payoutFailed && order.payoutStatus !== 'UNKNOWN' ? [{ key: 'payram-refresh', label: 'Check payout status', variant: 'primary' }] : []),
      ...(sendable && (!viaPayram || payoutFailed) ? [{ ...sendAction, label: viaPayram ? 'Send with PayRam again' : 'Send with PayRam' }] : []),
      { key: 'complete', label: 'Mark as paid', variant: viaPayram ? 'light' : 'primary', confirm: 'Mark this withdrawal as paid out?', needsHash: true },
      ...(viaPayram && (payoutFailed || order.payoutStatus === 'UNKNOWN')
        ? [{ key: 'reject', label: 'Reject and refund', variant: 'outline-danger', confirm: 'Reject this withdrawal? The amount goes back to the customer’s available balance.' }]
        : []),
    ]
  }
  return []
}

const OrderInformation = ({ order, onChanged }: { order: MoneyRecord; onChanged: () => void }) => {
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [notes, setNotes] = useState('')
  const [txHash, setTxHash] = useState(order.txHash ?? '')
  const [busy, setBusy] = useState(false)
  const [payram, setPayram] = useState(false)
  const allowed = order.kind === 'deposit' ? can('deposits.manage') : can('withdrawals.approve')
  const actions = allowed ? actionsFor(order, payram) : []

  useEffect(() => {
    if (order.kind !== 'withdrawal') return
    void supabase.rpc('active_payment_provider').then(({ data }) => setPayram(data === 'payram'))
  }, [order.kind])
  const customer = order.customer
  const name = customer?.fullName || customer?.email || 'Unknown customer'

  const run = async (action: Action) => {
    if (action.confirm && !window.confirm(action.confirm)) return
    setBusy(true)
    try {
      if (action.key === 'payram-send' || action.key === 'payram-refresh') {
        const result = await payramPayout(order.id, action.key === 'payram-send' ? 'send' : 'refresh')
        showNotification({ message: result.message, variant: result.ok ? 'success' : 'warning', delay: 8000 })
        onChanged()
        return
      }
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

        {order.payoutProvider === 'payram' && (
          <div className={`alert alert-${PAYOUT_FAILED.includes(order.payoutStatus ?? '') || order.payoutStatus === 'UNKNOWN' ? 'warning' : 'info'} mt-3 mb-0 fs-13`}>
            <strong>PayRam payout:</strong> {order.payoutStatus ?? 'unknown'}
            {order.payoutError && <div className="mt-1">{order.payoutError}</div>}
          </div>
        )}
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
