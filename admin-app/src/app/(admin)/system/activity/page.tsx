'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { createActivityService, type ActivitySettings, type OnlineUserSettings } from '../../../../../../src/services/api/activityService'
import { useOnlineUserSimulator } from '../../../../../../src/features/operations/useOnlineUserSimulator'
import { useAuth } from '../../../../../../src/hooks/useAuth'

export const metadata: Metadata = { title: 'Activity Simulation' }

const activityService = createActivityService(supabase)

const EVENT_TYPES = ['deposit', 'withdrawal', 'investment', 'referral_bonus', 'plan_upgrade']
const ONLINE_FIELDS: { key: 'baseUsers' | 'minUsers' | 'maxUsers' | 'fluctuationSpeedMs'; label: string; step: number }[] = [
  { key: 'baseUsers', label: 'Typical', step: 50 },
  { key: 'minUsers', label: 'Minimum', step: 50 },
  { key: 'maxUsers', label: 'Maximum', step: 50 },
  { key: 'fluctuationSpeedMs', label: 'Changes every (ms)', step: 500 },
]

// Demo-mode activity and online-user simulation (ported from the old panel).
const ActivitySimulation = () => {
  const { profile } = useAuth()
  const canManage = profile?.role === 'super_admin'
  const { showNotification } = useNotificationContext()
  const [activity, setActivity] = useState<ActivitySettings | null>(null)
  const [online, setOnline] = useState<OnlineUserSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { count: liveCount } = useOnlineUserSimulator()

  const load = useCallback(async () => {
    try {
      const [a, o] = await Promise.all([activityService.getActivitySettings(), activityService.getOnlineUserSettings()])
      setActivity(a)
      setOnline(o)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the simulation settings.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveActivity = async (updates: Partial<ActivitySettings>) => {
    try {
      setActivity(await activityService.updateActivitySettings(updates))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    }
  }
  const saveOnline = async (updates: Partial<OnlineUserSettings>) => {
    try {
      setOnline(await activityService.updateOnlineUserSettings(updates))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!activity || !online) return <FallbackLoading />

  return (
    <>
      <div className="alert alert-info">
        For demos only. Simulated events are labeled as simulated and never touch real balances.
        {!canManage && ' Only a super admin can change these settings.'}
      </div>
      <Row>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Activity simulation</CardTitle>
                  <p className="text-muted mb-0 fs-12">Generates labeled demo activity at the pace you set.</p>
                </Col>
                <Col xs="auto">
                  <FormCheck
                    type="switch"
                    id="activityEnabled"
                    label={activity.enabled ? 'On' : 'Off'}
                    checked={activity.enabled}
                    disabled={!canManage}
                    onChange={(e) => void saveActivity({ enabled: e.target.checked })}
                  />
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              <Row className="g-3">
                <Col sm={4}>
                  <label htmlFor="frequency" className="form-label">
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    className="form-select text-capitalize"
                    value={activity.frequency}
                    disabled={!canManage}
                    onChange={(e) => void saveActivity({ frequency: e.target.value as ActivitySettings['frequency'] })}
                  >
                    {(['low', 'medium', 'high', 'custom'] as const).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Col>
                <Col sm={4}>
                  <label htmlFor="eventsPerHour" className="form-label">
                    Events per hour
                  </label>
                  <input
                    id="eventsPerHour"
                    type="number"
                    min={1}
                    step={5}
                    className="form-control"
                    defaultValue={activity.eventsPerHour}
                    disabled={!canManage}
                    onBlur={(e) => Number(e.target.value) !== activity.eventsPerHour && Number(e.target.value) >= 1 && void saveActivity({ eventsPerHour: Number(e.target.value) })}
                  />
                </Col>
                <Col sm={4}>
                  <label htmlFor="variation" className="form-label">
                    Variation
                  </label>
                  <select
                    id="variation"
                    className="form-select text-capitalize"
                    value={activity.variationLevel}
                    disabled={!canManage}
                    onChange={(e) => void saveActivity({ variationLevel: e.target.value as ActivitySettings['variationLevel'] })}
                  >
                    {(['low', 'medium', 'high'] as const).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Col>
              </Row>
              <span className="form-label d-block mt-3">Event types</span>
              <div className="d-flex flex-wrap gap-1">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`btn btn-sm text-capitalize ${activity.eventTypes.includes(type) ? 'btn-primary' : 'btn-light'}`}
                    disabled={!canManage}
                    onClick={() =>
                      void saveActivity({ eventTypes: activity.eventTypes.includes(type) ? activity.eventTypes.filter((t) => t !== type) : [...activity.eventTypes, type] })
                    }
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle as="h4">Online users</CardTitle>
                  <p className="text-muted mb-0 fs-12">A &ldquo;people online&rdquo; count that drifts between the limits.</p>
                </Col>
                <Col xs="auto">
                  <FormCheck
                    type="switch"
                    id="onlineEnabled"
                    label={online.enabled ? 'On' : 'Off'}
                    checked={online.enabled}
                    disabled={!canManage}
                    onChange={(e) => void saveOnline({ enabled: e.target.checked })}
                  />
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="pt-0">
              {online.enabled && liveCount !== null && (
                <p className="mb-3">
                  <span className="badge bg-info-subtle text-info fs-13">{liveCount.toLocaleString()} shown online right now</span>
                </p>
              )}
              <Row className="g-3">
                {ONLINE_FIELDS.map((f) => (
                  <Col sm={6} key={f.key}>
                    <label htmlFor={f.key} className="form-label">
                      {f.label}
                    </label>
                    <input
                      id={f.key}
                      type="number"
                      min={f.key === 'fluctuationSpeedMs' ? 1000 : 0}
                      step={f.step}
                      className="form-control"
                      defaultValue={online[f.key]}
                      disabled={!canManage}
                      onBlur={(e) => Number(e.target.value) !== online[f.key] && void saveOnline({ [f.key]: Number(e.target.value) })}
                    />
                  </Col>
                ))}
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ActivitySimulation
