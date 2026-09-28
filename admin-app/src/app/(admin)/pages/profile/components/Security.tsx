import { useState } from 'react'
import { Button, Table } from 'react-bootstrap'

import ComponentContainerCard from '@/components/ComponentContainerCard'
import { useNotificationContext } from '@/context/useNotificationContext'
import { securityService } from '@/investo/services'
import type { AdminProfileData } from '../useAdminProfile'

const describeDevice = (userAgent: string | null) => {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser'
  const os = /iPhone|iPad/.test(userAgent) ? 'iOS' : /Android/.test(userAgent) ? 'Android' : /Mac OS X/.test(userAgent) ? 'macOS' : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}

const EVENT_LABELS: Record<string, string> = {
  password_changed: 'Password changed',
  '2fa_enabled': 'Two-factor authentication turned on',
  '2fa_disabled': 'Two-factor authentication removed',
}

const Security = ({ data }: { data: AdminProfileData }) => {
  const { showNotification } = useNotificationContext()
  const [working, setWorking] = useState(false)
  const factor = data.factors[0]

  // Removing the authenticator drops this session below the admin
  // requirement, so the guard sends the admin straight to set up a new one.
  const replaceAuthenticator = async () => {
    if (!factor || !window.confirm('Replace your authenticator? You will scan a new QR code straight away.')) return
    setWorking(true)
    try {
      await securityService.unenrollMfa(factor.id)
      await data.reload()
    } catch (error) {
      showNotification({ message: error instanceof Error ? error.message : 'Could not remove the authenticator.', variant: 'danger' })
    } finally {
      setWorking(false)
    }
  }

  const signOutOthers = async () => {
    setWorking(true)
    try {
      await securityService.terminateOtherSessions()
      await Promise.all(data.sessions.slice(1).map((session) => securityService.terminateSession(session.id).catch(() => undefined)))
      await data.reload()
      showNotification({ message: 'Signed out of all other sessions.', variant: 'success' })
    } catch (error) {
      showNotification({ message: error instanceof Error ? error.message : 'Could not sign out other sessions.', variant: 'danger' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <ComponentContainerCard title="Two-Factor Authentication">
        <p className="text-muted">
          {factor
            ? `On since ${new Date(factor.createdAt).toLocaleDateString()}. You'll be asked for a code from your authenticator app each time you sign in.`
            : 'Not set up.'}
        </p>
        {factor && (
          <Button variant="light" disabled={working} onClick={() => void replaceAuthenticator()}>
            Replace authenticator
          </Button>
        )}
      </ComponentContainerCard>

      <ComponentContainerCard title="Active Sessions">
        <div className="table-responsive">
          <Table className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Device</th>
                <th>Signed In</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((session, index) => (
                <tr key={session.id}>
                  <td>
                    {describeDevice(session.userAgent)}
                    {index === 0 && <span className="badge bg-success-subtle text-success ms-2">Most recent</span>}
                  </td>
                  <td>{new Date(session.createdAt).toLocaleString()}</td>
                  <td>{new Date(session.lastActiveAt).toLocaleString()}</td>
                </tr>
              ))}
              {data.sessions.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted text-center">
                    No sessions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        {data.sessions.length > 1 && (
          <Button variant="danger" className="mt-3" disabled={working} onClick={() => void signOutOthers()}>
            Sign out other sessions
          </Button>
        )}
      </ComponentContainerCard>

      <ComponentContainerCard title="Recent Security Activity">
        {data.events.length === 0 ? (
          <p className="text-muted mb-0">No security activity yet.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {data.events.map((event) => (
              <li key={event.id} className="d-flex justify-content-between border-bottom py-2">
                <span>{EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, ' ')}</span>
                <span className="text-muted">{new Date(event.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </ComponentContainerCard>
    </>
  )
}

export default Security
