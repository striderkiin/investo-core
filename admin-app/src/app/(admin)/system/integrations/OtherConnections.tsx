import { useState, type FormEvent } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import { formatDateTime, statusLabel, statusVariant } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createIntegrationService, PROVIDER_CATALOG, type IntegrationConfig } from '../../../../../../src/services/api/integrationService'
import { APP_ENVIRONMENT } from '../../../../../../src/config/env'

const integrationService = createIntegrationService(supabase)

// Everything except email, which has its own card.
const CATALOG = PROVIDER_CATALOG.filter((p) => p.type !== 'email')
const typeLabel = (type: string) => CATALOG.find((p) => p.type === type)?.label ?? type

type Props = { integrations: IntegrationConfig[]; masked: Record<string, string>; canManage: boolean; onChanged: () => void }

// Payment (incl. sandbox), SMS, KYC, analytics and monitoring providers: the
// old Integrations Center's generic configure / test / disconnect flow.
const OtherConnections = ({ integrations, masked, canManage, onChanged }: Props) => {
  const { showNotification } = useNotificationContext()
  const [configuring, setConfiguring] = useState<{ type: string; existing: IntegrationConfig | null } | null>(null)
  const [form, setForm] = useState({ name: '', apiKey: '', apiSecret: '', webhookSecret: '' })
  const [saving, setSaving] = useState(false)

  const open = (type: string, existing: IntegrationConfig | null) => {
    setForm({ name: existing?.providerName ?? '', apiKey: '', apiSecret: '', webhookSecret: '' })
    setConfiguring({ type, existing })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!configuring) return
    setSaving(true)
    try {
      let integration = configuring.existing
      if (!integration) {
        if (!form.name.trim()) throw new Error('Enter the provider name.')
        integration = await integrationService.createIntegration(configuring.type, form.name.trim(), APP_ENVIRONMENT)
      }
      if (form.apiKey.trim() || form.apiSecret.trim() || form.webhookSecret.trim()) {
        await integrationService.saveCredential(integration.id, form.apiKey.trim(), form.apiSecret.trim(), form.webhookSecret.trim() || undefined)
      }
      showNotification({ message: 'Saved.', variant: 'success' })
      setConfiguring(null)
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const test = async (i: IntegrationConfig) => {
    try {
      const updated = await integrationService.testConnection(i.id)
      showNotification({
        message: updated.status === 'connected' ? 'Connection test passed.' : 'Connection test failed. Check the keys.',
        variant: updated.status === 'connected' ? 'success' : 'warning',
      })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Test failed.', variant: 'danger' })
    }
  }

  const disconnect = async (i: IntegrationConfig) => {
    if (!window.confirm(`Disconnect ${i.providerName}? Its stored keys are removed.`)) return
    try {
      await integrationService.disconnect(i.id)
      showNotification({ message: 'Disconnected.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not disconnect.', variant: 'danger' })
    }
  }

  const unused = CATALOG.filter((p) => !integrations.some((i) => i.providerType === p.type))

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4">Other connections</CardTitle>
        <p className="text-muted mb-0 fs-12">
          SMS, identity checks, analytics, monitoring, and the sandbox payment provider used by Sandbox Testing (it needs a webhook secret).
        </p>
      </CardHeader>
      <CardBody className="pt-0">
        {integrations.length === 0 && <p className="text-muted">None connected yet.</p>}
        <ul className="list-group list-group-flush">
          {integrations.map((i) => (
            <li key={i.id} className="list-group-item px-0">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="fw-medium">{i.providerName}</span> <small className="text-muted">({typeLabel(i.providerType)})</small>
                  <small className="d-block text-muted">
                    {i.environment} · {i.lastTestedAt ? `tested ${formatDateTime(i.lastTestedAt)}` : 'never tested'}
                    {masked[i.id] ? ` · key ${masked[i.id]}` : ''}
                  </small>
                </div>
                <span className={`badge bg-${statusVariant(i.status)}-subtle text-${statusVariant(i.status)}`}>{statusLabel(i.status)}</span>
              </div>
              {canManage && (
                <div className="d-flex gap-1 mt-2">
                  <button type="button" className="btn btn-sm btn-light" onClick={() => open(i.providerType, i)}>
                    Update keys
                  </button>
                  <button type="button" className="btn btn-sm btn-light" onClick={() => void test(i)}>
                    Test
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void disconnect(i)}>
                    Disconnect
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {canManage && unused.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-3">
            {unused.map((p) => (
              <button key={p.type} type="button" className="btn btn-sm btn-outline-primary" onClick={() => open(p.type, null)}>
                + {p.label}
              </button>
            ))}
          </div>
        )}
      </CardBody>
      {configuring && (
        <Modal show onHide={() => setConfiguring(null)} centered>
          <form onSubmit={(e) => void submit(e)}>
            <ModalHeader closeButton>
              <ModalTitle as="h5">{configuring.existing ? `Update ${configuring.existing.providerName}` : `Add ${typeLabel(configuring.type)}`}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              {!configuring.existing && (
                <div className="mb-3">
                  <label htmlFor="int-name" className="form-label">
                    Provider name
                  </label>
                  <input id="int-name" className="form-control" placeholder={configuring.type === 'payment' ? 'e.g. Sandbox' : ''} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              )}
              {configuring.existing && masked[configuring.existing.id] && <p className="text-muted fs-13">Current key: {masked[configuring.existing.id]}. Leave blank to keep it.</p>}
              {(['apiKey', 'apiSecret', 'webhookSecret'] as const).map((k) => (
                <div className="mb-3" key={k}>
                  <label htmlFor={`int-${k}`} className="form-label">
                    {k === 'apiKey' ? 'API key' : k === 'apiSecret' ? 'API secret' : 'Webhook secret'}
                  </label>
                  <input id={`int-${k}`} type="password" autoComplete="off" className="form-control" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <small className="text-muted">Stored on the server. Only a masked version is shown after saving.</small>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onClick={() => setConfiguring(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </Card>
  )
}

export default OtherConnections
