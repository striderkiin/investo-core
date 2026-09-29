'use client'
import type { Metadata } from 'next'
import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import RecordList from '@/investo/RecordList'
import { lookupCustomers } from '@/investo/customerLookup'
import { formatDateTime, statusLabel } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createAuditService } from '../../../../../../src/services/api/auditService'
import type { AdminAuditLog } from '../../../../../../src/types/database'

export const metadata: Metadata = { title: 'Audit Logs' }

const auditService = createAuditService(supabase)

type Row = AdminAuditLog & { adminName: string }

const Value = ({ value }: { value: string | null }) =>
  value ? (
    <span className="d-inline-block text-truncate text-muted fs-12" style={{ maxWidth: 220 }} title={value}>
      {value}
    </span>
  ) : (
    <span className="text-muted">-</span>
  )

// Every admin action recorded by the database (ported from the old panel).
const AuditLogs = () => {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    auditService
      .list(undefined, 500)
      .then(async (logs) => {
        const admins = await lookupCustomers(logs.map((l) => l.adminId))
        setRows(logs.map((l) => ({ ...l, adminName: admins.get(l.adminId)?.name ?? l.adminId.slice(0, 8) })))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load the audit log.')
        setRows([])
      })
  }, [])

  const modules = [...new Set((rows ?? []).map((r) => r.module))].sort()

  const columns: ColumnDef<Row>[] = [
    { header: 'When', cell: ({ row: { original } }) => formatDateTime(original.createdAt) },
    { header: 'Admin', cell: ({ row: { original } }) => original.adminName },
    { header: 'Action', cell: ({ row: { original } }) => statusLabel(original.action) },
    { header: 'Area', cell: ({ row: { original } }) => statusLabel(original.module) },
    { header: 'Target', cell: ({ row: { original } }) => <Value value={original.target} /> },
    { header: 'Before', cell: ({ row: { original } }) => <Value value={original.previousValue} /> },
    { header: 'After', cell: ({ row: { original } }) => <Value value={original.newValue} /> },
  ]

  return (
    <RecordList<Row>
      title="Audit Logs"
      subtitle={(visible) => `${visible.length} shown · the latest 500 admin actions`}
      rows={rows}
      error={error}
      columns={columns}
      tabs={[{ key: 'all', label: 'All', match: () => true }, ...modules.map((m) => ({ key: m, label: statusLabel(m), match: (r: Row) => r.module === m }))]}
      searchText={(r) => [r.adminName, r.action, r.target, r.previousValue, r.newValue]}
      searchPlaceholder="Search admin, action or value"
    />
  )
}

export default AuditLogs
