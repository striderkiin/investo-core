import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createIntegrationService, PROVIDER_CATALOG } from '../../../services/api/integrationService';
import type { CredentialMetadata, IntegrationConfig, IntegrationStatus } from '../../../services/api/integrationService';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';
import { useToast } from '../../../hooks/useToast';
import { APP_ENVIRONMENT } from '../../../config/env';

const integrationService = createIntegrationService();

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

  useEffect(() => {
    void load();
  }, []);

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
      showSuccess(updated.status === 'connected' ? 'Connection test passed.' : 'Connection test failed — check credentials.');
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
          Secrets are never sent back to the browser after saving — only a masked reference is shown, e.g. <code>••••••••••••8F2A</code>.
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
