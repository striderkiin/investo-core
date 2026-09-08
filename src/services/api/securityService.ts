import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  isAdminSession: boolean;
  lastActiveAt: string;
  createdAt: string;
  terminatedAt: string | null;
}

export interface SecurityEvent {
  id: string;
  userId: string | null;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_admin_session: boolean;
  last_active_at: string;
  created_at: string;
  terminated_at: string | null;
}

interface SecurityEventRow {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function mapSession(row: UserSessionRow): UserSession {
  return {
    id: row.id,
    userId: row.user_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    isAdminSession: row.is_admin_session,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    terminatedAt: row.terminated_at,
  };
}

function mapEvent(row: SecurityEventRow): SecurityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export function createSecurityService(client: SupabaseClient = getSupabaseClient()) {
  return {
    /** Records this browser session in `user_sessions`. Called once after login. */
    async recordSession(userId: string, isAdminSession: boolean): Promise<UserSession> {
      const { data, error } = await client
        .from('user_sessions')
        .insert({ user_id: userId, user_agent: navigator.userAgent, is_admin_session: isAdminSession })
        .select('*')
        .single();
      if (error) throw error;
      return mapSession(data as UserSessionRow);
    },

    async listMySessions(userId: string): Promise<UserSession[]> {
      const { data, error } = await client
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .is('terminated_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as UserSessionRow[]).map(mapSession);
    },

    async terminateSession(sessionId: string): Promise<UserSession> {
      const { data, error } = await client.rpc('terminate_user_session', { p_session_id: sessionId });
      if (error) throw error;
      return mapSession(data as UserSessionRow);
    },

    /** Signs out every OTHER session for the current user (real Supabase Auth API). */
    async terminateOtherSessions(): Promise<void> {
      const { error } = await client.auth.signOut({ scope: 'others' });
      if (error) throw error;
    },

    // --- 2FA (Supabase Auth MFA — TOTP) ---
    async listMfaFactors() {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp;
    },

    async enrollMfa() {
      const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      return data;
    },

    async verifyMfaEnrollment(factorId: string, code: string) {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (verifyError) throw verifyError;
    },

    async unenrollMfa(factorId: string) {
      const { error } = await client.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },

    // --- Admin Security Center ---
    async listSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
      const { data, error } = await client.from('security_events').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return (data as SecurityEventRow[]).map(mapEvent);
    },

    async listActiveSessions(limit = 100): Promise<UserSession[]> {
      const { data, error } = await client
        .from('user_sessions')
        .select('*')
        .is('terminated_at', null)
        .order('last_active_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as UserSessionRow[]).map(mapSession);
    },

    async getSecurityCounts() {
      const [{ count: blockedUsers }, { count: activeSessions }, { count: adminSessions }, { count: securityEvents }] = await Promise.all([
        client.from('profiles').select('id', { count: 'exact', head: true }).in('account_status', ['suspended', 'frozen']),
        client.from('user_sessions').select('id', { count: 'exact', head: true }).is('terminated_at', null),
        client.from('user_sessions').select('id', { count: 'exact', head: true }).is('terminated_at', null).eq('is_admin_session', true),
        client.from('security_events').select('id', { count: 'exact', head: true }),
      ]);
      return {
        blockedUsers: blockedUsers ?? 0,
        activeSessions: activeSessions ?? 0,
        adminSessions: adminSessions ?? 0,
        securityEvents: securityEvents ?? 0,
      };
    },
  };
}

export type SecurityService = ReturnType<typeof createSecurityService>;
