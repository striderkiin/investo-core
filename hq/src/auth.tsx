import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

// signed_out: no session. not_owner: signed in but not on the owner list.
// needs_setup: owner without an authenticator yet. needs_code: owner who
// still has to enter the 6-digit code. ok: fully signed in.
export type Access = 'loading' | 'signed_out' | 'not_owner' | 'needs_setup' | 'needs_code' | 'ok';

interface AuthValue {
  session: Session | null;
  access: Access;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

const accessFor = async (session: Session | null): Promise<Access> => {
  if (!session) return 'signed_out';
  const { data: status, error } = await supabase.rpc('hq_owner_status');
  if (error) throw error;
  if (status === 'not_owner') return 'not_owner';
  if (status === 'ok') return 'ok';
  const { data: level, error: levelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (levelError) throw levelError;
  return level.nextLevel === 'aal2' ? 'needs_code' : 'needs_setup';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access>('loading');

  const check = useCallback(async (next: Session | null) => {
    setSession(next);
    try {
      setAccess(await accessFor(next));
    } catch {
      setAccess(next ? 'not_owner' : 'signed_out');
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAccess('signed_out');
      } else if (event === 'SIGNED_IN' || event === 'MFA_CHALLENGE_VERIFIED') {
        // Supabase warns against awaiting its calls inside this callback.
        setTimeout(() => void check(next), 0);
      } else {
        setSession(next);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [check]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await check(data.session);
  }, [check]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <AuthContext value={{ session, access, refresh, signOut }}>{children}</AuthContext>;
};

export const useAuth = () => {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
