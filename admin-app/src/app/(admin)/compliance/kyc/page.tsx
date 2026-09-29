'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import type { ColumnDef } from '@tanstack/react-table'
import { useNotificationContext } from '@/context/useNotificationContext'
import RecordList from '@/investo/RecordList'
import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { countryName, formatDate, formatDateTime, statusLabel } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createKycService, type KycReviewAction, type KycStatus, type KycSubmission } from '../../../../../../src/services/api/kycService'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'KYC Reviews' }

const kycService = createKycService(supabase)

const VARIANT: Record<KycStatus, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }

type Row = KycSubmission & { customer: CustomerSummary | null }

// Identity verification submissions from the client KYC page (ported from the old panel).
const KycReviews = () => {
  const { can } = usePermission()
  const canReview = can('compliance.manage')
  const { showNotification } = useNotificationContext()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<Row | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await kycService.listAll()
      const customers = await lookupCustomers(list.map((s) => s.userId))
      setRows(list.map((s) => ({ ...s, customer: customers.get(s.userId) ?? null })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions.')
      setRows([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openDocument = async (path: string) => {
    try {
      window.open(await kycService.getSignedDocumentUrl(path), '_blank', 'noopener,noreferrer')
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not open the document.', variant: 'danger' })
    }
  }

  const review = async (action: KycReviewAction) => {
    if (!reviewing) return
    if (action === 'reject' && !notes.trim()) {
      showNotification({ message: 'Add a reason so the customer knows what to fix.', variant: 'warning' })
      return
    }
    setSaving(true)
    try {
      await kycService.review(reviewing.id, action, notes.trim() || undefined)
      showNotification({ message: action === 'approve' ? 'Identity approved.' : 'Submission rejected.', variant: 'success' })
      setReviewing(null)
      await load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not save the review.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<Row>[] = [
    {
      header: 'Customer',
      cell: ({ row: { original } }) =>
        original.customer ? (
          <Link href={`/customers/${original.userId}`} className="text-body">
            {original.customer.name}
            <small className="d-block text-muted">{original.customer.email}</small>
          </Link>
        ) : (
          <span className="text-muted">Unknown</span>
        ),
    },
    {
      header: 'Legal name',
      cell: ({ row: { original } }) => (
        <>
          {original.legalFullName}
          <small className="d-block text-muted">Born {formatDate(original.dateOfBirth)}</small>
        </>
      ),
    },
    { header: 'Country', cell: ({ row: { original } }) => (original.country ? countryName(original.country) : '-') },
    {
      header: 'Documents',
      cell: ({ row: { original } }) => (
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-light" onClick={() => void openDocument(original.idDocumentPath)}>
            ID
          </button>
          <button type="button" className="btn btn-sm btn-light" onClick={() => void openDocument(original.proofOfAddressPath)}>
            Address
          </button>
        </div>
      ),
    },
    { header: 'Submitted', cell: ({ row: { original } }) => formatDateTime(original.createdAt) },
    {
      header: 'Status',
      cell: ({ row: { original } }) => (
        <>
          <span className={`badge bg-${VARIANT[original.status]}-subtle text-${VARIANT[original.status]}`}>{statusLabel(original.status)}</span>
          {original.reviewNotes && (
            <small className="d-block text-muted text-truncate" style={{ maxWidth: 220 }} title={original.reviewNotes}>
              {original.reviewNotes}
            </small>
          )}
        </>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row: { original } }) =>
        canReview && original.status === 'pending' ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              setNotes('')
              setReviewing(original)
            }}
          >
            Review
          </button>
        ) : null,
    },
  ]

  const count = (status: KycStatus) => (rows ?? []).filter((r) => r.status === status).length

  return (
    <>
      <RecordList<Row>
        title="KYC Reviews"
        subtitle={(visible) => `${visible.length} shown · open each document before approving`}
        rows={rows}
        error={error}
        columns={columns}
        tabs={[
          { key: 'pending', label: `Pending (${count('pending')})`, match: (r) => r.status === 'pending' },
          { key: 'approved', label: 'Approved', match: (r) => r.status === 'approved' },
          { key: 'rejected', label: 'Rejected', match: (r) => r.status === 'rejected' },
          { key: 'all', label: 'All', match: () => true },
        ]}
        searchText={(r) => [r.legalFullName, r.customer?.name, r.customer?.email, r.country ? countryName(r.country) : null]}
        searchPlaceholder="Search name, email or country"
      />
      {reviewing && (
        <Modal show onHide={() => setReviewing(null)} centered>
          <ModalHeader closeButton>
            <ModalTitle as="h5">Review {reviewing.legalFullName}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="mb-2">
              {reviewing.country ? countryName(reviewing.country) : 'Country not given'} · born {formatDate(reviewing.dateOfBirth)}
            </p>
            <div className="d-flex gap-2 mb-3">
              <button type="button" className="btn btn-sm btn-light" onClick={() => void openDocument(reviewing.idDocumentPath)}>
                Open ID document
              </button>
              <button type="button" className="btn btn-sm btn-light" onClick={() => void openDocument(reviewing.proofOfAddressPath)}>
                Open proof of address
              </button>
            </div>
            <label htmlFor="kyc-notes" className="form-label">
              Note to the customer <span className="text-muted">(required to reject)</span>
            </label>
            <textarea id="kyc-notes" className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline-danger" disabled={saving} onClick={() => void review('reject')}>
              Reject
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void review('approve')}>
              Approve
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

export default KycReviews
