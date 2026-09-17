import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createIntegrationService, PROVIDER_CATALOG } from '../../../services/api/integrationService';
import type { CredentialMetadata, IntegrationConfig, IntegrationStatus } from '../../../services/api/integrationService';
import { createDepositAddressService } from '../../../services/api/depositAddressService';
import type { DepositAddress } from '../../../services/api/depositAddressService';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';
import { useToast } from '../../../hooks/useToast';
import { APP_ENVIRONMENT } from '../../../config/env';

const integrationService = createIntegrationService();
const depositAddressService = createDepositAddressService();

const DEPOSIT_PROVIDERS = [
  { value: 'demo', label: 'Demo' },
  { value: 'sandbox', label: 'Sandbox' },
];

const DEPOSIT_PAIRS: { currency: string; network: string }[] = [
  { currency: 'BTC', network: 'Bitcoin' },
  { currency: 'ETH', network: 'ERC20' },
  { currency: 'USDT', network: 'ERC20' },
  { currency: 'USDT', network: 'TRC20' },
];

const STATUS_VARIANT: Record<IntegrationStatus, string> = {
  connected: 'success',
  disconnected: 'secondary',
  error: 'danger',
};

export function IntegrationsPage() {
  const { showSuccess, showError } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuringType, setConfiguringType] = useState<string | null>(null);
  const [selected, setSelected] = useState<IntegrationConfig | null>(null);
  const [metadata, setMetadata] = useState<CredentialMetadata | null>(null);
  const [providerName, setProviderName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [depositProvider, setDepositProvider] = useState('demo');
  const [depositAddresses, setDepositAddresses] = useState<DepositAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setIntegrations(await integrationService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDepositAddresses(provider: string) {
    setIsLoadingAddresses(true);
    try {
      setDepositAddresses(await depositAddressService.list(provider));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load deposit addresses');
    } finally {
      setIsLoadingAddresses(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadDepositAddresses(depositProvider);
  }, [depositProvider]);

  function addressFor(currency: string, network: string): DepositAddress | undefined {
    return depositAddresses.find((a) => a.currency === currency && a.network === network);
  }

  async function saveDepositAddress(currency: string, network: string, address: string) {
    if (!address.trim()) return;
    try {
      const saved = await depositAddressService.set(currency, network, depositProvider, address.trim());
      setDepositAddresses((prev) => [...prev.filter((a) => !(a.currency === currency && a.network === network)), saved]);
      showSuccess('Deposit address saved.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save deposit address');
    }
  }

  async function openConfigure(providerType: string) {
    setConfiguringType(providerType);
    setProviderName('');
    setApiKey('');
    setApiSecret('');
    setWebhookSecret('');
    const existing = integrations.find((i) => i.providerType === providerType);
    setSelected(existing ?? null);
    if (existing) {
      try {
        setMetadata(await integrationService.getCredentialMetadata(existing.id));
      } catch {
        setMetadata(null);
      }
    } else {
      setMetadata(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configuringType) return;
    setIsSubmitting(true);
    try {
      let integration = selected;
      if (!integration) {
        if (!providerName.trim()) {
          showError('Enter a provider name.');
          setIsSubmitting(false);
          return;
        }
        integration = await integrationService.createIntegration(configuringType, providerName.trim(), APP_ENVIRONMENT);
      }
      if (apiKey.trim() || apiSecret.trim()) {
        await integrationService.saveCredential(integration.id, apiKey.trim(), apiSecret.trim(), webhookSecret.trim() || undefined);
      }
      showSuccess('Integration configured.');
      setConfiguringType(null);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTest(integration: IntegrationConfig) {
    try {
      const updated = await integrationService.testConnection(integration.id);
      setIntegrations((current) => current.map((i) => (i.id === updated.id ? updated : i)));
      showSuccess(updated.status === 'connected' ? 'Connection test passed.' : 'Connection test failed. Check credentials.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Test failed');
    }
  }

  async function handleDisconnect(integration: IntegrationConfig) {
    if (!window.confirm(`Disconnect ${integration.providerName}? This removes its stored credentials.`)) return;
    try {
      const updated = await integrationService.disconnect(integration.id);
      setIntegrations((current) => current.map((i) => (i.id === updated.id ? updated : i)));
      showSuccess('Integration disconnected.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading integrations..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="h4 mb-1">Integrations Center</h2>
        <p className="text-secondary mb-0 small">
          Secrets are never sent back to the browser after saving. Only a masked reference is shown, e.g. <code>••••••••••••8F2A</code>.
        </p>
      </div>

      {integrations.length === 0 ? (
        <EmptyState icon="bi-plug" title="No integrations configured yet" />
      ) : (
        <div className="row g-3">
          {integrations.map((integration) => (
            <div className="col-12 col-md-6 col-xl-4" key={integration.id}>
              <div className="card ic-card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h6 mb-0">{integration.providerName}</h3>
                    <span className={`badge text-bg-${STATUS_VARIANT[integration.status]} text-capitalize`}>{integration.status}</span>
                  </div>
                  <p className="text-secondary small mb-1 text-capitalize">{integration.providerType} &middot; {integration.environment}</p>
                  <p className="text-secondary small mb-3">
                    {integration.lastTestedAt ? `Last tested ${new Date(integration.lastTestedAt).toLocaleString()}` : 'Never tested'}
                  </p>
                  <div className="d-flex flex-wrap gap-1">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openConfigure(integration.providerType)}>
                      Configure
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleTest(integration)}>
                      Test Connection
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDisconnect(integration)}>
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="h6">Add a Provider</h3>
        <div className="row g-2">
          {PROVIDER_CATALOG.filter((p) => !integrations.some((i) => i.providerType === p.type)).map((provider) => (
            <div className="col-12 col-md-4" key={provider.type}>
              <button type="button" className="btn btn-outline-secondary w-100 text-start d-flex align-items-center gap-2" onClick={() => openConfigure(provider.type)}>
                <i className={`bi ${provider.icon}`} aria-hidden="true" />
                {provider.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h3 className="h6 mb-0">Crypto Deposit Addresses</h3>
          <select className="form-select form-select-sm" style={{ maxWidth: 140 }} value={depositProvider} onChange={(e) => setDepositProvider(e.target.value)}>
            {DEPOSIT_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-secondary small mb-2">
          The address clients are shown when depositing with the {depositProvider} provider. Leave a pair unconfigured and its deposit flow falls back to a
          placeholder address.
        </p>
        {isLoadingAddresses ? (
          <LoadingScreen label="Loading deposit addresses..." />
        ) : (
          <div className="d-flex flex-column gap-2">
            {DEPOSIT_PAIRS.map(({ currency, network }) => {
              const existing = addressFor(currency, network);
              return (
                <div className="d-flex gap-2 align-items-center" key={`${depositProvider}-${currency}-${network}`}>
                  <span className="badge text-bg-secondary" style={{ minWidth: 100 }}>
                    {currency} · {network}
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Receiving address"
                    defaultValue={existing?.address ?? ''}
                    onBlur={(e) => e.target.value.trim() !== (existing?.address ?? '') && saveDepositAddress(currency, network, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        title={selected ? `Configure ${selected.providerName}` : 'Add Provider'}
        show={configuringType !== null}
        onClose={() => setConfiguringType(null)}
      >
        <form onSubmit={handleSubmit} noValidate>
          {!selected && (
            <div className="mb-3">
              <label htmlFor="providerName" className="form-label">
                Provider Name
              </label>
              <input id="providerName" type="text" className="form-control" value={providerName} onChange={(e) => setProviderName(e.target.value)} required />
            </div>
          )}
          {metadata && (
            <div className="alert alert-secondary small">
              Current key: <code>{metadata.maskedKey}</code>
              <br />
              Current secret: <code>{metadata.maskedSecret}</code>
              <br />
              Webhook: {metadata.webhookConfigured ? 'Configured' : 'Not configured'}
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="apiKey" className="form-label">
              API Key
            </label>
            <input id="apiKey" type="text" className="form-control" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={metadata ? 'Leave blank to keep current' : ''} />
          </div>
          <div className="mb-3">
            <label htmlFor="apiSecret" className="form-label">
              API Secret
            </label>
            <input
              id="apiSecret"
              type="password"
              className="form-control"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={metadata ? 'Leave blank to keep current' : ''}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="webhookSecret" className="form-label">
              Webhook Secret <span className="text-secondary">(optional)</span>
            </label>
            <input id="webhookSecret" type="password" className="form-control" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
