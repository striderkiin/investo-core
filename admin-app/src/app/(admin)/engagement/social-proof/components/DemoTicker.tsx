import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { AVATAR_LIBRARY } from '../../../../../../../src/shared/avatar'
import type { SocialProofDemoActivity, SocialProofDemoEventType, SocialProofSettings } from '../../../../../../../src/types/database'
import { socialProofService } from '../service'

const TYPES: { value: SocialProofDemoEventType; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'investment', label: 'Investment' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'market', label: 'Market' },
  { value: 'account', label: 'Account' },
]

type Props = {
  settings: SocialProofSettings
  activities: SocialProofDemoActivity[]
  setActivities: (update: (cur: SocialProofDemoActivity[]) => SocialProofDemoActivity[]) => void
  canManage: boolean
  persist: (updates: Partial<SocialProofSettings>) => Promise<void>
}

const AvatarSelect = ({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (key: string) => void }) => (
  <select className="form-select form-select-sm" style={{ maxWidth: 120 }} aria-label="Avatar" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    <option value="">No avatar</option>
    {AVATAR_LIBRARY.map((a) => (
      <option key={a.key} value={a.key}>
        {a.label}
      </option>
    ))}
  </select>
)

// The rotating demo toast shown to visitors: canned lines not tied to real users.
const DemoTicker = ({ settings, activities, setActivities, canManage, persist }: Props) => {
  const { showNotification } = useNotificationContext()
  const [draft, setDraft] = useState({ type: 'deposit' as SocialProofDemoEventType, avatarKey: '', name: '', location: '', message: '' })

  const update = async (id: string, changes: Parameters<typeof socialProofService.updateDemoActivity>[1], quiet = false) => {
    try {
      const updated = await socialProofService.updateDemoActivity(id, changes)
      setActivities((cur) => cur.map((a) => (a.id === id ? updated : a)))
      if (!quiet) showNotification({ message: 'Saved.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save.', variant: 'danger' })
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Remove this line from the ticker?')) return
    try {
      await socialProofService.deleteDemoActivity(id)
      setActivities((cur) => cur.filter((a) => a.id !== id))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not remove.', variant: 'danger' })
    }
  }

  const add = async () => {
    if (!draft.message.trim()) return
    try {
      const created = await socialProofService.createDemoActivity(draft.type, draft.message.trim(), draft.name.trim() || null, draft.location.trim() || null, draft.avatarKey || null)
      setActivities((cur) => [...cur, created])
      setDraft({ ...draft, avatarKey: '', name: '', location: '', message: '' })
      showNotification({ message: 'Line added.', variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not add.', variant: 'danger' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Demo activity ticker</CardTitle>
            <p className="text-muted mb-0 fs-12">
              A rotating pop-up of example activity for marketing, shown on the website, the customer dashboard and here. These lines are not real customers. Leave name and
              location blank for a market line.
            </p>
          </Col>
          <Col xs="auto">
            <FormCheck
              type="switch"
              id="spDemoEnabled"
              label={settings.demoModeEnabled ? 'Showing to visitors' : 'Off'}
              checked={settings.demoModeEnabled}
              disabled={!canManage}
              onChange={(e) => void persist({ demoModeEnabled: e.target.checked })}
            />
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive" style={{ maxHeight: 460 }}>
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Avatar</th>
                <th>Name</th>
                <th>Location</th>
                <th>Line</th>
                <th>On</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="badge bg-secondary-subtle text-secondary">{TYPES.find((t) => t.value === a.eventType)?.label ?? a.eventType}</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <UserAvatar avatarKey={a.avatarKey} name={a.simulatedName} className="thumb-sm" />
                      <AvatarSelect value={a.avatarKey ?? ''} disabled={!canManage} onChange={(key) => void update(a.id, { avatarKey: key || null })} />
                    </div>
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      style={{ minWidth: 110 }}
                      aria-label="Name"
                      defaultValue={a.simulatedName ?? ''}
                      disabled={!canManage}
                      onBlur={(e) => e.target.value !== (a.simulatedName ?? '') && void update(a.id, { simulatedName: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      style={{ minWidth: 120 }}
                      aria-label="Location"
                      defaultValue={a.simulatedLocation ?? ''}
                      disabled={!canManage}
                      onBlur={(e) => e.target.value !== (a.simulatedLocation ?? '') && void update(a.id, { simulatedLocation: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      style={{ minWidth: 240 }}
                      aria-label="Line"
                      defaultValue={a.message}
                      disabled={!canManage}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== a.message && void update(a.id, { message: e.target.value })}
                    />
                  </td>
                  <td>
                    <FormCheck type="switch" aria-label="In rotation" checked={a.isActive} disabled={!canManage} onChange={(e) => void update(a.id, { isActive: e.target.checked }, true)} />
                  </td>
                  <td>
                    {canManage && (
                      <button type="button" className="btn btn-sm btn-light" aria-label="Remove" onClick={() => void remove(a.id)}>
                        <IconifyIcon icon="iconoir:trash" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canManage && (
          <div className="d-flex gap-2 flex-wrap mt-3 pt-3 border-top">
            <select className="form-select form-select-sm" style={{ maxWidth: 130 }} aria-label="New line type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as SocialProofDemoEventType })}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <AvatarSelect value={draft.avatarKey} disabled={false} onChange={(avatarKey) => setDraft({ ...draft, avatarKey })} />
            <input className="form-control form-control-sm" style={{ maxWidth: 140 }} placeholder="Name (optional)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input
              className="form-control form-control-sm"
              style={{ maxWidth: 150 }}
              placeholder="Location (optional)"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
            <input
              className="form-control form-control-sm flex-grow-1"
              style={{ minWidth: 220, width: 'auto' }}
              placeholder="e.g. just deposited $1,000"
              aria-label="New line"
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            />
            <button type="button" className="btn btn-sm btn-primary" disabled={!draft.message.trim()} onClick={() => void add()}>
              Add line
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default DemoTicker
