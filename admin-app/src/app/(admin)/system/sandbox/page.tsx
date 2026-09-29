'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { formatDateTime, formatMoney } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createSandboxTestingService } from '../../../../../../src/services/api/sandboxTestingService'
import type { Deposit } from '../../../../../../src/types/database'
import { APP_ENVIRONMENT } from '../../../../../../src/config/env'

export const metadata: Metadata = { title: 'Sandbox Testing' }

const sandboxTestingService = createSandboxTestingService(supabase)

// Runs a pending sandbox deposit through the real signed-webhook path (the old Sandbox page).
const SandboxTesting = () => {
  const { showNotification } = useNotificationContext()
  const [deposits, setDeposits] = useState<Deposit[] | null>(null)
  const [people, setPeople] = useState<Map<string, CustomerSummary>>(new Map())
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const list = await sandboxTestingService.listPendingSandboxDeposits()
      setPeople(await lookupCustomers(list.map((d) => d.userId)))
      setDeposits(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sandbox deposits.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const simulate = async (d: Deposit) => {
    setRunning(d.id)
    try {
      await sandboxTestingService.simulateWebhook(d.id)
      showNotification({ message: 'Webhook accepted: the deposit is confirmed.', variant: 'success' })
      await load()
    } catch (err) {
      showNotification({
        message: err instanceof Error ? err.message : 'The webhook failed. Check that a sandbox payment integration with a webhook secret is set up in Integrations.',
        variant: 'danger',
      })
    } finally {
      setRunning(null)
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!deposits) return <FallbackLoading />

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4">Sandbox testing</CardTitle>
        <p className="text-muted mb-0 fs-12">
          Test the payment flow without real money. A customer starts a deposit while the site runs in sandbox mode; here you send the signed confirmation a payment
          provider would send, through the same checks. Needs a sandbox payment integration with a webhook secret in <Link href="/system/integrations">Integrations</Link>.
        </p>
      </CardHeader>
      <CardBody className="pt-0">
        {APP_ENVIRONMENT !== 'sandbox' && (
          <div className="alert alert-info">
            This site is running in <strong>{APP_ENVIRONMENT}</strong> mode. You can still confirm any sandbox deposits listed below.
          </div>
        )}
        {deposits.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">No sandbox deposits waiting.</p>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead className="table-light">
                <tr>
                  <th>Started</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id}>
                    <td>{formatDateTime(d.createdAt)}</td>
                    <td>
                      <Link href={`/customers/${d.userId}`} className="text-body">
                        {people.get(d.userId)?.name ?? d.userId.slice(0, 8)}
                      </Link>
                    </td>
                    <td>
                      {formatMoney(d.amount)} <span className="text-muted">{d.currency}</span>
                    </td>
                    <td className="text-muted fs-12">{d.providerReference ?? '-'}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-primary" disabled={running === d.id} onClick={() => void simulate(d)}>
                        {running === d.id ? 'Sending…' : 'Send confirmation'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default SandboxTesting
