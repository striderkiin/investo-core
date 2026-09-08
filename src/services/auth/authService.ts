import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import type { Profile } from '../../types/database';
import { mapProfileRow, type ProfileRow } from '../supabase/mappers';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  referralCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export function createAuthService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async register({ email, password, fullName, referralCode }: RegisterInput): Promise<AuthResult> {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, referral_code: referralCode ?? null },
        },
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async login({ email, password }: LoginInput): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async logout(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async getSession(): Promise<Session | null> {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    },

    async updatePassword(newPassword: string): Promise<void> {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },

    async getCurrentProfile(): Promise<Profile | null> {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) return null;

      const { data, error } = await client.from('profiles').select('*').eq('id', userData.user.id).single();
      if (error) throw error;
      return mapProfileRow(data as ProfileRow);
    },

    onAuthStateChange(callback: (session: Session | null) => void) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
      return () => data.subscription.unsubscribe();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
