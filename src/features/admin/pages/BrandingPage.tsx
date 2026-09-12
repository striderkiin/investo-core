import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createBrandingService } from '../../../services/api/brandingService';
import type { Branding, ThemeMode } from '../../../services/api/brandingService';
import { createSocialLinksService } from '../../../services/api/socialLinksService';
import type { SocialLink } from '../../../types/database';
import { SOCIAL_PLATFORM_META } from '../../../components/public/socialPlatforms';
import { useBranding } from '../../../hooks/useBranding';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';

const brandingService = createBrandingService();
const socialLinksService = createSocialLinksService();

const COLOR_FIELDS: { key: keyof Branding; label: string }[] = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'successColor', label: 'Success' },
  { key: 'warningColor', label: 'Warning' },
  { key: 'dangerColor', label: 'Danger' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'surfaceColor', label: 'Surface' },
  { key: 'textColor', label: 'Text' },
];

const FONT_OPTIONS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat'];

export function BrandingPage() {
  const { branding, refresh, applyPreview } = useBranding();
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<Branding>(branding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [data, links] = await Promise.all([brandingService.get(), socialLinksService.listAll()]);
      setForm(data);
      setSocialLinks(links);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branding');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateSocialLink(id: string, updates: Partial<{ url: string; enabled: boolean }>) {
    try {
      const updated = await socialLinksService.update(id, updates);
      setSocialLinks((prev) => prev.map((link) => (link.id === id ? updated : link)));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update social link');
    }
  }

  function updateField<K extends keyof Branding>(key: K, value: Branding[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      applyPreview({ [key]: value });
      return next;
    });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, kind: 'logo' | 'logo-light' | 'logo-dark' | 'favicon') {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingKind(kind);
    try {
      const url = await brandingService.uploadAsset(file, kind);
      const fieldMap: Record<string, keyof Branding> = {
        logo: 'logoUrl',
        'logo-light': 'logoLightUrl',
        'logo-dark': 'logoDarkUrl',
        favicon: 'faviconUrl',
      };
      updateField(fieldMap[kind], url as never);
      showSuccess('Asset uploaded. Remember to Save Changes.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKind(null);
      const input = fileInputRefs.current[kind];
      if (input) input.value = '';
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { id: _id, ...updates } = form;
      await brandingService.update(updates);
      await refresh();
      showSuccess('Branding saved. Changes are now live.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading branding..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">Branding</h2>
          <p className="text-secondary mb-0 small">Changes preview live across the app immediately — click Save to persist them.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card ic-card">
            <div className="card-body">
              <h3 className="h6 mb-3">Site Identity</h3>
              <div className="mb-3">
                <label htmlFor="siteName" className="form-label">
                  Site Name
                </label>
                <input
                  id="siteName"
                  type="text"
                  className="form-control"
                  value={form.siteName}
                  onChange={(e) => updateField('siteName', e.target.value)}
                />
                <div className="form-text">Updates the navbar, page title, dashboard, and footer everywhere.</div>
              </div>
              <div className="mb-3">
                <label htmlFor="logoText" className="form-label">
                  Logo Text <span className="text-secondary">(optional, overrides site name in the navbar)</span>
                </label>
                <input
                  id="logoText"
                  type="text"
                  className="form-control"
                  value={form.logoText ?? ''}
                  onChange={(e) => updateField('logoText', e.target.value || null)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="theme" className="form-label">
                  Theme
                </label>
                <select id="theme" className="form-select" value={form.theme} onChange={(e) => updateField('theme', e.target.value as ThemeMode)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label htmlFor="primaryFont" className="form-label">
                    Primary Font
                  </label>
                  <select id="primaryFont" className="form-select" value={form.primaryFont} onChange={(e) => updateField('primaryFont', e.target.value)}>
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label htmlFor="headingFont" className="form-label">
                    Heading Font
                  </label>
                  <select id="headingFont" className="form-select" value={form.headingFont} onChange={(e) => updateField('headingFont', e.target.value)}>
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card ic-card mt-4">
            <div className="card-body">
              <h3 className="h6 mb-3">Logo & Favicon</h3>
              {(
                [
                  ['logo', 'Logo', form.logoUrl],
                  ['logo-light', 'Light Logo', form.logoLightUrl],
                  ['logo-dark', 'Dark Logo', form.logoDarkUrl],
                  ['favicon', 'Favicon', form.faviconUrl],
                ] as const
              ).map(([kind, label, url]) => (
                <div key={kind} className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-light border rounded d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    {url ? <img src={url} alt="" style={{ maxWidth: 40, maxHeight: 40 }} /> : <i className="bi bi-image text-secondary" aria-hidden="true" />}
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-1 small fw-semibold">{label}</p>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[kind] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="form-control form-control-sm"
                      disabled={uploadingKind === kind}
                      onChange={(e) => handleUpload(e, kind)}
                      aria-label={`Upload ${label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card ic-card mt-4">
            <div className="card-body">
              <h3 className="h6 mb-1">Social Links</h3>
              <p className="text-secondary small mb-3">Shown as icons in the landing page&apos;s Contact section and footer. Turn on whichever platforms you actually have and set the real link — disabled platforms never show on the public site.</p>
              {socialLinks.map((link) => {
                const meta = SOCIAL_PLATFORM_META[link.platform];
                const Icon = meta.icon;
                return (
                  <div key={link.id} className="d-flex align-items-center gap-2 mb-2">
                    <Icon width={18} height={18} style={{ flexShrink: 0, color: 'var(--ic-primary)' }} />
                    <span className="small" style={{ minWidth: 90 }}>
                      {meta.label}
                    </span>
                    <input
                      type="url"
                      className="form-control form-control-sm"
                      defaultValue={link.url}
                      placeholder="#"
                      onBlur={(e) => e.target.value !== link.url && updateSocialLink(link.id, { url: e.target.value || '#' })}
                    />
                    <div className="form-check form-switch mb-0 flex-shrink-0" title={link.enabled ? 'Enabled' : 'Disabled'}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={link.enabled}
                        onChange={(e) => updateSocialLink(link.id, { enabled: e.target.checked })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card ic-card">
            <div className="card-body">
              <h3 className="h6 mb-3">Brand Colors</h3>
              <div className="row g-3">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div className="col-6" key={key}>
                    <label htmlFor={key} className="form-label small">
                      {label}
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={form[key] as string}
                        onChange={(e) => updateField(key, e.target.value as never)}
                        aria-label={`${label} color picker`}
                      />
                      <input
                        id={key}
                        type="text"
                        className="form-control"
                        value={form[key] as string}
                        onChange={(e) => updateField(key, e.target.value as never)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card ic-card mt-4">
            <div className="card-body">
              <h3 className="h6 mb-3">Preview</h3>
              <div className="d-flex gap-2 flex-wrap">
                <button type="button" className="btn btn-primary btn-sm">
                  Primary Button
                </button>
                <button type="button" className="btn btn-success btn-sm">
                  Success
                </button>
                <button type="button" className="btn btn-warning btn-sm">
                  Warning
                </button>
                <button type="button" className="btn btn-danger btn-sm">
                  Danger
                </button>
              </div>
              <p className="mt-3 mb-0 small text-secondary">This preview reflects live changes — check the sidebar and navbar too.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
