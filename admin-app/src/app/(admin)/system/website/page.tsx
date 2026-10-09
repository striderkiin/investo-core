'use client'
import type { Metadata } from 'next'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import { createSiteContentService } from '../../../../../../src/services/api/siteContentService'
import { CONTENT_SECTIONS, type ContentField } from '../../../../../../src/features/siteContent/landingContent'

export const metadata: Metadata = { title: 'Landing Page' }

const siteContentService = createSiteContentService(supabase)

// Text and pictures on the public landing page. Each field shows the
// original text until it is changed; "Use default" puts the original back.
const WebsitePage = () => {
  const { can } = usePermission()
  const canManage = can('branding.manage')
  const { showNotification } = useNotificationContext()
  const [saved, setSaved] = useState<Record<string, string> | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [sectionId, setSectionId] = useState(CONTENT_SECTIONS[0].id)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    siteContentService
      .getAll()
      .then((rows) => {
        setSaved(rows)
        setForm(rows)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the landing page text.'))
  }, [])

  // Fields whose value differs from what is saved. null means "remove the saved value".
  const changes = useMemo(() => {
    const out: Record<string, string | null> = {}
    if (!saved) return out
    for (const key of new Set([...Object.keys(saved), ...Object.keys(form)])) {
      if (form[key] === saved[key]) continue
      out[key] = key in form ? form[key] : null
    }
    return out
  }, [form, saved])
  const changeCount = Object.keys(changes).length

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!saved) return <FallbackLoading />

  const section = CONTENT_SECTIONS.find((s) => s.id === sectionId) ?? CONTENT_SECTIONS[0]
  const valueOf = (field: ContentField) => form[field.key] ?? field.default
  const isCustom = (field: ContentField) => field.key in form
  const changedIn = (fields: ContentField[]) => fields.filter((f) => f.key in changes).length

  const setValue = (field: ContentField, value: string) =>
    setForm((cur) => {
      const next = { ...cur }
      // Typing the original text back is the same as using the default.
      if (value === field.default) delete next[field.key]
      else next[field.key] = value
      return next
    })

  const resetField = (field: ContentField) =>
    setForm((cur) => {
      const next = { ...cur }
      delete next[field.key]
      return next
    })

  const upload = async (e: ChangeEvent<HTMLInputElement>, field: ContentField) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(field.key)
    try {
      setValue(field, await siteContentService.uploadImage(file, field.key))
      showNotification({ message: 'Picture uploaded. Save changes to put it on the site.', variant: 'info' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Upload failed.', variant: 'danger' })
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await siteContentService.save(changes)
      const rows = await siteContentService.getAll()
      setSaved(rows)
      setForm(rows)
      showNotification({ message: 'Saved. The website shows the new content now.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <p className="text-muted mb-0">Change the words and pictures on your public website and its legal pages. Plans, prices, logo and colors are set in Plans and Branding.</p>
        <div className="d-flex align-items-center gap-2">
          <a className="btn btn-light" href="/" target="_blank" rel="noreferrer">
            View site
          </a>
          {canManage && (
            <>
              {changeCount > 0 && <span className="text-muted fs-13">{changeCount === 1 ? '1 unsaved change' : `${changeCount} unsaved changes`}</span>}
              <Button variant="light" disabled={changeCount === 0 || saving} onClick={() => setForm(saved)}>
                Discard
              </Button>
              <Button variant="primary" disabled={changeCount === 0 || saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      </div>
      {!canManage && <div className="alert alert-info">Read only: your role can view the landing page content but not change it.</div>}
      <Row>
        <Col lg={3}>
          <Card>
            <ListGroup variant="flush">
              {CONTENT_SECTIONS.map((s, i) => {
                const custom = s.fields.filter((f) => f.key in form).length
                const pending = changedIn(s.fields)
                const heading = i === 0 ? 'Landing page' : s.group === 'legal' && CONTENT_SECTIONS[i - 1].group !== 'legal' ? 'Legal pages' : null
                return (
                  <div key={s.id}>
                    {heading && <div className="px-3 pt-3 pb-1 text-uppercase text-muted fs-11 fw-semibold">{heading}</div>}
                    <ListGroupItem action active={s.id === section.id} onClick={() => setSectionId(s.id)} className="d-flex justify-content-between align-items-center">
                      <span>{s.title}</span>
                      <span className="d-flex gap-1">
                        {pending > 0 && <Badge bg="warning">{pending} unsaved</Badge>}
                        {custom > 0 && pending === 0 && <Badge bg="secondary">{custom} changed</Badge>}
                      </span>
                    </ListGroupItem>
                  </div>
                )
              })}
            </ListGroup>
          </Card>
        </Col>
        <Col lg={9}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">{section.title}</CardTitle>
              <p className="text-muted mb-0 mt-1">{section.description}</p>
              {section.path && (
                <a className="btn btn-sm btn-light mt-2" href={section.path} target="_blank" rel="noreferrer">
                  View page
                </a>
              )}
            </CardHeader>
            <CardBody className="pt-0">
              <p className="form-text mt-0">Type {'{site}'} anywhere to show your site name from Branding.</p>
              {section.fields.map((field) => (
                <div className="mb-4" key={field.key}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor={field.key} className="form-label mb-0">
                      {field.label} {isCustom(field) && <Badge bg="light" text="dark">Changed</Badge>}
                    </label>
                    {canManage && isCustom(field) && (
                      <Button variant="link" size="sm" className="p-0" onClick={() => resetField(field)}>
                        Use default
                      </Button>
                    )}
                  </div>
                  {field.kind === 'text' && (
                    <input id={field.key} className="form-control" value={valueOf(field)} maxLength={300} disabled={!canManage} onChange={(e) => setValue(field, e.target.value)} />
                  )}
                  {field.kind === 'document' && (
                    <textarea id={field.key} className="form-control font-monospace fs-13" rows={26} value={valueOf(field)} maxLength={20000} disabled={!canManage} onChange={(e) => setValue(field, e.target.value)} />
                  )}
                  {field.kind === 'textarea' && (
                    <textarea id={field.key} className="form-control" rows={3} value={valueOf(field)} maxLength={5000} disabled={!canManage} onChange={(e) => setValue(field, e.target.value)} />
                  )}
                  {field.kind === 'image' && (
                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <div className="border rounded p-2 bg-light d-flex align-items-center justify-content-center" style={{ width: 160, height: 110 }}>
                        <img src={valueOf(field)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      {canManage && (
                        <label className={`btn btn-outline-primary btn-sm mb-0 ${uploading ? 'disabled' : ''}`}>
                          {uploading === field.key ? 'Uploading…' : 'Upload new picture'}
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => void upload(e, field)} />
                        </label>
                      )}
                    </div>
                  )}
                  {field.hint && <div className="form-text">{field.hint}</div>}
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default WebsitePage
