import { useEffect, useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { formatMoney } from '@/investo/format'
import { useMarketData } from '../../../../../../src/features/market/useMarketData'
import type { MarketControlKey } from '../../../../../../src/features/market/marketEngine'
import type { AutomaticMarketBehavior, MarketTrend, MarketVolatility } from '../../../../../../src/types/database'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import { ArrowControl, PriceChart, StepPicker } from './shared'

const TOGGLES: { key: MarketControlKey; label: string }[] = [
  { key: 'marketValueControlEnabled', label: 'Value' },
  { key: 'percentageControlEnabled', label: '24h change' },
  { key: 'trendControlEnabled', label: 'Trend' },
  { key: 'volatilityControlEnabled', label: 'Volatility' },
  { key: 'movementControlEnabled', label: 'Movement' },
]
const BEHAVIORS: AutomaticMarketBehavior[] = ['stable', 'upward', 'downward', 'volatile', 'random']
const STRENGTH = ['Very low', 'Low', 'Medium', 'High', 'Extreme']

// The Platform Index engine: automatic behavior, or manual control of each metric.
const PlatformIndexControls = () => {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManage = can('market.manage')
  const { showNotification } = useNotificationContext()
  const { settings, history, isLoading, error, marketService, refresh } = useMarketData()
  const [presets, setPresets] = useState<Awaited<ReturnType<NonNullable<typeof marketService>['listPresets']>>>([])
  const [presetName, setPresetName] = useState('')

  useEffect(() => {
    marketService
      ?.listPresets()
      .then(setPresets)
      .catch(() => undefined)
  }, [marketService])

  if (isLoading) return <FallbackLoading />
  if (error || !settings || !marketService || !profile) return <div className="alert alert-danger">{error ?? 'Market data is unavailable.'}</div>

  const adminId = profile.id
  const manual = settings.manualControlEnabled
  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (!canManage) return
    try {
      await action()
      // Realtime also pushes changes, but don't depend on it for the admin's own action.
      await refresh()
      if (success) showNotification({ message: success, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'That did not work.', variant: 'danger' })
    }
  }
  const reset = (key: MarketControlKey) => (
    <button type="button" className="btn btn-link btn-sm text-muted d-block mx-auto" disabled={!canManage} onClick={() => void run(() => marketService.resetCurrentMetric(key, adminId))}>
      Reset
    </button>
  )

  const savePreset = (e: FormEvent) => {
    e.preventDefault()
    if (!presetName.trim()) return
    void run(async () => {
      await marketService.savePreset(
        presetName.trim(),
        {
          mode: settings.mode,
          automaticBehavior: settings.automaticBehavior,
          manualControlEnabled: settings.manualControlEnabled,
          marketValueControlEnabled: settings.marketValueControlEnabled,
          percentageControlEnabled: settings.percentageControlEnabled,
          trendControlEnabled: settings.trendControlEnabled,
          volatilityControlEnabled: settings.volatilityControlEnabled,
          movementControlEnabled: settings.movementControlEnabled,
          marketValueStep: settings.marketValueStep,
          percentageStep: settings.percentageStep,
          currentTrend: settings.currentTrend,
          currentVolatility: settings.currentVolatility,
          movementStrength: settings.movementStrength,
        },
        adminId
      )
      setPresetName('')
      setPresets(await marketService.listPresets())
    }, 'Preset saved.')
  }

  return (
    <>
      <Row>
        <Col lg={8}>
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Platform Index</CardTitle>
                  <p className="text-muted mb-0 fs-12">The default chart customers see on their dashboard.</p>
                </Col>
                <Col xs="auto">
                  <span className={`badge bg-${manual ? 'warning' : 'success'}-subtle text-${manual ? 'warning' : 'success'} fs-12`}>
                    {manual ? 'Manual control' : 'Automatic'}
                    {settings.previewMode ? ' · preview only' : ''}
                  </span>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <PriceChart points={history} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Mode</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <FormCheck
                type="switch"
                id="manualMaster"
                label={manual ? 'Manual control is on' : 'Manual control is off'}
                checked={manual}
                disabled={!canManage}
                onChange={(e) =>
                  void run(
                    () => (e.target.checked ? marketService.enableManualControl(adminId) : marketService.returnToAutomatic(adminId)),
                    e.target.checked ? 'Manual control on.' : 'Back to automatic.'
                  )
                }
              />
              <p className="text-muted fs-12 mt-1">When off, the index follows the automatic behavior below.</p>
              <label htmlFor="behavior" className="form-label">
                Automatic behavior
              </label>
              <select
                id="behavior"
                className="form-select text-capitalize"
                value={settings.automaticBehavior}
                disabled={!canManage}
                onChange={(e) => void run(() => marketService.setAutomaticBehavior(e.target.value as AutomaticMarketBehavior, adminId), 'Behavior updated.')}
              >
                {BEHAVIORS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <FormCheck
                type="switch"
                id="previewMode"
                className="mt-3"
                label="Preview only (customers don't see changes)"
                checked={settings.previewMode}
                disabled={!canManage}
                onChange={(e) => void run(() => marketService.setPreviewMode(e.target.checked, adminId))}
              />
              <div className="d-flex gap-2 mt-3 flex-wrap">
                <button type="button" className="btn btn-sm btn-light" disabled={!canManage} onClick={() => void run(() => marketService.resetAllManualControls(adminId), 'Manual controls reset.')}>
                  Reset manual controls
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger" disabled={!canManage} onClick={() => void run(() => marketService.returnToAutomatic(adminId), 'Back to automatic.')}>
                  Return to automatic
                </button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardBody className="d-flex flex-wrap gap-4 align-items-center">
          <span className="fw-semibold">Manually control:</span>
          {TOGGLES.map((t) => (
            <FormCheck
              key={t.key}
              type="switch"
              id={`toggle-${t.key}`}
              label={t.label}
              checked={settings[t.key]}
              disabled={!canManage || !manual}
              onChange={(e) => void run(() => marketService.setControlToggle(t.key, e.target.checked, adminId))}
            />
          ))}
          {!manual && <small className="text-muted">Turn on manual control first.</small>}
        </CardBody>
      </Card>

      <Row>
        <Col lg={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Value</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ArrowControl
                label="Index value"
                value={formatMoney(settings.currentMarketValue)}
                disabled={!canManage || !manual || !settings.marketValueControlEnabled}
                onUp={() => void run(() => marketService.increaseMarketValue(adminId))}
                onDown={() => void run(() => marketService.decreaseMarketValue(adminId))}
              />
              <StepPicker
                presets={[1, 5, 10, 50, 100, 500, 1000]}
                value={settings.marketValueStep}
                format={(n) => `$${n}`}
                disabled={!canManage}
                onPick={(n) => void run(() => marketService.setMarketValueStep(n, adminId))}
              />
              {reset('marketValueControlEnabled')}
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">24h change</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ArrowControl
                label="24 hour change"
                value={`${settings.currentPercentageChange >= 0 ? '+' : ''}${settings.currentPercentageChange.toFixed(2)}%`}
                disabled={!canManage || !manual || !settings.percentageControlEnabled}
                onUp={() => void run(() => marketService.increasePercentage(adminId))}
                onDown={() => void run(() => marketService.decreasePercentage(adminId))}
              />
              <StepPicker
                presets={[0.01, 0.1, 0.5, 1]}
                value={settings.percentageStep}
                format={(n) => `${n}%`}
                disabled={!canManage}
                onPick={(n) => void run(() => marketService.setPercentageStep(n, adminId))}
              />
              {reset('percentageControlEnabled')}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Trend</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="btn-group w-100" role="group" aria-label="Trend">
                {(['bullish', 'stable', 'bearish'] as MarketTrend[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-sm text-capitalize ${settings.currentTrend === t ? 'btn-primary' : 'btn-light'}`}
                    disabled={!canManage || !manual || !settings.trendControlEnabled}
                    onClick={() => void run(() => marketService.setTrend(t, adminId))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {reset('trendControlEnabled')}
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Volatility</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="btn-group w-100" role="group" aria-label="Volatility">
                {(['low', 'medium', 'high', 'extreme'] as MarketVolatility[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`btn btn-sm text-capitalize ${settings.currentVolatility === v ? 'btn-primary' : 'btn-light'}`}
                    disabled={!canManage || !manual || !settings.volatilityControlEnabled}
                    onClick={() => void run(() => marketService.setVolatility(v, adminId))}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {reset('volatilityControlEnabled')}
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Movement strength</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <input
                type="range"
                className="form-range"
                min={1}
                max={5}
                value={settings.movementStrength}
                aria-label="Movement strength"
                disabled={!canManage || !manual || !settings.movementControlEnabled}
                onChange={(e) => void run(() => marketService.setMovementStrength(Number(e.target.value), adminId))}
              />
              <p className="text-center text-muted fs-12 mb-0">{STRENGTH[settings.movementStrength - 1] ?? 'Medium'}</p>
              {reset('movementControlEnabled')}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHeader>
          <CardTitle as="h4">Presets</CardTitle>
          <p className="text-muted mb-0 fs-12">Save the current setup and switch back to it in one click.</p>
        </CardHeader>
        <CardBody className="pt-0">
          {canManage && (
            <form onSubmit={savePreset} className="d-flex gap-2 mb-3" style={{ maxWidth: 480 }}>
              <input className="form-control" placeholder="Preset name, e.g. Demo growth" value={presetName} onChange={(e) => setPresetName(e.target.value)} aria-label="Preset name" />
              <button type="submit" className="btn btn-primary text-nowrap" disabled={!presetName.trim()}>
                Save current
              </button>
            </form>
          )}
          {presets.length === 0 ? (
            <p className="text-muted mb-0">No presets yet.</p>
          ) : (
            <ul className="list-group">
              {presets.map((p) => (
                <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{p.name}</span>
                  {canManage && (
                    <span className="d-flex gap-1">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => void run(() => marketService.applyPreset(p, adminId), `Applied "${p.name}".`)}>
                        Apply
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() =>
                          void run(async () => {
                            await marketService.deletePreset(p.id)
                            setPresets(await marketService.listPresets())
                          }, 'Preset deleted.')
                        }
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default PlatformIndexControls
