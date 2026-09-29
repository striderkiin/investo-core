import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Nav, NavItem, NavLink, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import StatTiles from '@/investo/StatTiles'
import { formatDateTime, formatMoney, formatPrice, statusLabel } from '@/investo/format'
import { useMarketProvider } from '../../../../../../src/features/market/useMarketProvider'
import type { MarketCapabilityKey } from '../../../../../../src/types/database'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import { ArrowControl, PriceChart, StepPicker } from './shared'

const CAPABILITIES: { key: MarketCapabilityKey; label: string }[] = [
  { key: 'manualIncreaseEnabled', label: 'Increase' },
  { key: 'manualDecreaseEnabled', label: 'Decrease' },
  { key: 'percentageAdjustmentEnabled', label: 'Percentage' },
  { key: 'directValueEntryEnabled', label: 'Direct entry' },
]

type Tab = 'fixed' | 'percentage' | 'direct'

// Live provider prices with a manual offset on top (the old panel's override panel).
const LiveMarketControls = () => {
  const { can } = usePermission()
  const canManage = can('market.manage')
  const { showNotification } = useNotificationContext()
  const { assets, selectedAssetId, selectAsset, state, history, overrideHistory, isLoading, error, refresh, marketProviderService } = useMarketProvider()
  const [tab, setTab] = useState<Tab>('fixed')
  const [fixed, setFixed] = useState(100)
  const [percent, setPercent] = useState(1)
  const [direct, setDirect] = useState('')

  if (isLoading) return <FallbackLoading />
  if (error || !state || !marketProviderService) return <div className="alert alert-warning">{error ?? 'The live price provider is unavailable right now.'}</div>

  const svc = marketProviderService
  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (!canManage) return
    try {
      await action()
      await refresh()
      if (success) showNotification({ message: success, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'That did not work.', variant: 'danger' })
    }
  }
  const offset = state.manualOffset
  const blocked = (what: string) => showNotification({ message: `${what} are turned off for this market. Switch them on under Allow.`, variant: 'warning' })

  return (
    <>
      <Nav variant="pills" className="mb-3 gap-1" activeKey={selectedAssetId ?? undefined} onSelect={(k) => k && selectAsset(k)}>
        {assets.map((a) => (
          <NavItem key={a.id}>
            <NavLink eventKey={a.id} className="py-1">
              {a.symbol}
            </NavLink>
          </NavItem>
        ))}
      </Nav>
      <StatTiles
        tiles={[
          { title: 'Price customers see', stat: formatPrice(state.effectivePrice), icon: 'iconoir:eye', variant: 'primary' },
          { title: 'Live provider price', stat: formatPrice(state.providerPrice), icon: 'iconoir:antenna-signal', variant: 'info' },
          { title: 'Manual offset', stat: `${offset >= 0 ? '+' : ''}${formatPrice(offset)}`, icon: 'iconoir:data-transfer-both', variant: offset > 0 ? 'success' : offset < 0 ? 'danger' : 'secondary' },
          { title: 'Status', stat: offset !== 0 ? 'Override active' : 'Live price', icon: 'iconoir:activity', variant: offset !== 0 ? 'warning' : 'success' },
        ]}
      />
      <Row>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Price history</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <PriceChart points={history} height={300} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <Nav variant="tabs" activeKey={tab} onSelect={(k) => k && setTab(k as Tab)}>
                {(['fixed', 'percentage', 'direct'] as Tab[]).map((t) => (
                  <NavItem key={t}>
                    <NavLink eventKey={t} className="py-1">
                      {t === 'fixed' ? 'By amount' : t === 'percentage' ? 'By percent' : 'Set price'}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
            </CardHeader>
            <CardBody>
              {tab === 'fixed' && (
                <>
                  <ArrowControl
                    label={`Step ${formatMoney(fixed)}`}
                    value={formatPrice(state.effectivePrice)}
                    disabled={!canManage}
                    onUp={() => (state.manualIncreaseEnabled ? void run(() => svc.applyFixedAdjustment(state.assetId, 'increase', fixed)) : blocked('Increases'))}
                    onDown={() => (state.manualDecreaseEnabled ? void run(() => svc.applyFixedAdjustment(state.assetId, 'decrease', fixed)) : blocked('Decreases'))}
                  />
                  <StepPicker presets={[1, 10, 100, 500, 1000]} value={fixed} format={(n) => `$${n}`} disabled={!canManage} onPick={setFixed} />
                </>
              )}
              {tab === 'percentage' && (
                <>
                  <ArrowControl
                    label={`${percent}% of the price`}
                    value={formatPrice(state.effectivePrice)}
                    disabled={!canManage || !state.percentageAdjustmentEnabled}
                    onUp={() => void run(() => svc.applyPercentageAdjustment(state.assetId, 'increase', percent))}
                    onDown={() => void run(() => svc.applyPercentageAdjustment(state.assetId, 'decrease', percent))}
                  />
                  <StepPicker presets={[0.1, 0.5, 1, 5]} value={percent} format={(n) => `${n}%`} disabled={!canManage} onPick={setPercent} />
                </>
              )}
              {tab === 'direct' && (
                <form
                  className="d-flex gap-2 align-items-end"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const target = Number(direct)
                    if (direct !== '' && target >= 0) void run(() => svc.setDirectPrice(state.assetId, target), `Price set to ${formatPrice(target)}.`)
                  }}
                >
                  <div className="flex-grow-1">
                    <label htmlFor="directValue" className="form-label">
                      Price customers see
                    </label>
                    <input
                      id="directValue"
                      type="number"
                      min={0}
                      step="any"
                      className="form-control"
                      placeholder={String(state.effectivePrice)}
                      value={direct}
                      disabled={!canManage || !state.directValueEntryEnabled}
                      onChange={(e) => setDirect(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!canManage || !state.directValueEntryEnabled || direct === ''}>
                    Apply
                  </button>
                </form>
              )}
              <div className="d-flex gap-2 flex-wrap mt-3 pt-3 border-top">
                <button type="button" className="btn btn-sm btn-light" disabled={!canManage} onClick={() => void run(() => svc.undoLastOverride(state.assetId), 'Last change undone.')}>
                  Undo last
                </button>
                <button type="button" className="btn btn-sm btn-light" disabled={!canManage} onClick={() => void run(() => svc.resetToProvider(state.assetId), 'Back to the live price.')}>
                  Back to live price
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger ms-auto"
                  disabled={!canManage}
                  onClick={() => window.confirm('Clear the overrides on every market?') && void run(() => svc.resetAllOverrides(), 'All overrides cleared.')}
                >
                  Clear all markets
                </button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="d-flex flex-wrap gap-3 align-items-center">
              <span className="fw-semibold">Allow:</span>
              {CAPABILITIES.map((c) => (
                <FormCheck
                  key={c.key}
                  type="switch"
                  id={`cap-${c.key}`}
                  label={c.label}
                  checked={state[c.key]}
                  disabled={!canManage}
                  onChange={(e) => void run(() => svc.setCapabilityToggle(state.assetId, c.key, e.target.checked))}
                />
              ))}
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Override history</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {overrideHistory.length === 0 ? (
            <p className="text-muted mb-0">No overrides yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Change</th>
                    <th>Price</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {overrideHistory.map((h) => (
                    <tr key={h.id} className={h.undone ? 'text-muted text-decoration-line-through' : undefined}>
                      <td>
                        {statusLabel(h.adjustmentType)} {h.direction !== 'set' ? h.direction : ''}
                        {h.inputValue !== null ? ` (${h.inputValue})` : ''}
                      </td>
                      <td>
                        {formatPrice(h.previousEffectivePrice)} to {formatPrice(h.newEffectivePrice)}
                      </td>
                      <td>{formatDateTime(h.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default LiveMarketControls
