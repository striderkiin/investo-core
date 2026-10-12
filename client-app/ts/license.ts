import { createLicenseService } from '../../src/services/api/licenseService';

export const PAUSED_MESSAGE = 'New deposits and investments are paused on this site for now. Withdrawals work as normal.';

let paused: Promise<boolean> | null = null;

/** True when the site's subscription is overdue and HQ has paused it. */
export function sitePaused(): Promise<boolean> {
  paused ??= createLicenseService()
    .get()
    .then((state) => state.status === 'locked')
    .catch(() => false);
  return paused;
}
