import { supabase } from '@/investo/services'

export type CustomerSummary = { id: string; name: string; email: string; avatarUrl: string | null; avatarKey: string | null }

/** Names and avatars for a set of user ids, for tables that only store user_id. */
export const lookupCustomers = async (ids: string[]): Promise<Map<string, CustomerSummary>> => {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url, avatar_key').in('id', unique)
  return new Map(
    (data ?? []).map((p: { id: string; full_name: string | null; email: string; avatar_url: string | null; avatar_key: string | null }) => [
      p.id,
      { id: p.id, name: p.full_name || p.email, email: p.email, avatarUrl: p.avatar_url, avatarKey: p.avatar_key },
    ])
  )
}
