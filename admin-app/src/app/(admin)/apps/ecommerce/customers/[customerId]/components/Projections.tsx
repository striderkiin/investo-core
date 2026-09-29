import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ApexOptions } from 'apexcharts'
import ReactApexChart from 'react-apexcharts'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'

import { useNotificationContext } from '@/context/useNotificationContext'
import { formatDateTime, formatMoney } from '@/investo/format'
import { investmentService, supabase } from '@/investo/services'
import { createProjectionService } from '../../../../../../../../../src/services/api/projectionService'
import { EXTERNAL_MARKETS } from '../../../../../../../../../src/services/market/externalMarketService'
import {
  buildProjectionSeries,
  newProjectionSeed,
  PROJECTION_CHARTS,
  type CustomerProjection,
  type ProjectionChart,
  type ProjectionMode,
  type ProjectionParams,
} from '../../../../../../../../../src/shared/projection'
import type { InvestmentPlan } from '../../../../../../../../../src/types/database'
import { usePermission } from '../../../../../../../../../src/hooks/usePermission'

const projectionService = createProjectionService(supabase)

const ASSETS = [{ id: 'platform', label: 'Platform Index' }, ...EXTERNAL_MARKETS]
const assetLabel = (id?: string) => ASSETS.find((a) => a.id === (id || 'platform'))?.label ?? id

// A plan's full-term return, used to pre-fill the target when a plan is picked.
const planReturnPct = (plan: InvestmentPlan) => {
  const periods = plan.rateType === 'daily' ? plan.durationDays : plan.rateType === 'weekly' ? plan.durationDays / 7 : plan.durationDays / 30
  return Math.round(plan.rate * periods * 100) / 100
}

const summary = (p: CustomerProjection, plans: InvestmentPlan[]) => {
  const { params } = p
  const sign = params.targetReturnPct >= 0 ? '+' : ''
  const base =
    p.chart === 'portfolio_composition'
      ? `${formatMoney(params.amount ?? 0)} in ${plans.find((x) => x.id === params.planId)?.name ?? 'a plan'}`
      : `${assetLabel(params.asset)} · ${p.mode === 'overlay' ? 'continues the real line' : 'replaces the chart'}`
  return `${base} · ${sign}${params.targetReturnPct}% over ${params.periodDays} days · ${params.curve === 'volatile' ? 'up and down' : 'steady'}`
}

type EditorProps = {
  chart: ProjectionChart
  existing: CustomerProjection | undefined
  plans: InvestmentPlan[]
  onClose: () => void
  onSave: (mode: ProjectionMode, params: ProjectionParams, enable: boolean) => Promise<void>
}

const ProjectionEditor = ({ chart, existing, plans, onClose, onSave }: EditorProps) => {
  const meta = PROJECTION_CHARTS.find((c) => c.chart === chart)!
  const isPortfolio = chart === 'portfolio_composition'
  const initial = existing?.params
  const [mode, setMode] = useState<ProjectionMode>(existing?.mode ?? 'replace')
  const [asset, setAsset] = useState(initial?.asset ?? 'platform')
  const [planId, setPlanId] = useState(initial?.planId ?? '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [periodDays, setPeriodDays] = useState(String(initial?.periodDays ?? 30))
  const [targetReturnPct, setTargetReturnPct] = useState(String(initial?.targetReturnPct ?? 10))
  const [curve, setCurve] = useState(initial?.curve ?? 'volatile')
  const [seed, setSeed] = useState(initial?.seed ?? newProjectionSeed())
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickPlan = (id: string) => {
    setPlanId(id)
    const plan = plans.find((p) => p.id === id)
    if (!plan) return
    setPeriodDays(String(plan.durationDays))
    setTargetReturnPct(String(planReturnPct(plan)))
    if (!amount) setAmount(String(plan.minAmount))
  }

  const params: ProjectionParams = {
    periodDays: Number(periodDays),
    targetReturnPct: Number(targetReturnPct),
    curve,
    seed,
    ...(note.trim() ? { note: note.trim().slice(0, 160) } : {}),
    ...(isPortfolio ? { planId: planId || undefined, amount: Number(amount) } : { asset, ...(mode === 'replace' && Number(amount) > 0 ? { amount: Number(amount) } : {}) }),
  }

  const valid =
    params.periodDays >= 1 &&
    params.periodDays <= 1825 &&
    Number.isFinite(params.targetReturnPct) &&
    params.targetReturnPct >= -95 &&
    params.targetReturnPct <= 1000 &&
    (!isPortfolio || (Number(amount) > 0 && Boolean(planId)))

  const preview = useMemo(() => (valid ? buildProjectionSeries(params, params.amount ?? 100) : []), [valid, JSON.stringify(params)]) // eslint-disable-line react-hooks/exhaustive-deps
  const previewOpts: ApexOptions = {
    chart: { type: 'area', height: 200, toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#a8442e'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    xaxis: { categories: preview.map((p) => p.date.toLocaleDateString([], { month: 'short', day: 'numeric' })), labels: { show: false }, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (v: number) => (isPortfolio || params.amount ? formatMoney(v) : v.toFixed(1)) } },
    tooltip: { y: { formatter: (v: number) => (isPortfolio || params.amount ? formatMoney(v) : v.toFixed(2)) } },
  }

  const submit = async (enable: boolean) => {
    setSaving(true)
    setError(null)
    try {
      await onSave(isPortfolio ? 'replace' : mode, params, enable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the projection.')
      setSaving(false)
    }
  }

  return (
    <Modal show onHide={onClose} centered size="lg">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit(true)
        }}
      >
        <ModalHeader closeButton>
          <ModalTitle as="h5">{meta.label} projection</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted">
            The customer sees this on their {meta.label} chart with a &ldquo;Projection&rdquo; label. It never changes their balance, statements or withdrawals.
          </p>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <Row className="g-3">
            {isPortfolio ? (
              <>
                <Col md={6}>
                  <label htmlFor="proj-plan" className="form-label">
                    Plan
                  </label>
                  <select id="proj-plan" className="form-select" value={planId} onChange={(e) => pickPlan(e.target.value)}>
                    <option value="">Choose a plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Col>
                <Col md={6}>
                  <label htmlFor="proj-amount" className="form-label">
                    Amount (USD)
                  </label>
                  <input id="proj-amount" type="number" min="1" step="any" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Col>
              </>
            ) : (
              <>
                <Col md={6}>
                  <label htmlFor="proj-asset" className="form-label">
                    Market
                  </label>
                  <select id="proj-asset" className="form-select" value={asset} onChange={(e) => setAsset(e.target.value)}>
                    {ASSETS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Col>
                <Col md={6}>
                  <label htmlFor="proj-mode" className="form-label">
                    Show it as
                  </label>
                  <select id="proj-mode" className="form-select" value={mode} onChange={(e) => setMode(e.target.value as ProjectionMode)}>
                    <option value="overlay">A dashed line continuing the real chart</option>
                    <option value="replace">The whole chart</option>
                  </select>
                </Col>
                {mode === 'replace' && (
                  <Col md={6}>
                    <label htmlFor="proj-amount" className="form-label">
                      Starting value <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="proj-amount"
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      placeholder="Current price"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Col>
                )}
              </>
            )}
            <Col md={3}>
              <label htmlFor="proj-days" className="form-label">
                Period (days)
              </label>
              <input id="proj-days" type="number" min="1" max="1825" className="form-control" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} />
            </Col>
            <Col md={3}>
              <label htmlFor="proj-return" className="form-label">
                Target return (%)
              </label>
              <input id="proj-return" type="number" min="-95" max="1000" step="any" className="form-control" value={targetReturnPct} onChange={(e) => setTargetReturnPct(e.target.value)} />
            </Col>
            <Col md={6}>
              <span className="form-label d-block">Curve</span>
              <div className="d-flex align-items-center gap-3 mt-2">
                <FormCheck type="radio" id="curve-steady" name="curve" label="Steady" checked={curve === 'steady'} onChange={() => setCurve('steady')} />
                <FormCheck type="radio" id="curve-volatile" name="curve" label="Up and down" checked={curve === 'volatile'} onChange={() => setCurve('volatile')} />
                <button type="button" className="btn btn-sm btn-light ms-auto" onClick={() => setSeed(newProjectionSeed())}>
                  New shape
                </button>
              </div>
            </Col>
            <Col md={12}>
              <label htmlFor="proj-note" className="form-label">
                Note for the customer <span className="text-muted">(optional)</span>
              </label>
              <input
                id="proj-note"
                className="form-control"
                maxLength={160}
                placeholder="e.g. As discussed on our call"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Col>
          </Row>
          <div className="mt-3 border rounded p-2">
            <small className="text-muted">
              Preview{!isPortfolio && !params.amount ? ' (shape only, starting from 100; the customer sees it from the current price)' : ''}
            </small>
            {preview.length > 0 ? (
              <ReactApexChart key={JSON.stringify(params)} type="area" height={200} options={previewOpts} series={[{ name: 'Projection', data: preview.map((p) => p.value) }]} />
            ) : (
              <p className="text-muted text-center py-4 mb-0">{isPortfolio ? 'Choose a plan and amount to see the preview.' : 'Enter a period and target return.'}</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          {existing && !existing.enabled && (
            <Button variant="outline-primary" disabled={saving || !valid} onClick={() => void submit(false)}>
              Save without turning on
            </Button>
          )}
          <Button variant="primary" type="submit" disabled={saving || !valid}>
            {saving ? 'Saving…' : existing?.enabled ? 'Save' : 'Save and turn on'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

const Projections = ({ customerId }: { customerId: string }) => {
  const { can } = usePermission()
  const canEdit = can('users.write')
  const { showNotification } = useNotificationContext()
  const [projections, setProjections] = useState<CustomerProjection[] | null>(null)
  const [plans, setPlans] = useState<InvestmentPlan[]>([])
  const [editing, setEditing] = useState<ProjectionChart | null>(null)

  const load = useCallback(() => {
    projectionService
      .listForUser(customerId)
      .then(setProjections)
      .catch(() => setProjections([]))
  }, [customerId])

  useEffect(() => {
    load()
    investmentService
      .listPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
  }, [load])

  const byChart = new Map((projections ?? []).map((p) => [p.chart, p]))

  const toggle = async (p: CustomerProjection) => {
    try {
      await projectionService.set(customerId, p.chart, !p.enabled, p.mode)
      showNotification({ message: `Projection turned ${p.enabled ? 'off' : 'on'}.`, variant: 'success' })
      load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not change the projection.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Chart projections</CardTitle>
            <p className="text-muted mb-0 fs-13">
              When this customer asks to see a scenario, set it up here. It shows only on their account, labeled &ldquo;Projection&rdquo;, and every change is recorded
              in the audit log.
            </p>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                <th>Chart</th>
                <th>Scenario</th>
                <th>Last changed</th>
                <th className="text-end">On for customer</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTION_CHARTS.map(({ chart, label }) => {
                const p = byChart.get(chart)
                return (
                  <tr key={chart}>
                    <td className="fw-semibold">{label}</td>
                    <td>
                      {p ? <span className="fs-13">{summary(p, plans)}</span> : <span className="text-muted">Not set up</span>}
                      {canEdit && (
                        <button type="button" className="btn btn-link btn-sm p-0 ms-2" onClick={() => setEditing(chart)}>
                          {p ? 'Edit' : 'Set up'}
                        </button>
                      )}
                    </td>
                    <td className="text-muted fs-13">{p ? formatDateTime(p.updatedAt) : '-'}</td>
                    <td className="text-end">
                      <FormCheck
                        type="switch"
                        id={`projection-${chart}`}
                        className="d-inline-block"
                        aria-label={`${label} projection on`}
                        checked={Boolean(p?.enabled)}
                        disabled={!canEdit || !p || projections === null}
                        onChange={() => p && void toggle(p)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
      {editing && (
        <ProjectionEditor
          chart={editing}
          existing={byChart.get(editing)}
          plans={plans}
          onClose={() => setEditing(null)}
          onSave={async (mode, params, enable) => {
            const current = byChart.get(editing)
            await projectionService.set(customerId, editing, current?.enabled || enable, mode, params)
            showNotification({ message: 'Projection saved.', variant: 'success' })
            setEditing(null)
            load()
          }}
        />
      )}
    </Card>
  )
}

export default Projections
