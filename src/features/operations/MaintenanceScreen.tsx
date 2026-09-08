import type { MaintenanceSettings } from '../../services/api/maintenanceService';

export function MaintenanceScreen({ settings }: { settings: MaintenanceSettings }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 min-vh-100 px-3">
      <i className="bi bi-cone-striped text-warning" style={{ fontSize: '3rem' }} aria-hidden="true" />
      <h1 className="h3 mt-3">{settings.bannerTitle}</h1>
      <p className="text-secondary" style={{ maxWidth: 480 }}>
        {settings.bannerMessage}
      </p>
    </div>
  );
}
