import { useEffect, useRef, useState } from 'react';
import { createActivityService } from '../../services/api/activityService';
import type { OnlineUserSettings } from '../../services/api/activityService';
import { isSupabaseConfigured } from '../../services/supabase/client';
import { stepOnlineUsers } from './onlineUserSimulator';

const activityService = isSupabaseConfigured() ? createActivityService() : null;

export function useOnlineUserSimulator() {
  const [settings, setSettings] = useState<OnlineUserSettings | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const countRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activityService) return;
    activityService
      .getOnlineUserSettings()
      .then((data) => {
        setSettings(data);
        setCount(data.baseUsers);
        countRef.current = data.baseUsers;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settings || !settings.enabled) return;
    const interval = setInterval(() => {
      const next = stepOnlineUsers(countRef.current ?? settings.baseUsers, settings.minUsers, settings.maxUsers);
      countRef.current = next;
      setCount(next);
    }, settings.fluctuationSpeedMs);
    return () => clearInterval(interval);
  }, [settings]);

  return { settings, count: settings?.enabled ? count : null };
}
