import { useState } from 'react'
import { Card, CardBody, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import UserAvatar from '@/investo/UserAvatar'
import { ACCOUNT_STATUSES, accountStatus } from '@/investo/customers'
import { countryName, formatDate, statusLabel, statusVariant } from '@/investo/format'
import { useNotificationContext } from '@/context/useNotificationContext'
import { userService } from '@/investo/services'
import BalanceAdjustModal from './BalanceAdjustModal'
import type { CustomerDetail } from '../useCustomer'
import type { AccountStatus } from '../../../../../../../../../src/types/database'
import { usePermission } from '../../../../../../../../../src/hooks/usePermission'

const DetailLine = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
  <div className="text-body mb-2 d-flex align-items-center">
    <IconifyIcon icon={icon} className="fs-20 me-1 text-muted" />
    <span className="text-body fw-semibold me-1">{label}:</span> {children}
  </div>
)

const CustomerCard = ({ detail, onChanged }: { detail: CustomerDetail; onChanged: () => void }) => {
  const { profile, kyc, referredBy, referralCount } = detail
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [adjusting, setAdjusting] = useState(false)
  const status = accountStatus(profile.accountStatus)
  const name = profile.fullName || profile.email

  const changeStatus = async (next: AccountStatus) => {
    const option = accountStatus(next)
    if (!window.confirm(`${option.action}: ${name}?`)) return
    try {
      await userService.setAccountStatus(profile.id, next)
      showNotification({ message: `${name} is now ${option.label.toLowerCase()}.`, variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not change the status.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardBody>
        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center">
              <div className="position-relative">
                <UserAvatar photoUrl={profile.avatarUrl} avatarKey={profile.avatarKey} name={name} style={{ width: 72, height: 72, fontSize: 28 }} />
                {profile.country && (
                  <div className="position-absolute" style={{ right: -4, bottom: -2 }}>
                    <span
                      className="rounded-circle border border-2 border-white bg-primary-subtle text-primary fw-semibold d-flex align-items-center justify-content-center"
                      style={{ width: 28, height: 28, fontSize: 10 }}
                      title={countryName(profile.country)}>
                      {profile.country}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-grow-1 text-truncate ms-3">
                <h5 className="m-0 fs-3 fw-bold text-truncate">{profile.fullName || 'No name'}</h5>
                <span className={`badge bg-${status.variant}-subtle text-${status.variant}`}>{status.label}</span>
              </div>
            </div>
          </Col>
          <Col xs="auto" className="text-end">
            <Link href={`/support?customer=${profile.id}`} className="btn btn-sm btn-outline-primary px-2 d-inline-flex align-items-center">
              <IconifyIcon icon="iconoir:chat-bubble" className="fs-14 me-1" />
              Message
            </Link>
          </Col>
        </Row>
        <div className="mt-3">
          <DetailLine icon="iconoir:mail-out" label="Email">
            <a href={`mailto:${profile.email}`} className="text-primary text-decoration-underline text-truncate">
              {profile.email}
            </a>
          </DetailLine>
          <DetailLine icon="iconoir:globe" label="Country">
            {profile.country ? countryName(profile.country) : <span className="text-muted">Not given</span>}
          </DetailLine>
          <DetailLine icon="iconoir:calendar" label="Joined">
            {formatDate(profile.createdAt)}
          </DetailLine>
          <DetailLine icon="iconoir:user-badge-check" label="KYC">
            {kyc ? (
              <span className={`badge bg-${statusVariant(kyc.status)}-subtle text-${statusVariant(kyc.status)}`}>{statusLabel(kyc.status)}</span>
            ) : (
              <span className="text-muted">Not submitted</span>
            )}
          </DetailLine>
          <DetailLine icon="iconoir:share-android" label="Referral code">
            <code>{profile.referralCode}</code>
            <span className="text-muted ms-1">
              ({referralCount} referred{referredBy ? `, invited by ${referredBy.fullName || referredBy.email}` : ''})
            </span>
          </DetailLine>
        </div>
        {(can('users.adjust_balance') || can('users.manage_status')) && (
          <div className="d-flex gap-2 mt-3 flex-wrap">
            {can('users.adjust_balance') && (
              <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center" onClick={() => setAdjusting(true)}>
                <IconifyIcon icon="iconoir:coins" className="me-1" /> Adjust balance
              </button>
            )}
            {can('users.manage_status') && (
              <Dropdown>
                <DropdownToggle variant="light" size="sm" className="d-inline-flex align-items-center">
                  <IconifyIcon icon="iconoir:shield-check" className="me-1" /> Account status
                </DropdownToggle>
                <DropdownMenu>
                  {ACCOUNT_STATUSES.filter((s) => s.value !== profile.accountStatus).map((s, idx, options) => (
                    <div key={s.value}>
                      {s.variant === 'danger' && options[idx - 1]?.variant !== 'danger' && idx > 0 && <DropdownDivider />}
                      <DropdownItem className={s.variant === 'danger' ? 'text-danger' : undefined} onClick={() => void changeStatus(s.value)}>
                        {s.action}
                      </DropdownItem>
                    </div>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        )}
      </CardBody>
      <BalanceAdjustModal customer={profile} show={adjusting} onClose={() => setAdjusting(false)} onDone={onChanged} />
    </Card>
  )
}

export default CustomerCard
