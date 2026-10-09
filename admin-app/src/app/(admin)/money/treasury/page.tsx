'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import StatTiles from '@/investo/StatTiles'
import { formatMoney } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createFinancialService, type FinancialOverview } from '../../../../../../src/services/api/financialService'
import { createSettingsService, type SystemSettings } from '../../../../../../src/services/api/settingsService'
import { createTreasuryService } from '../../../../../../src/services/api/treasuryService'
import type { TreasuryAccount } from '../../../../../../src/types/database'
import { IS_PRODUCTION } from '../../../../../../src/config/env'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Treasury' }

const financialService = createFinancialService(supabase)
const settingsService = createSettingsService(supabase)
const treasuryService = createTreasuryService(supabase)

type NumberKey = { [K in keyof SystemSettings]: SystemSettings[K] extends number ? K : never }[keyof SystemSettings]
type Field = { key: NumberKey; label: string; unit: '$' | '%'; step: number }

const DEPOSIT_FIELDS: Field[] = [
  { key: 'depositMin', label: 'Minimum deposit', unit: '$', step: 10 },
  { key: 'depositMax', label: 'Maximum deposit', unit: '$', step: 1000 },
  { key: 'depositFeePercent', label: 'Deposit fee', unit: '%', step: 0.1 },
]
const WITHDRAWAL_FIELDS: Field[] = [
  { key: 'withdrawalMin', label: 'Minimum withdrawal', unit: '$', step: 10 },
  { key: 'withdrawalMax', label: 'Maximum withdrawal', unit: '$', step: 1000 },
  { key: 'withdrawalFeePercent', label: 'Withdrawal fee', unit: '%', step: 0.1 },
  { key: 'withdrawalDailyLimit', label: 'Daily limit per customer', unit: '$', step: 500 },
  { key: 'kycFreeWithdrawalLimit', label: 'Total limit without ID check', unit: '$', step: 50 },
  { key: 'withdrawalProcessingThreshold', label: 'Needs review above', unit: '$', step: 100 },
  { key: 'withdrawalAutoProcessLimit', label: 'Auto-approve up to', unit: '$', step: 50 },
]
const YIELD_FIELDS: Field[] = [
  { key: 'defaultDailyRate', label: 'Default daily rate', unit: '%', step: 0.1 },
  { key: 'defaultWeeklyRate', label: 'Default weekly rate', unit: '%', step: 0.5 },
  { key: 'defaultMonthlyRate', label: 'Default monthly rate', unit: '%', step: 1 },
]

type SettingsCardProps = {
  title: string
  subtitle: string
  toggle?: { key: 'depositEnabled' | 'withdrawalEnabled' | 'yieldEnabled'; on: string; off: string }
  fields: Field[]
  settings: SystemSettings
  canEdit: boolean
  onSave: (updates: Partial<SystemSettings>) => Promise<void>
  children?: ReactNode
}

// A settings card that edits a local draft and saves it in one go.
const SettingsCard = ({ title, subtitle, toggle, fields, settings, canEdit, onSave, children }: SettingsCardProps) => {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const value = (key: NumberKey) => draft[key] ?? String(settings[key])
  const dirty = fields.some((f) => draft[f.key] !== undefined && Number(draft[f.key]) !== settings[f.key])

  const save = async () => {
    const updates: Partial<SystemSettings> = {}
    for (const f of fields) if (draft[f.key] !== undefined) (updates as Record<string, number>)[f.key] = Number(draft[f.key])
    setSaving(true)
    try {
      await onSave(updates)
      setDraft({})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">{title}</CardTitle>
            <p className="text-muted mb-0 fs-12">{subtitle}</p>
          </Col>
          {toggle && (
            <Col xs="auto">
              <FormCheck
                type="switch"
                id={toggle.key}
                label={settings[toggle.key] ? toggle.on : toggle.off}
                checked={settings[toggle.key]}
                disabled={!canEdit}
                onChange={(e) => void onSave({ [toggle.key]: e.target.checked }).catch(() => undefined)}
              />
            </Col>
          )}
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <Row className="g-3">
          {fields.map((f) => (
            <Col sm={6} key={f.key}>
              <label htmlFor={f.key} className="form-label">
                {f.label}
              </label>
              <div className="input-group">
                {f.unit === '$' && <span className="input-group-text">$</span>}
                <input
                  id={f.key}
                  type="number"
                  min={0}
                  max={f.unit === '%' ? 100 : undefined}
                  step={f.step}
                  className="form-control"
                  value={value(f.key)}
                  disabled={!canEdit}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                />
                {f.unit === '%' && <span className="input-group-text">%</span>}
              </div>
            </Col>
          ))}
        </Row>
        {children}
        {canEdit && (
          <div className="text-end mt-3">
            <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// Platform money overview, treasury accounts, deposit/withdrawal limits and
// yield controls (the old panel's Financial Center and Treasury pages).
const Treasury = () => {
  const { can } = usePermission()
  const canEditSettings = can('settings.manage')
  const canSimulate = can('treasury.manage') && !IS_PRODUCTION
  const { showNotification } = useNotificationContext()
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([])
  const [amount, setAmount] = useState('1000')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [o, s, a] = await Promise.all([financialService.getOverview(), settingsService.get(), treasuryService.list()])
      setOverview(o)
      setSettings(s)
      setAccounts(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the treasury.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveSettings = async (updates: Partial<SystemSettings>) => {
    try {
      setSettings(await settingsService.update(updates))
      showNotification({ message: 'Saved.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
      throw err
    }
  }

  const yieldAction = (updates: Partial<SystemSettings>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    void saveSettings(updates).catch(() => undefined)
  }

  const moveFunds = async (account: TreasuryAccount, kind: 'add' | 'reserve') => {
    const value = Number(amount)
    if (!(value > 0)) return showNotification({ message: 'Enter an amount above zero.', variant: 'warning' })
    try {
      if (kind === 'add') await treasuryService.addDemoFunds(account.id, value)
      else await treasuryService.moveToReserve(account.id, value)
      showNotification({ message: kind === 'add' ? 'Demo funds added.' : 'Moved to reserve.', variant: 'success' })
      void load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not move funds.', variant: 'danger' })
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!overview || !settings) return <FallbackLoading />

  return (
    <>
      <StatTiles
        tiles={[
          { title: 'Customer balances', stat: formatMoney(overview.totalUserBalances), icon: 'iconoir:group', variant: 'primary' },
          { title: 'Invested in plans', stat: formatMoney(overview.totalInvested), icon: 'iconoir:graph-up', variant: 'info' },
          { title: 'Deposits', stat: formatMoney(overview.totalDeposits), subText: 'all time', icon: 'iconoir:download-circle', variant: 'success' },
          { title: 'Withdrawals', stat: formatMoney(overview.totalWithdrawals), subText: 'all time', icon: 'iconoir:upload-square', variant: 'warning' },
        ]}
      />
      <StatTiles
        tiles={[
          { title: 'Pending withdrawals', stat: formatMoney(overview.pendingWithdrawals), icon: 'iconoir:hourglass', variant: 'warning' },
          { title: 'Platform revenue', stat: formatMoney(overview.platformRevenue), subText: 'fees', icon: 'iconoir:coins', variant: 'success' },
          { title: 'Treasury balance', stat: formatMoney(overview.treasuryBalance), icon: 'iconoir:bank', variant: 'primary' },
          {
            title: 'Available after liabilities',
            stat: formatMoney(overview.availablePlatformFunds),
            subText: `owes ${formatMoney(overview.userLiabilities)}`,
            icon: 'iconoir:safe',
            variant: overview.availablePlatformFunds < 0 ? 'danger' : 'secondary',
          },
        ]}
      />

      <Row>
        <Col lg={6}>
          <SettingsCard
            title="Deposits"
            subtitle="Limits and fee applied when customers deposit."
            toggle={{ key: 'depositEnabled', on: 'Deposits on', off: 'Deposits paused' }}
            fields={DEPOSIT_FIELDS}
            settings={settings}
            canEdit={canEditSettings}
            onSave={saveSettings}
          />
        </Col>
        <Col lg={6}>
          <SettingsCard
            title="Withdrawals"
            subtitle="Limits, fee and when a withdrawal needs manual review."
            toggle={{ key: 'withdrawalEnabled', on: 'Withdrawals on', off: 'Withdrawals paused' }}
            fields={WITHDRAWAL_FIELDS}
            settings={settings}
            canEdit={canEditSettings}
            onSave={saveSettings}
          />
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <SettingsCard
            title="Yield"
            subtitle="Pausing stops earnings on every active investment until resumed."
            toggle={{ key: 'yieldEnabled', on: 'Yield running', off: 'Yield paused' }}
            fields={YIELD_FIELDS}
            settings={settings}
            canEdit={canEditSettings}
            onSave={saveSettings}
          >
            {canEditSettings && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => yieldAction({ defaultDailyRate: 0, defaultWeeklyRate: 0, defaultMonthlyRate: 0 }, 'Set every default rate to 0%?')}>
                  Set all rates to 0
                </button>
                <button type="button" className="btn btn-sm btn-light" onClick={() => yieldAction({ defaultDailyRate: 1, defaultWeeklyRate: 7, defaultMonthlyRate: 30 })}>
                  Restore defaults (1% / 7% / 30%)
                </button>
              </div>
            )}
          </SettingsCard>
        </Col>
        <Col lg={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Treasury accounts</CardTitle>
              <p className="text-muted mb-0 fs-12">
                {canSimulate
                  ? 'Test mode: you can add demo funds or move funds to reserve. This is off in production.'
                  : IS_PRODUCTION
                    ? 'Balances move through your payment provider in production.'
                    : 'Read only for your role.'}
              </p>
            </CardHeader>
            <CardBody className="pt-0">
              {accounts.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No treasury accounts.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Account</th>
                        <th className="text-end">Operating</th>
                        <th className="text-end">Reserve</th>
                        {canSimulate && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a) => (
                        <tr key={a.id}>
                          <td className="text-capitalize fw-medium">{a.name}</td>
                          <td className="text-end">{formatMoney(a.balance)}</td>
                          <td className="text-end">{formatMoney(a.reserveBalance)}</td>
                          {canSimulate && (
                            <td className="text-end text-nowrap">
                              <button type="button" className="btn btn-sm btn-light me-1" onClick={() => void moveFunds(a, 'add')}>
                                Add demo funds
                              </button>
                              <button type="button" className="btn btn-sm btn-light" onClick={() => void moveFunds(a, 'reserve')}>
                                To reserve
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canSimulate && (
                <div className="input-group mt-3" style={{ maxWidth: 240 }}>
                  <span className="input-group-text">$</span>
                  <input type="number" min={1} className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to move" />
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Treasury
