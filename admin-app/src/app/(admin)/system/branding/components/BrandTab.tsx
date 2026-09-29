import { useEffect, useState, type ChangeEvent } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { brandingService, supabase } from '@/investo/services'
import type { Branding, ThemeMode } from '../../../../../../../src/services/api/brandingService'
import { createSocialLinksService } from '../../../../../../../src/services/api/socialLinksService'
import { SOCIAL_PLATFORM_META } from '../../../../../../../src/components/public/socialPlatforms'
import type { SocialLink } from '../../../../../../../src/types/database'

const socialLinksService = createSocialLinksService(supabase)

type ColorKey = 'primaryColor' | 'secondaryColor' | 'successColor' | 'warningColor' | 'dangerColor' | 'backgroundColor' | 'surfaceColor' | 'textColor'
const COLORS: { key: ColorKey; label: string }[] = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'successColor', label: 'Success' },
  { key: 'warningColor', label: 'Warning' },
  { key: 'dangerColor', label: 'Danger' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'surfaceColor', label: 'Surface' },
  { key: 'textColor', label: 'Text' },
]
const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat']
type AssetKind = 'logo' | 'logo-light' | 'logo-dark' | 'favicon'
const ASSETS: { kind: AssetKind; label: string; field: 'logoUrl' | 'logoLightUrl' | 'logoDarkUrl' | 'faviconUrl'; hint: string }[] = [
  { kind: 'logo', label: 'Logo', field: 'logoUrl', hint: 'Default logo' },
  { kind: 'logo-light', label: 'Logo for light backgrounds', field: 'logoLightUrl', hint: 'Used on white pages' },
  { kind: 'logo-dark', label: 'Logo for dark backgrounds', field: 'logoDarkUrl', hint: 'Used on dark pages' },
  { kind: 'favicon', label: 'Favicon', field: 'faviconUrl', hint: 'Browser tab icon, square' },
]

// Site name, logos, colors, fonts and social links (the old Branding page).
const BrandTab = ({ canManage }: { canManage: boolean }) => {
  const { showNotification } = useNotificationContext()
  const [form, setForm] = useState<Branding | null>(null)
  const [saved, setSaved] = useState<Branding | null>(null)
  const [links, setLinks] = useState<SocialLink[]>([])
  const [uploading, setUploading] = useState<AssetKind | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([brandingService.get(), socialLinksService.listAll()])
      .then(([b, l]) => {
        setForm(b)
        setSaved(b)
        setLinks(l)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load branding.'))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!form || !saved) return <FallbackLoading />

  const set = <K extends keyof Branding>(key: K, value: Branding[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  const upload = async (e: ChangeEvent<HTMLInputElement>, kind: AssetKind, field: (typeof ASSETS)[number]['field']) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(kind)
    try {
      set(field, await brandingService.uploadAsset(file, kind))
      showNotification({ message: 'Uploaded. Save changes to publish it.', variant: 'info' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Upload failed.', variant: 'danger' })
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { id: _id, ...updates } = form
      const next = await brandingService.update(updates)
      setForm(next)
      setSaved(next)
      showNotification({ message: 'Branding saved and live.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const updateLink = async (id: string, updates: Partial<{ url: string; enabled: boolean }>) => {
    try {
      const updated = await socialLinksService.update(id, updates)
      setLinks((cur) => cur.map((l) => (l.id === id ? updated : l)))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not update the link.', variant: 'danger' })
    }
  }

  return (
    <>
      {canManage && (
        <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
          {dirty && <span className="text-muted fs-13">Unsaved changes</span>}
          <Button variant="light" disabled={!dirty || saving} onClick={() => setForm(saved)}>
            Discard
          </Button>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
      <Row>
        <Col lg={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Identity</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="mb-3">
                <label htmlFor="siteName" className="form-label">
                  Site name
                </label>
                <input id="siteName" className="form-control" value={form.siteName} disabled={!canManage} onChange={(e) => set('siteName', e.target.value)} />
                <div className="form-text">Shown in page titles, the dashboards, emails and the footer.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="logoText" className="form-label">
                  Logo text <span className="text-muted">(optional, used when there is no logo image)</span>
                </label>
                <input id="logoText" className="form-control" value={form.logoText ?? ''} disabled={!canManage} onChange={(e) => set('logoText', e.target.value || null)} />
              </div>
              <Row className="g-3">
                <Col sm={4}>
                  <label htmlFor="theme" className="form-label">
                    Theme
                  </label>
                  <select id="theme" className="form-select" value={form.theme} disabled={!canManage} onChange={(e) => set('theme', e.target.value as ThemeMode)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">Follow device</option>
                  </select>
                </Col>
                <Col sm={4}>
                  <label htmlFor="primaryFont" className="form-label">
                    Body font
                  </label>
                  <select id="primaryFont" className="form-select" value={form.primaryFont} disabled={!canManage} onChange={(e) => set('primaryFont', e.target.value)}>
                    {FONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Col>
                <Col sm={4}>
                  <label htmlFor="headingFont" className="form-label">
                    Heading font
                  </label>
                  <select id="headingFont" className="form-select" value={form.headingFont} disabled={!canManage} onChange={(e) => set('headingFont', e.target.value)}>
                    {FONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Col>
              </Row>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Logos</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {ASSETS.map((a) => (
                <div key={a.kind} className="d-flex align-items-center gap-3 mb-3">
                  <div className="border rounded d-flex align-items-center justify-content-center bg-light" style={{ width: 56, height: 56 }}>
                    {form[a.field] ? <img src={form[a.field]!} alt="" style={{ maxWidth: 48, maxHeight: 48 }} /> : <small className="text-muted">none</small>}
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-1 fw-semibold fs-13">
                      {a.label} <span className="text-muted fw-normal">· {a.hint}</span>
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control form-control-sm"
                      aria-label={`Upload ${a.label}`}
                      disabled={!canManage || uploading === a.kind}
                      onChange={(e) => void upload(e, a.kind, a.field)}
                    />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Colors</CardTitle>
              <p className="text-muted mb-0 fs-12">Used by the public website. The admin panel keeps its own theme.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <Row className="g-3">
                {COLORS.map((c) => (
                  <Col sm={6} key={c.key}>
                    <label htmlFor={c.key} className="form-label">
                      {c.label}
                    </label>
                    <div className="input-group">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        aria-label={`${c.label} color picker`}
                        value={form[c.key]}
                        disabled={!canManage}
                        onChange={(e) => set(c.key, e.target.value)}
                      />
                      <input id={c.key} className="form-control" value={form[c.key]} disabled={!canManage} onChange={(e) => set(c.key, e.target.value)} />
                    </div>
                  </Col>
                ))}
              </Row>
              <div className="rounded p-3 mt-3 d-flex gap-2 flex-wrap" style={{ background: form.backgroundColor, color: form.textColor, fontFamily: `${form.primaryFont}, sans-serif` }}>
                <span className="fw-semibold me-auto" style={{ fontFamily: `${form.headingFont}, sans-serif` }}>
                  {form.siteName} preview
                </span>
                {(['primaryColor', 'successColor', 'warningColor', 'dangerColor'] as const).map((k) => (
                  <span key={k} className="badge px-3 py-2" style={{ background: form[k], color: '#fff' }}>
                    {k.replace('Color', '')}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Social links</CardTitle>
              <p className="text-muted mb-0 fs-12">Shown on the website&apos;s contact section and footer. Only switched-on links appear. Saved as you go.</p>
            </CardHeader>
            <CardBody className="pt-0">
              {links.map((link) => {
                const meta = SOCIAL_PLATFORM_META[link.platform]
                const Icon = meta.icon
                return (
                  <div key={link.id} className="d-flex align-items-center gap-2 mb-2">
                    <Icon width={18} height={18} className="text-primary flex-shrink-0" />
                    <span className="fs-13" style={{ minWidth: 96 }}>
                      {meta.label}
                    </span>
                    <input
                      type="url"
                      className="form-control form-control-sm"
                      aria-label={`${meta.label} link`}
                      defaultValue={link.url === '#' ? '' : link.url}
                      placeholder="https://"
                      disabled={!canManage}
                      onBlur={(e) => (e.target.value || '#') !== link.url && void updateLink(link.id, { url: e.target.value || '#' })}
                    />
                    <FormCheck type="switch" aria-label={`Show ${meta.label}`} checked={link.enabled} disabled={!canManage} onChange={(e) => void updateLink(link.id, { enabled: e.target.checked })} />
                  </div>
                )
              })}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default BrandTab
