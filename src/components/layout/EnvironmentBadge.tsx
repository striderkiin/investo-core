import { APP_ENVIRONMENT, environmentLabel } from '../../config/env';

const VARIANT_BY_ENV: Record<string, string> = {
  development: 'secondary',
  demo: 'info',
  sandbox: 'warning',
  production: 'danger',
};

export function EnvironmentBadge() {
  const variant = VARIANT_BY_ENV[APP_ENVIRONMENT] ?? 'secondary';
  return (
    <span className={`badge text-bg-${variant} ic-env-badge`} title="Active application environment">
      {environmentLabel(APP_ENVIRONMENT)}
    </span>
  );
}
