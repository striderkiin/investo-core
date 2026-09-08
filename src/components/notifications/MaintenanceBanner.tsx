import { useMaintenanceStatus } from '../../features/operations/useMaintenanceStatus';

export function MaintenanceBanner() {
  const { settings } = useMaintenanceStatus();

  if (!settings || !settings.enabled || !settings.showBanner) return null;

  return (
    <div className="alert alert-warning rounded-0 mb-0 text-center py-2" role="status">
      <i className="bi bi-cone-striped me-2" aria-hidden="true" />
      <strong>{settings.bannerTitle}</strong> — {settings.bannerMessage}
    </div>
  );
}
