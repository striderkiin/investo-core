'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import { statusVariant } from '@/investo/format'
import { invokeFunction, sendEmail } from '@/investo/functions'
import { supabase } from '@/investo/services'
import { createIntegrationService, type IntegrationConfig } from '../../../../../../src/services/api/integrationService'
import { createDepositAddressService, type DepositAddress } from '../../../../../../src/services/api/depositAddressService'
import { APP_ENVIRONMENT } from '../../../../../../src/config/env'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import OtherConnections from './OtherConnections'

export const metadata: Metadata = { title: 'Integrations' }

const integrationService = createIntegrationService(supabase)
const depositAddressService = createDepositAddressService(supabase)

const DEPOSIT_PAIRS: { currency: string; network: string }[] = [
  { currency: 'BTC', network: 'Bitcoin' },
  { currency: 'ETH', network: 'ERC20' },
  { currency: 'USDT', network: 'ERC20' },
  { currency: 'USDT', network: 'TRC20' },
]

type EmailConfig = { from_email?: string; from_name?: string; site_url?: string }

const EmailCard = ({ integration, masked, onChanged }: { integration: (IntegrationConfig & { config: EmailConfig }) | null; masked: string | null; onChanged: () => void }) => {
  // The Supabase email hook is set up by the host, so only the super admin sees how.
  const { role } = usePermission()
  const { showNotification } = useNotificationContext()
  const [apiKey, setApiKey] = useState('')
  const [fromEmail, setFromEmail] = useState(integration?.config.from_email ?? '')
  const [fromName, setFromName] = useState(integration?.config.from_name ?? '')
  const [siteUrl, setSiteUrl] = useState(integration?.config.site_url ?? window.location.origin)
  const [busy, setBusy] = useState(false)
  const connected = integration?.status === 'connected'

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!integration && !apiKey.trim()) return showNotification({ message: 'Paste your Resend API key.', variant: 'danger' })
    if (!/^\S+@\S+\.\S+$/.test(fromEmail.trim())) return showNotification({ message: 'Enter the address emails are sent from.', variant: 'danger' })
    setBusy(true)
    try {
      const row = integration ?? (await integrationService.createIntegration('email', 'Resend', APP_ENVIRONMENT))
      const { error } = await supabase
        .from('integration_configs')
        .update({ config: { from_email: fromEmail.trim(), from_name: fromName.trim(), site_url: siteUrl.trim().replace(/\/+$/, '') } })
        .eq('id', row.id)
      if (error) throw error
      if (apiKey.trim()) await integrationService.saveCredential(row.id, apiKey.trim(), '')
      setApiKey('')
      showNotification({ message: 'Email settings saved.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true)
    try {
      const result = await sendEmail('test')
      showNotification({ message: `Test email sent to ${result.to}.`, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'The test email failed.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!integration || !window.confirm('Disconnect email? The saved API key is deleted and emails stop sending.')) return
    try {
      await integrationService.disconnect(integration.id)
      showNotification({ message: 'Email disconnected.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not disconnect.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">
              <IconifyIcon icon="iconoir:mail" className="me-1" /> Email (Resend)
            </CardTitle>
            <p className="text-muted mb-0 fs-12">Sends sign-up confirmations, password resets, admin invites and customer statements.</p>
          </Col>
          <Col xs="auto">
            <span className={`badge bg-${statusVariant(connected ? 'completed' : 'pending')}-subtle text-${statusVariant(connected ? 'completed' : 'pending')}`}>
              {connected ? 'Connected' : 'Not set up'}
            </span>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <form onSubmit={save}>
          <div className="mb-3">
            <label htmlFor="resend-key" className="form-label">
              Resend API key
            </label>
            <input
              id="resend-key"
              type="password"
              autoComplete="off"
              className="form-control"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={integration ? `Saved${masked ? ` (${masked})` : ''}. Paste a new key to replace it.` : 're_…'}
            />
            <small className="text-muted">Create one at resend.com under API Keys. It is stored on the server and never shown again.</small>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label htmlFor="resend-from" className="form-label">
                Send from
              </label>
              <input id="resend-from" type="email" className="form-control" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="no-reply@yourdomain.com" />
              <small className="text-muted">Must be on a domain you verified in Resend.</small>
            </div>
            <div className="col-md-6">
              <label htmlFor="resend-name" className="form-label">
                Sender name
              </label>
              <input id="resend-name" className="form-control" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Investo" />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="resend-site" className="form-label">
              Website address
            </label>
            <input id="resend-site" className="form-control" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yourdomain.com" />
            <small className="text-muted">Used for links and your logo inside emails.</small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save
            </button>
            {connected && (
              <button type="button" className="btn btn-light" disabled={busy} onClick={() => void test()}>
                Send me a test email
              </button>
            )}
            {integration && (
              <button type="button" className="btn btn-outline-danger ms-auto" onClick={() => void disconnect()}>
                Disconnect
              </button>
            )}
          </div>
        </form>
        <hr className="hr-dashed" />
        <p className="fw-semibold mb-1">One-time step so sign-up and password emails also use Resend</p>
        {role !== 'super_admin' ? (
          <p className="text-muted fs-13 mb-0">We turn this on for you when we set up your site. Once your key is saved above, sign-up and password emails go out from your own address.</p>
        ) : (
        <ol className="text-muted fs-13 mb-0 ps-3">
          <li>In Supabase, open Authentication, then Hooks, and add a Send Email hook of type HTTPS.</li>
          <li>
            Use this URL: <code className="user-select-all">{`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/auth-email-hook`}</code>
          </li>
          <li>Generate the hook secret, copy it, and add it under Edge Functions, then Secrets, as SEND_EMAIL_HOOK_SECRET.</li>
        </ol>
        )}
      </CardBody>
    </Card>
  )
}

type PayramConfig = { base_url?: string }

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/payram-webhook`

const PayramCard = ({ integration, masked, onChanged }: { integration: (IntegrationConfig & { config: PayramConfig }) | null; masked: string | null; onChanged: () => void }) => {
  const { showNotification } = useNotificationContext()
  const [baseUrl, setBaseUrl] = useState(integration?.config.base_url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const connected = integration?.status === 'connected'

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const url = baseUrl.trim().replace(/\/+$/, '')
    if (!/^https?:\/\/\S+$/.test(url)) return showNotification({ message: 'Enter the PayRam server address, starting with http:// or https://.', variant: 'danger' })
    if (!integration && !apiKey.trim()) return showNotification({ message: 'Paste the API key from your PayRam project.', variant: 'danger' })
    setBusy(true)
    try {
      const row = integration ?? (await integrationService.createIntegration('payment', 'PayRam', APP_ENVIRONMENT))
      const { error } = await supabase.from('integration_configs').update({ config: { base_url: url } }).eq('id', row.id)
      if (error) throw error
      if (apiKey.trim()) await integrationService.saveCredential(row.id, apiKey.trim(), '')
      setApiKey('')
      setBaseUrl(url)
      showNotification({ message: 'PayRam settings saved. Click Check connection to test them.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    setBusy(true)
    setResult(null)
    try {
      setResult(await invokeFunction<{ ok: boolean; message: string }>('payram-checkout', { action: 'test' }))
      onChanged()
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'The check failed.' })
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!integration || !window.confirm('Disconnect PayRam? The saved API key is deleted. Customers then pay to your wallet addresses instead.')) return
    try {
      await integrationService.disconnect(integration.id)
      showNotification({ message: 'PayRam disconnected.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not disconnect.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">
              <IconifyIcon icon="iconoir:coins" className="me-1" /> Crypto payments (PayRam)
            </CardTitle>
            <p className="text-muted mb-0 fs-12">
              Customers pay on your PayRam checkout page and choose the coin there. Deposits are confirmed and credited automatically.
            </p>
          </Col>
          <Col xs="auto">
            <span className={`badge bg-${statusVariant(connected ? 'completed' : 'pending')}-subtle text-${statusVariant(connected ? 'completed' : 'pending')}`}>
              {connected ? 'Connected' : integration ? 'Not working' : 'Not set up'}
            </span>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <form onSubmit={save}>
          <div className="mb-3">
            <label htmlFor="payram-url" className="form-label">
              PayRam server address
            </label>
            <input id="payram-url" className="form-control" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://pay.yourdomain.com" />
            <small className="text-muted">The address you open the PayRam dashboard with, without /login.</small>
          </div>
          <div className="mb-3">
            <label htmlFor="payram-key" className="form-label">
              Project API key
            </label>
            <input
              id="payram-key"
              type="password"
              autoComplete="off"
              className="form-control"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={integration ? `Saved${masked ? ` (${masked})` : ''}. Paste a new key to replace it.` : 'Paste the key from PayRam'}
            />
            <small className="text-muted">In PayRam: Settings, Projects, your project, API Keys. It is stored on the server and never shown again.</small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save
            </button>
            {integration && (
              <button type="button" className="btn btn-light" disabled={busy} onClick={() => void check()}>
                Check connection
              </button>
            )}
            {integration && (
              <button type="button" className="btn btn-outline-danger ms-auto" onClick={() => void disconnect()}>
                Disconnect
              </button>
            )}
          </div>
          {result && <div className={`alert alert-${result.ok ? 'success' : 'warning'} mt-3 mb-0 fs-13`}>{result.message}</div>}
        </form>
        <hr className="hr-dashed" />
        <p className="fw-semibold mb-1">One-time step so payments confirm automatically</p>
        <ol className="text-muted fs-13 mb-0 ps-3">
          <li>In PayRam, open Settings, then Projects, then your project, then the Webhook tab, and click +.</li>
          <li>
            Paste this URL: <code className="user-select-all">{WEBHOOK_URL}</code>
          </li>
          <li>Save it. PayRam now tells this site when each payment arrives.</li>
        </ol>
      </CardBody>
    </Card>
  )
}

const DepositAddresses = () => {
  const { showNotification } = useNotificationContext()
  const [provider, setProvider] = useState(APP_ENVIRONMENT === 'production' ? 'live' : 'demo')
  const [addresses, setAddresses] = useState<DepositAddress[] | null>(null)

  useEffect(() => {
    setAddresses(null)
    depositAddressService
      .list(provider)
      .then(setAddresses)
      .catch(() => setAddresses([]))
  }, [provider])

  const save = async (currency: string, network: string, value: string) => {
    if (!value.trim()) return
    try {
      const saved = await depositAddressService.set(currency, network, provider, value.trim())
      setAddresses((prev) => [...(prev ?? []).filter((a) => !(a.currency === currency && a.network === network)), saved])
      showNotification({ message: `${currency} (${network}) address saved.`, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save the address.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">
              <IconifyIcon icon="iconoir:wallet" className="me-1" /> Wallet addresses for manual deposits
            </CardTitle>
            <p className="text-muted mb-0 fs-12">
              Customers are shown these addresses when they deposit. Check payments on the blockchain and confirm them under Deposits. When PayRam is
              connected, customers pay through PayRam instead.
            </p>
          </Col>
          <Col xs="auto">
            <select className="form-select form-select-sm" value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Deposit mode">
              <option value="live">Live</option>
              <option value="demo">Demo</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        {!addresses ? (
          <p className="text-muted mb-0">Loading…</p>
        ) : (
          DEPOSIT_PAIRS.map(({ currency, network }) => {
            const existing = addresses.find((a) => a.currency === currency && a.network === network)
            return (
              <div className="input-group mb-2" key={`${provider}-${currency}-${network}`}>
                <span className="input-group-text" style={{ minWidth: 150 }}>
                  {currency} · {network}
                </span>
                <input
                  className="form-control"
                  placeholder="Receiving address"
                  defaultValue={existing?.address ?? ''}
                  onBlur={(e) => e.target.value.trim() !== (existing?.address ?? '') && void save(currency, network, e.target.value)}
                />
              </div>
            )
          })
        )}
        <small className="text-muted">Changes save when you click out of a box.</small>
      </CardBody>
    </Card>
  )
}

const Integrations = () => {
  const { can } = usePermission()
  const [integrations, setIntegrations] = useState<(IntegrationConfig & { config: Record<string, string> })[] | null>(null)
  const [masked, setMasked] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('integration_configs').select('id, provider_type, provider_name, environment, status, last_tested_at, config').order('provider_type')
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      providerType: String(r.provider_type),
      providerName: String(r.provider_name),
      environment: String(r.environment),
      status: r.status as IntegrationConfig['status'],
      lastTestedAt: (r.last_tested_at as string) ?? null,
      config: (r.config ?? {}) as Record<string, string>,
    }))
    setIntegrations(rows)
    if (can('integrations.read_secrets')) {
      const { data: meta } = await supabase.from('credential_metadata').select('integration_id, masked_key')
      setMasked(Object.fromEntries((meta ?? []).map((m: { integration_id: string; masked_key: string }) => [m.integration_id, m.masked_key])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!integrations) return null
  const email = integrations.find((i) => i.providerType === 'email') ?? null
  const isPayram = (i: IntegrationConfig) => i.providerType === 'payment' && i.providerName.toLowerCase() === 'payram'
  const payram = integrations.find(isPayram) ?? null
  const others = integrations.filter((i) => i.providerType !== 'email' && !isPayram(i))

  return (
    <>
      <Row className="mb-3">
        <Col>
          <h4 className="mb-1">Integrations</h4>
          <p className="text-muted mb-0">Keys are stored on the server. After saving, only a masked version is ever shown.</p>
        </Col>
      </Row>
      <Row>
        <Col xl={7}>
          <EmailCard key={email?.id ?? 'new'} integration={email} masked={email ? (masked[email.id] ?? null) : null} onChanged={() => void load()} />
        </Col>
        <Col xl={5}>
          <PayramCard key={payram?.id ?? 'new'} integration={payram} masked={payram ? (masked[payram.id] ?? null) : null} onChanged={() => void load()} />
          <DepositAddresses />
          <OtherConnections integrations={others} masked={masked} hidePayment={!!payram} canManage={can('integrations.manage')} onChanged={() => void load()} />
        </Col>
      </Row>
    </>
  )
}

export default Integrations
