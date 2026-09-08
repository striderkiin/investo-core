import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createAuthService } from '../../services/auth/authService';
import { isSupabaseConfigured } from '../../services/supabase/client';
import { createSecurityService } from '../../services/api/securityService';
import { isAdminRole } from '../../types/roles';
import type { Profile } from '../../types/database';
import type { LoginInput, RegisterInput } from '../../services/auth/authService';

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const authService = isSupabaseConfigured() ? createAuthService() : null;
const securityService = isSupabaseConfigured() ? createSecurityService() : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!authService) return null;
    try {
      const currentProfile = await authService.getCurrentProfile();
      setProfile(currentProfile);
      return currentProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!authService) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const current = await authService.getSession();
        setSession(current);
        if (current) await refreshProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    })();

    unsubscribe = authService.onAuthStateChange((nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void refreshProfile();
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe?.();
  }, [refreshProfile]);

  const login = useCallback(async (input: LoginInput) => {
    if (!authService) throw new Error('Supabase is not configured');
    setError(null);
    const result = await authService.login(input);
    setSession(result.session);
    const loadedProfile = await refreshProfile();
    if (result.user && securityService) {
      void securityService.recordSession(result.user.id, loadedProfile ? isAdminRole(loadedProfile.role) : false).catch(() => undefined);
    }
  }, [refreshProfile]);

  const register = useCallback(async (input: RegisterInput) => {
    if (!authService) throw new Error('Supabase is not configured');
    setError(null);
    const result = await authService.register(input);
    setSession(result.session);
    if (result.session) await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    if (!authService) return;
    await authService.logout();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, isLoading, isConfigured, error, login, register, logout, refreshProfile }),
    [session, profile, isLoading, isConfigured, error, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
