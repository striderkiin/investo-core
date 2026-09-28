import { useCallback, useEffect, useState } from 'react'

import { securityService } from '@/investo/services'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import type { SecurityEvent, UserSession } from '../../../../../../src/services/api/securityService'

type MfaFactor = { id: string; friendlyName?: string; createdAt: string }

export type AdminProfileData = {
  factors: MfaFactor[]
  sessions: UserSession[]
  events: SecurityEvent[]
  loading: boolean
  reload: () => Promise<void>
}

// The signed-in admin's own security state: authenticator, open sessions and
// recent security events.
export const useAdminProfile = (): AdminProfileData => {
  const { profile } = useAuth()
  const userId = profile?.id
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [totp, mySessions, myEvents] = await Promise.all([
        securityService.listMfaFactors(),
        securityService.listMySessions(userId),
        securityService.listMySecurityEvents(userId, 10),
      ])
      setFactors(totp.map((factor) => ({ id: factor.id, friendlyName: factor.friendly_name, createdAt: factor.created_at })))
      setSessions(mySessions)
      setEvents(myEvents)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { factors, sessions, events, loading, reload }
}
