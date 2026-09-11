import { useEffect, useState } from 'react';
import { createMaintenanceService } from '../../services/api/maintenanceService';
import type { MaintenanceSettings } from '../../services/api/maintenanceService';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabase/client';

const maintenanceService = isSupabaseConfigured() ? createMaintenanceService() : null;

export function useMaintenanceStatus() {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!maintenanceService) {
      setIsLoading(false);
      return;
    }
    maintenanceService
      .get()
      .then(setSettings)
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    // A unique channel name per hook instance — a shared hardcoded name
    // meant two simultaneous .subscribe() calls could race on the same
    // channel ("cannot add postgres_changes callbacks... after subscribe()")
    // if this hook is ever called from more than one place in the tree.
    const channel = client
      .channel(`maintenance_settings_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'maintenance_settings' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        setSettings({
          id: row.id as string,
          enabled: row.enabled as boolean,
          pauseYield: row.pause_yield as boolean,
          disableWithdrawals: row.disable_withdrawals as boolean,
          disableDeposits: row.disable_deposits as boolean,
          showBanner: row.show_banner as boolean,
          restrictClientAccess: row.restrict_client_access as boolean,
          allowAdminAccess: row.allow_admin_access as boolean,
          bannerTitle: row.banner_title as string,
          bannerMessage: row.banner_message as string,
        });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  return { settings, isLoading };
}
