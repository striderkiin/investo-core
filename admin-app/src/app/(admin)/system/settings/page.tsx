'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { createSettingsService, type SystemSettings } from '../../../../../../src/services/api/settingsService'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Settings' }

const settingsService = createSettingsService(supabase)

type GeneralKey = 'siteName' | 'supportEmail' | 'supportPhone' | 'defaultCurrency' | 'timezone' | 'dateFormat'
const GENERAL: { key: GeneralKey; label: string; width: number; type?: string }[] = [
  { key: 'siteName', label: 'Site name', width: 6 },
  { key: 'supportEmail', label: 'Support email', width: 6, type: 'email' },
  { key: 'supportPhone', label: 'Support phone', width: 4 },
  { key: 'defaultCurrency', label: 'Currency', width: 4 },
  { key: 'timezone', label: 'Time zone', width: 4 },
  { key: 'dateFormat', label: 'Date format', width: 6 },
]

// General platform settings and sign-in policy (the old System Settings page).
const Settings = () => {
  const { can } = usePermission()
  const canManage = can('settings.manage')
  const { showNotification } = useNotificationContext()
  const [saved, setSaved] = useState<SystemSettings | null>(null)
  const [form, setForm] = useState<SystemSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    settingsService
      .get()
      .then((s) => {
        setSaved(s)
        setForm(s)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load settings.'))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!form || !saved) return <FallbackLoading />

  const save = async (updates: Partial<SystemSettings>, success: string) => {
    setSaving(true)
    try {
      const next = await settingsService.update(updates)
      setSaved(next)
      setForm((f) => (f ? { ...f, ...updates } : next))
      showNotification({ message: success, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const generalDirty = GENERAL.some((g) => form[g.key] !== saved[g.key])
  const policyDirty = form.sessionTimeoutMinutes !== saved.sessionTimeoutMinutes || form.loginAttemptLimit !== saved.loginAttemptLimit

  return (
    <>
      <p className="text-muted">
        Deposit, withdrawal and yield limits are on <Link href="/treasury">Treasury</Link>, plans on <Link href="/plans">Investment Plans</Link>, and maintenance mode on{' '}
        <Link href="/system/maintenance">Maintenance</Link>.
      </p>
      <Row>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">General</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <Row className="g-3">
                {GENERAL.map((g) => (
                  <Col md={g.width} key={g.key}>
                    <label htmlFor={g.key} className="form-label">
                      {g.label}
                    </label>
                    <input id={g.key} type={g.type ?? 'text'} className="form-control" value={form[g.key]} disabled={!canManage} onChange={(e) => setForm({ ...form, [g.key]: e.target.value })} />
                  </Col>
                ))}
              </Row>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!generalDirty || saving}
                  onClick={() => void save(Object.fromEntries(GENERAL.map((g) => [g.key, form[g.key]])) as Partial<SystemSettings>, 'General settings saved.')}
                >
                  Save general settings
                </Button>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Sign-in policy</CardTitle>
              <p className="text-muted mb-0 fs-12">Admins always need two-factor sign-in regardless of this setting.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <FormCheck
                type="switch"
                id="emailVerification"
                className="mb-2"
                label="Customers must verify their email"
                checked={form.emailVerificationRequired}
                disabled={!canManage || saving}
                onChange={(e) => void save({ emailVerificationRequired: e.target.checked }, 'Saved.')}
              />
              <FormCheck
                type="switch"
                id="twoFactorRequired"
                className="mb-3"
                label="Customers must use two-factor sign-in"
                checked={form.twoFactorRequired}
                disabled={!canManage || saving}
                onChange={(e) => void save({ twoFactorRequired: e.target.checked }, 'Saved.')}
              />
              <Row className="g-3">
                <Col sm={6}>
                  <label htmlFor="sessionTimeout" className="form-label">
                    Sign out after idle (minutes)
                  </label>
                  <input
                    id="sessionTimeout"
                    type="number"
                    min={5}
                    step={5}
                    className="form-control"
                    value={form.sessionTimeoutMinutes}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })}
                  />
                </Col>
                <Col sm={6}>
                  <label htmlFor="loginAttempts" className="form-label">
                    Failed sign-ins before lockout
                  </label>
                  <input
                    id="loginAttempts"
                    type="number"
                    min={1}
                    className="form-control"
                    value={form.loginAttemptLimit}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, loginAttemptLimit: Number(e.target.value) })}
                  />
                </Col>
              </Row>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!policyDirty || saving || form.sessionTimeoutMinutes < 5 || form.loginAttemptLimit < 1}
                  onClick={() => void save({ sessionTimeoutMinutes: form.sessionTimeoutMinutes, loginAttemptLimit: form.loginAttemptLimit }, 'Sign-in policy saved.')}
                >
                  Save policy
                </Button>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Settings
