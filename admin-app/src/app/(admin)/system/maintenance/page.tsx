'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { createMaintenanceService, type MaintenanceSettings } from '../../../../../../src/services/api/maintenanceService'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Maintenance' }

const maintenanceService = createMaintenanceService(supabase)

type ToggleKey = 'pauseYield' | 'disableWithdrawals' | 'disableDeposits' | 'showBanner' | 'restrictClientAccess' | 'allowAdminAccess'
const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: 'showBanner', label: 'Show banner', description: 'Display the maintenance banner across the site and dashboard.' },
  { key: 'restrictClientAccess', label: 'Close the customer dashboard', description: 'Customers see a maintenance screen instead of their dashboard.' },
  { key: 'allowAdminAccess', label: 'Keep admin access', description: 'Admins can still sign in while customers are locked out.' },
  { key: 'disableDeposits', label: 'Pause deposits', description: 'Blocks new deposits (enforced on the server).' },
  { key: 'disableWithdrawals', label: 'Pause withdrawals', description: 'Blocks new withdrawal requests (enforced on the server).' },
  { key: 'pauseYield', label: 'Pause earnings', description: 'Stops investment earnings from accruing.' },
]

// Maintenance mode (ported from the old panel).
const Maintenance = () => {
  const { can } = usePermission()
  const canManage = can('settings.manage')
  const { showNotification } = useNotificationContext()
  const [form, setForm] = useState<MaintenanceSettings | null>(null)
  const [banner, setBanner] = useState({ title: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const m = await maintenanceService.get()
      setForm(m)
      setBanner({ title: m.bannerTitle, message: m.bannerMessage })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load maintenance settings.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (updates: Partial<MaintenanceSettings>, success?: string) => {
    setSaving(true)
    try {
      setForm(await maintenanceService.update(updates))
      if (success) showNotification({ message: success, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!form) return <FallbackLoading />

  return (
    <>
      <Card className={form.enabled ? 'border border-warning' : undefined}>
        <CardBody>
          <Row className="align-items-center">
            <Col>
              <h4 className="mb-1">Maintenance mode</h4>
              <p className="text-muted mb-0">Master switch. The options below only apply while this is on.</p>
            </Col>
            <Col xs="auto">
              <FormCheck
                type="switch"
                id="maintenanceEnabled"
                className="fs-18"
                label={form.enabled ? 'On' : 'Off'}
                checked={form.enabled}
                disabled={!canManage || saving}
                onChange={(e) => {
                  if (e.target.checked && !window.confirm('Turn on maintenance mode? The options below take effect immediately.')) return
                  void persist({ enabled: e.target.checked }, e.target.checked ? 'Maintenance mode on.' : 'Maintenance mode off.')
                }}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>
      <Row>
        {TOGGLES.map((t) => (
          <Col md={6} xl={4} key={t.key}>
            <Card className="h-100">
              <CardBody className="d-flex justify-content-between gap-2">
                <div>
                  <p className="fw-semibold mb-1">{t.label}</p>
                  <p className="text-muted fs-12 mb-0">{t.description}</p>
                </div>
                <FormCheck
                  type="switch"
                  aria-label={t.label}
                  checked={form[t.key]}
                  disabled={!canManage || !form.enabled || saving}
                  onChange={(e) => void persist({ [t.key]: e.target.checked })}
                />
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle as="h4">Banner</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="mb-3">
            <label htmlFor="bannerTitle" className="form-label">
              Title
            </label>
            <input id="bannerTitle" className="form-control" value={banner.title} disabled={!canManage} onChange={(e) => setBanner({ ...banner, title: e.target.value })} />
          </div>
          <div className="mb-3">
            <label htmlFor="bannerMessage" className="form-label">
              Message
            </label>
            <textarea id="bannerMessage" className="form-control" rows={2} value={banner.message} disabled={!canManage} onChange={(e) => setBanner({ ...banner, message: e.target.value })} />
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving || (banner.title === form.bannerTitle && banner.message === form.bannerMessage)}
              onClick={() => void persist({ bannerTitle: banner.title, bannerMessage: banner.message }, 'Banner saved.')}
            >
              Save banner
            </button>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default Maintenance
