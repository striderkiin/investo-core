'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Nav, NavItem, NavLink, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import type { SocialProofDemoActivity, SocialProofMetric, SocialProofSettings, SocialProofTemplate } from '../../../../../../src/types/database'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import DemoTicker from './components/DemoTicker'
import { ALL_EVENT_TYPES, EVENT_TYPE_LABELS, socialProofService, toggleIn } from './service'

export const metadata: Metadata = { title: 'Social Proof' }

type Tab = 'ticker' | 'real' | 'test' | 'analytics'
type NumberKey = 'displayDurationSeconds' | 'minDelaySeconds' | 'maxDelaySeconds' | 'maxQueue' | 'maxPerSession' | 'maxPerMinute'

const NUMBER_FIELDS: { key: NumberKey; label: string }[] = [
  { key: 'displayDurationSeconds', label: 'Show for (seconds)' },
  { key: 'minDelaySeconds', label: 'Min gap (seconds)' },
  { key: 'maxDelaySeconds', label: 'Max gap (seconds)' },
  { key: 'maxQueue', label: 'Max queued' },
  { key: 'maxPerSession', label: 'Max per visit' },
  { key: 'maxPerMinute', label: 'Max per minute' },
]
const SAMPLE = { name: 'Alex K.', siteName: 'the platform', planName: 'Growth Plan', amount: '$500' }

const EventTypeButtons = ({ selected, disabled, variant, onToggle }: { selected: string[]; disabled: boolean; variant: string; onToggle: (type: string) => void }) => (
  <div className="d-flex flex-wrap gap-1">
    {ALL_EVENT_TYPES.map((type) => (
      <button key={type} type="button" className={`btn btn-sm ${selected.includes(type) ? `btn-${variant}` : 'btn-light'}`} disabled={disabled} onClick={() => onToggle(type)}>
        {EVENT_TYPE_LABELS[type]}
      </button>
    ))}
  </div>
)

// Social proof pop-ups (ported from the old panel): the demo ticker, real
// activity settings and templates, the admin test stream, and analytics.
const SocialProof = () => {
  const { can } = usePermission()
  const canManage = can('social_proof.manage')
  const { showNotification } = useNotificationContext()
  const [tab, setTab] = useState<Tab>('ticker')
  const [settings, setSettings] = useState<SocialProofSettings | null>(null)
  const [templates, setTemplates] = useState<SocialProofTemplate[]>([])
  const [metrics, setMetrics] = useState<SocialProofMetric[]>([])
  const [activities, setActivities] = useState<SocialProofDemoActivity[]>([])
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, t, m, d] = await Promise.all([
        socialProofService.getSettings(),
        socialProofService.listTemplates(),
        socialProofService.getAnalytics(),
        socialProofService.listAllDemoActivities(),
      ])
      setSettings(s)
      setTemplates(t)
      setMetrics(m)
      setActivities(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load social proof.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (updates: Partial<SocialProofSettings>) => {
    if (!settings || !canManage) return
    try {
      setSettings(await socialProofService.updateSettings(settings.id, updates))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    }
  }

  const saveTemplate = async (id: string, template: string) => {
    try {
      const updated = await socialProofService.updateTemplate(id, template)
      setTemplates((cur) => cur.map((t) => (t.id === id ? updated : t)))
      showNotification({ message: 'Template saved.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save the template.', variant: 'danger' })
    }
  }

  const previewMessage = (type: string) => {
    const template = templates.find((t) => t.eventType === type)?.template ?? `{name}: ${type}`
    return Object.entries(SAMPLE).reduce((msg, [k, v]) => msg.replaceAll(`{${k}}`, v), template)
  }

  const sendTest = async (type: string) => {
    try {
      await socialProofService.sendTestEventToClientStream(type, SAMPLE, 500, SAMPLE.planName)
      showNotification({ message: 'Sent to signed-in customer dashboards.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not send.', variant: 'danger' })
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!settings) return <FallbackLoading />

  return (
    <>
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => k && setTab(k as Tab)}>
        <NavItem>
          <NavLink eventKey="ticker">Demo ticker</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="real">Real activity</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="test">Test &amp; preview</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="analytics">Analytics</NavLink>
        </NavItem>
      </Nav>

      {tab === 'ticker' && <DemoTicker settings={settings} activities={activities} setActivities={setActivities} canManage={canManage} persist={persist} />}

      {tab === 'real' && (
        <>
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Real activity pop-ups</CardTitle>
                  <p className="text-muted mb-0 fs-12">Shown only for genuine, confirmed activity. Nothing here is generated.</p>
                </Col>
                <Col xs="auto">
                  <FormCheck type="switch" id="spEnabled" label={settings.enabled ? 'On' : 'Off'} checked={settings.enabled} disabled={!canManage} onChange={(e) => void persist({ enabled: e.target.checked })} />
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <Row className="g-3">
                {NUMBER_FIELDS.map((f) => (
                  <Col sm={4} lg={2} key={f.key}>
                    <label htmlFor={f.key} className="form-label">
                      {f.label}
                    </label>
                    <input
                      id={f.key}
                      type="number"
                      min={0}
                      className="form-control"
                      defaultValue={settings[f.key]}
                      disabled={!canManage}
                      onBlur={(e) => Number(e.target.value) !== settings[f.key] && void persist({ [f.key]: Number(e.target.value) })}
                    />
                  </Col>
                ))}
                <Col sm={6} lg={3}>
                  <label htmlFor="popupPosition" className="form-label">
                    Position
                  </label>
                  <select
                    id="popupPosition"
                    className="form-select"
                    value={settings.popupPosition}
                    disabled={!canManage}
                    onChange={(e) => void persist({ popupPosition: e.target.value as SocialProofSettings['popupPosition'] })}
                  >
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                  </select>
                </Col>
                <Col sm={6} lg={3}>
                  <label htmlFor="privacyMode" className="form-label">
                    Show customer names as
                  </label>
                  <select
                    id="privacyMode"
                    className="form-select"
                    value={settings.privacyMode}
                    disabled={!canManage}
                    onChange={(e) => void persist({ privacyMode: e.target.value as SocialProofSettings['privacyMode'] })}
                  >
                    <option value="first_name">First name only</option>
                    <option value="first_initial">First name and initial</option>
                    <option value="anonymous">Anonymous (&ldquo;A member&rdquo;)</option>
                  </select>
                </Col>
                <Col lg={6} className="d-flex align-items-end gap-4">
                  <FormCheck type="switch" id="spSound" label="Sound" checked={settings.enableSound} disabled={!canManage} onChange={(e) => void persist({ enableSound: e.target.checked })} />
                  <FormCheck
                    type="switch"
                    id="spClose"
                    label="Close button"
                    checked={settings.showCloseButton}
                    disabled={!canManage}
                    onChange={(e) => void persist({ showCloseButton: e.target.checked })}
                  />
                </Col>
              </Row>
              <span className="form-label d-block mt-3">Activity that triggers a pop-up</span>
              <EventTypeButtons selected={settings.enabledEventTypes} disabled={!canManage} variant="primary" onToggle={(type) => void persist({ enabledEventTypes: toggleIn(settings.enabledEventTypes, type) })} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Templates</CardTitle>
              <p className="text-muted mb-0 fs-12">Placeholders: {'{name} {city} {country} {planName} {siteName} {timeAgo} {amount}'}</p>
            </CardHeader>
            <CardBody className="pt-0">
              {templates.map((t) => (
                <Row key={t.id} className="align-items-center g-2 mb-2">
                  <Col sm={3}>
                    <label htmlFor={`tpl-${t.id}`} className="mb-0">
                      {EVENT_TYPE_LABELS[t.eventType] ?? t.eventType}
                    </label>
                  </Col>
                  <Col sm={9}>
                    <input
                      id={`tpl-${t.id}`}
                      className="form-control"
                      defaultValue={t.template}
                      disabled={!canManage}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== t.template && void saveTemplate(t.id, e.target.value)}
                    />
                  </Col>
                </Row>
              ))}
            </CardBody>
          </Card>
        </>
      )}

      {tab === 'test' && (
        <Row>
          <Col lg={6}>
            <Card className={settings.testModeEnabled ? 'border border-warning' : undefined}>
              <CardHeader>
                <Row className="align-items-center">
                  <Col>
                    <CardTitle as="h4">Test notifications</CardTitle>
                    <p className="text-muted mb-0 fs-12">
                      Lets you push sample pop-ups to signed-in customer dashboards, e.g. for a demo video. Creates no money records. Turn it off before launch.
                    </p>
                  </Col>
                  <Col xs="auto">
                    <FormCheck
                      type="switch"
                      id="spTestMode"
                      label={settings.testModeEnabled ? 'On' : 'Off'}
                      checked={settings.testModeEnabled}
                      disabled={!canManage}
                      onChange={(e) => void persist({ testModeEnabled: e.target.checked })}
                    />
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="pt-0">
                <span className="form-label d-block">Types allowed in the test stream</span>
                <EventTypeButtons selected={settings.testEventTypes} disabled={!canManage} variant="warning" onToggle={(type) => void persist({ testEventTypes: toggleIn(settings.testEventTypes, type) })} />
              </CardBody>
            </Card>
          </Col>
          <Col lg={6}>
            <Card>
              <CardHeader>
                <CardTitle as="h4">Preview</CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {ALL_EVENT_TYPES.map((type) => (
                    <button key={type} type="button" className={`btn btn-sm ${previewType === type ? 'btn-primary' : 'btn-light'}`} onClick={() => setPreviewType(type)}>
                      {EVENT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
                {previewType ? (
                  <div className="d-flex align-items-center gap-2 p-3 border rounded shadow-sm bg-body" style={{ maxWidth: 360 }}>
                    <UserAvatar name={SAMPLE.name} className="thumb-md" />
                    <div>
                      <p className="mb-0 fw-semibold fs-13">{previewMessage(previewType)}</p>
                      <small className="text-muted">Just now</small>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Pick a type to see how the pop-up reads.</p>
                )}
                <button
                  type="button"
                  className="btn btn-warning btn-sm mt-3"
                  disabled={!canManage || !previewType || !settings.testModeEnabled}
                  onClick={() => previewType && void sendTest(previewType)}
                >
                  Send to customer dashboards
                </button>
                {!settings.testModeEnabled && <p className="text-muted fs-12 mt-2 mb-0">Turn on test notifications to send.</p>}
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {tab === 'analytics' && (
        <Card>
          <CardHeader>
            <CardTitle as="h4">Analytics</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {metrics.length === 0 ? (
              <p className="text-muted mb-0">No pop-ups shown yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th className="text-end">Shown</th>
                      <th className="text-end">Clicked</th>
                      <th className="text-end">Click rate</th>
                      <th className="text-end">Dismissed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={`${m.metricDate}-${m.eventType}-${m.source}`}>
                        <td>{m.metricDate}</td>
                        <td>{EVENT_TYPE_LABELS[m.eventType] ?? m.eventType}</td>
                        <td>
                          <span className={`badge bg-${m.source === 'production' ? 'success' : 'warning'}-subtle text-${m.source === 'production' ? 'success' : 'warning'}`}>
                            {m.source === 'production' ? 'Real' : 'Test'}
                          </span>
                        </td>
                        <td className="text-end">{m.shownCount}</td>
                        <td className="text-end">{m.clickedCount}</td>
                        <td className="text-end">{m.shownCount > 0 ? `${((m.clickedCount / m.shownCount) * 100).toFixed(1)}%` : '-'}</td>
                        <td className="text-end">{m.dismissedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  )
}

export default SocialProof
