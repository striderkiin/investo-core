import { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { createWhiteLabelService, type DomainStatus, type WhiteLabelSettings } from '../../../../../../../src/services/api/whiteLabelService'

const whiteLabelService = createWhiteLabelService(supabase)

type TextKey = { [K in keyof WhiteLabelSettings]: WhiteLabelSettings[K] extends string | null ? K : never }[keyof WhiteLabelSettings]
type Field = { key: TextKey; label: string; width?: number; placeholder?: string; type?: string }

const SECTIONS: { title: string; subtitle?: string; fields: Field[] }[] = [
  {
    title: 'Company',
    fields: [
      { key: 'platformName', label: 'Platform name' },
      { key: 'displayName', label: 'Display name' },
      { key: 'legalBusinessName', label: 'Legal business name' },
      { key: 'website', label: 'Website', placeholder: 'https://' },
      { key: 'shortDescription', label: 'Short description', width: 12 },
    ],
  },
  {
    title: 'Support contact',
    fields: [
      { key: 'supportName', label: 'Support name', width: 4 },
      { key: 'supportEmail', label: 'Support email', width: 4, type: 'email' },
      { key: 'supportPhone', label: 'Support phone', width: 4 },
      { key: 'supportAddress', label: 'Support address', width: 12 },
    ],
  },
  {
    title: 'Registration',
    fields: [
      { key: 'businessName', label: 'Business name' },
      { key: 'businessRegistrationNumber', label: 'Registration number' },
      { key: 'businessAddress', label: 'Registered address', width: 12 },
      { key: 'country', label: 'Country', width: 4 },
      { key: 'timezone', label: 'Time zone', width: 4, placeholder: 'e.g. Europe/London' },
      { key: 'defaultCurrency', label: 'Currency', width: 4, placeholder: 'USD' },
    ],
  },
  {
    title: 'Domain',
    subtitle: 'Records the domain you use. Point its DNS to your host yourself; status is for your reference.',
    fields: [
      { key: 'primaryDomain', label: 'Primary domain', placeholder: 'app.example.com' },
      { key: 'applicationUrl', label: 'App URL', placeholder: 'https://' },
      { key: 'apiUrl', label: 'API URL', placeholder: 'https://' },
      { key: 'supportUrl', label: 'Support URL', placeholder: 'https://' },
    ],
  },
]

const DOMAIN_STATUSES: { value: DomainStatus; label: string }[] = [
  { value: 'not_configured', label: 'Not set up' },
  { value: 'pending_verification', label: 'Waiting for DNS' },
  { value: 'verified', label: 'Verified' },
  { value: 'active', label: 'Live' },
]

// Company, support and domain details (the old White Label page).
const BusinessTab = ({ canManage }: { canManage: boolean }) => {
  const { showNotification } = useNotificationContext()
  const [form, setForm] = useState<WhiteLabelSettings | null>(null)
  const [saved, setSaved] = useState<WhiteLabelSettings | null>(null)
  const [regions, setRegions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    whiteLabelService
      .get()
      .then((w) => {
        setForm(w)
        setSaved(w)
        setRegions(w.operatingRegions.join(', '))
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load business details.'))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!form || !saved) return <FallbackLoading />

  const current = {
    ...form,
    operatingRegions: regions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
  const dirty = JSON.stringify(current) !== JSON.stringify(saved)

  const save = async () => {
    setSaving(true)
    try {
      const { id: _id, ...updates } = current
      const next = await whiteLabelService.update(updates)
      setForm(next)
      setSaved(next)
      setRegions(next.operatingRegions.join(', '))
      showNotification({ message: 'Business details saved.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const input = (f: Field) => (
    <Col md={f.width ?? 6} key={f.key}>
      <label htmlFor={f.key} className="form-label">
        {f.label}
      </label>
      <input
        id={f.key}
        type={f.type ?? 'text'}
        className="form-control"
        placeholder={f.placeholder}
        value={form[f.key] ?? ''}
        disabled={!canManage}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value || (f.key in { primaryDomain: 1, applicationUrl: 1, apiUrl: 1, supportUrl: 1 } ? null : '') })}
      />
    </Col>
  )

  return (
    <>
      {canManage && (
        <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
          {dirty && <span className="text-muted fs-13">Unsaved changes</span>}
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
      <Row>
        {SECTIONS.map((s) => (
          <Col lg={6} key={s.title}>
            <Card>
              <CardHeader>
                <CardTitle as="h4">{s.title}</CardTitle>
                {s.subtitle && <p className="text-muted mb-0 fs-12">{s.subtitle}</p>}
              </CardHeader>
              <CardBody className="pt-0">
                <Row className="g-3">
                  {s.fields.map(input)}
                  {s.title === 'Registration' && (
                    <Col md={12}>
                      <label htmlFor="operatingRegions" className="form-label">
                        Operating regions <span className="text-muted">(comma separated)</span>
                      </label>
                      <input id="operatingRegions" className="form-control" value={regions} disabled={!canManage} onChange={(e) => setRegions(e.target.value)} />
                    </Col>
                  )}
                  {s.title === 'Domain' && (
                    <Col md={6}>
                      <label htmlFor="domainStatus" className="form-label">
                        Status
                      </label>
                      <select
                        id="domainStatus"
                        className="form-select"
                        value={form.domainStatus}
                        disabled={!canManage}
                        onChange={(e) => setForm({ ...form, domainStatus: e.target.value as DomainStatus })}
                      >
                        {DOMAIN_STATUSES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </Col>
                  )}
                </Row>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}

export default BusinessTab
