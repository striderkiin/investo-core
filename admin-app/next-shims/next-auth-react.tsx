import type { ReactNode } from 'react'

// Preview-only stand-in for next-auth: the template's pages render as a
// signed-in demo user, and the login form "succeeds" the way the template's
// demo credentials do. Real Supabase auth replaces this in the fixes stage.
const demoSession = {
  user: { name: 'Demo User', email: 'user@demo.com' },
  expires: '',
}

export const SessionProvider = ({ children }: { children: ReactNode }) => <>{children}</>

type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

export const useSession = () => ({
  data: demoSession,
  status: 'authenticated' as SessionStatus,
  update: async () => demoSession,
})

export const signIn = async (_provider?: string, _options?: Record<string, unknown>) => ({
  ok: true,
  error: undefined as string | undefined,
  status: 200,
  url: null,
})

export const signOut = async () => undefined
