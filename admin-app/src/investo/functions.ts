import { supabase } from '@/investo/services'

/** Calls a Supabase edge function and turns its `{ error }` body into a thrown Error with that message. */
export const invokeFunction = async <T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      const parsed = (await context.json().catch(() => null)) as { error?: string } | null
      if (parsed?.error) message = parsed.error
    }
    throw new Error(message)
  }
  return data as T
}

export type EmailKind = 'test' | 'statement' | 'admin_invite'

export const sendEmail = (kind: EmailKind, payload: Record<string, unknown> = {}) =>
  invokeFunction<{ sent: boolean; to: string }>('send-email', { kind, ...payload })
