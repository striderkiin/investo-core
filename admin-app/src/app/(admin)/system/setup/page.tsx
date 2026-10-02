'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import FallbackLoading from '@/components/FallbackLoading'
import { supabase } from '@/investo/services'

export const metadata: Metadata = { title: 'Setup Checklist' }

type Status = 'done' | 'todo' | 'manual'
type Item = {
  key: string
  title: string
  why: string
  status: Status
  /** Shown when the step is not done: exactly what to do. */
  howTo: string
  link?: { href: string; label: string }
  /** Section of docs/SETUP.md that covers this step. */
  guide: string
  optional?: boolean
}
type Group = { title: string; items: Item[] }

const BADGE: Record<Status, { label: string; variant: string; icon: string }> = {
  done: { label: 'Done', variant: 'success', icon: 'iconoir:check-circle' },
  todo: { label: 'To do', variant: 'warning', icon: 'iconoir:warning-circle' },
  manual: { label: 'Check by hand', variant: 'info', icon: 'iconoir:info-circle' },
}

const minutesAgo = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 60000 : Infinity)

// Reads the live settings and returns each setup step with its status.
const loadChecklist = async (): Promise<Group[]> => {
  const [{ data: branding }, { data: whiteLabel }, { data: integrations }, { data: plans }, { data: markets }, { data: social }, { data: activity }, { data: maintenance }, { data: admins }, { data: addresses }] =
    await Promise.all([
      supabase.from('branding').select('site_name, logo_url, logo_light_url, favicon_url').limit(1).maybeSingle(),
      supabase.from('white_label_settings').select('legal_business_name, support_email, primary_domain').limit(1).maybeSingle(),
      supabase.from('integration_configs').select('provider_type, provider_name, status'),
      supabase.from('investment_plans').select('id').eq('status', 'active'),
      supabase.from('market_assets').select('id, price_source, enabled, market_provider_state(updated_at)').eq('enabled', true),
      supabase.from('social_proof_settings').select('test_mode_enabled').limit(1).maybeSingle(),
      supabase.from('activity_settings').select('enabled').limit(1).maybeSingle(),
      supabase.from('maintenance_settings').select('enabled').limit(1).maybeSingle(),
      supabase.from('profiles').select('id').neq('role', 'client'),
      supabase.rpc('admin_list_deposit_addresses', { p_environment: 'demo' }),
    ])

  const connected = (type: string) => (integrations ?? []).some((i: { provider_type: string; status: string }) => i.provider_type === type && i.status === 'connected')
  const liveMarkets = (markets ?? []).filter((m: { price_source: string }) => m.price_source === 'live') as {
    market_provider_state: { updated_at: string } | { updated_at: string }[] | null
  }[]
  const newestLiveUpdate = Math.min(
    ...liveMarkets.map((m) => minutesAgo((Array.isArray(m.market_provider_state) ? m.market_provider_state[0] : m.market_provider_state)?.updated_at))
  )
  const hasAddresses = ((addresses ?? []) as { address?: string }[]).some((a) => a.address)

  return [
    {
      title: 'Your brand',
      items: [
        {
          key: 'brand-name',
          title: 'Set your site name',
          why: 'The site name appears in page titles, emails, the dashboards and the footer.',
          status: branding?.site_name && branding.site_name !== 'Investo' ? 'done' : 'todo',
          howTo: 'Open Branding, type your site name in "Site name" and click Save changes.',
          link: { href: '/system/branding', label: 'Open Branding' },
          guide: 'Step 7',
        },
        {
          key: 'brand-logo',
          title: 'Upload your logo and favicon',
          why: 'The template ships with the Investo logo. Customers see your logo on every page.',
          status: branding?.favicon_url && branding.logo_url && !branding.logo_url.startsWith('/brand/investo') ? 'done' : 'todo',
          howTo: 'Open Branding and upload a logo, a logo for light backgrounds, a logo for dark backgrounds and a favicon. Then click Save changes.',
          link: { href: '/system/branding', label: 'Open Branding' },
          guide: 'Step 7',
        },
        {
          key: 'business',
          title: 'Add your business details',
          why: 'Your legal name and support email appear in emails and on the Contact page.',
          status: whiteLabel?.legal_business_name && whiteLabel.support_email ? 'done' : 'todo',
          howTo: 'Open Branding, click the "Business details" tab, fill in "Legal business name" and "Support email", and click Save changes.',
          link: { href: '/system/branding', label: 'Open Business details' },
          guide: 'Step 7',
        },
      ],
    },
    {
      title: 'Email',
      items: [
        {
          key: 'resend',
          title: 'Connect Resend',
          why: 'Without it, the site cannot send admin invites, statements or test emails.',
          status: connected('email') ? 'done' : 'todo',
          howTo: 'Create an API key at resend.com, verify your sending domain there, then open Integrations and fill in the Email (Resend) card.',
          link: { href: '/system/integrations', label: 'Open Integrations' },
          guide: 'Step 8',
        },
        {
          key: 'email-hook',
          title: 'Send sign-up and password emails through Resend',
          why: 'Supabase sends only a few sign-up emails per hour on its own. The email hook sends them through Resend with your branding.',
          status: 'manual',
          howTo: 'In Supabase, open Authentication, then Hooks, add a "Send Email" hook pointing to the auth-email-hook function, and save its secret as SEND_EMAIL_HOOK_SECRET under Edge Functions, then Secrets.',
          guide: 'Step 8',
        },
      ],
    },
    {
      title: 'Payments',
      items: [
        {
          key: 'payments',
          title: 'Choose how customers pay',
          why: 'Customers cannot deposit until you either connect a payment provider or enter your own wallet addresses.',
          status: connected('payment') || hasAddresses ? 'done' : 'todo',
          howTo: 'Open Integrations. Either add your wallet addresses in "Deposit wallet addresses" (you confirm each deposit by hand under Deposits), or connect a payment provider.',
          link: { href: '/system/integrations', label: 'Open Integrations' },
          guide: 'Step 9',
        },
      ],
    },
    {
      title: 'What customers can do',
      items: [
        {
          key: 'plans',
          title: 'Create at least one investment plan',
          why: 'Customers can only invest in active plans. The landing page lists them too.',
          status: (plans ?? []).length > 0 ? 'done' : 'todo',
          howTo: 'Open Investment Plans and click "New plan".',
          link: { href: '/plans', label: 'Open Investment Plans' },
          guide: 'Step 10',
        },
        {
          key: 'markets',
          title: 'Choose the markets customers see',
          why: 'These appear in the market dropdowns on the customer dashboard, wallet and account pages.',
          status: (markets ?? []).length > 0 ? 'done' : 'todo',
          howTo: 'Open Market Controls, click the "Live markets" tab, and use "Add market".',
          link: { href: '/market', label: 'Open Market Controls' },
          guide: 'Step 10',
        },
        {
          key: 'prices',
          title: 'Live prices are updating',
          why: 'Live markets get a new price every 5 minutes. If they stop, customers see old prices.',
          status: liveMarkets.length === 0 ? 'manual' : newestLiveUpdate <= 15 ? 'done' : 'todo',
          howTo:
            liveMarkets.length === 0
              ? 'You have no live markets yet, so there is nothing to update.'
              : 'No live price has changed in the last 15 minutes. Store your project URL and anon key in Supabase Vault as described in the guide.',
          guide: 'Step 4',
        },
      ],
    },
    {
      title: 'Your team',
      items: [
        {
          key: 'team',
          title: 'Invite a second admin',
          why: 'A second admin can keep the site running if you lose access to your account.',
          status: (admins ?? []).length > 1 ? 'done' : 'todo',
          howTo: 'Open Admins, enter their email, choose a role and click "Send invite".',
          link: { href: '/system/admins', label: 'Open Admins' },
          guide: 'Step 6',
          optional: true,
        },
        {
          key: 'domain',
          title: 'Connect your own domain',
          why: 'Customers trust a site on your own domain more than a vercel.app address.',
          status: whiteLabel?.primary_domain ? 'done' : 'todo',
          howTo: 'Add the domain in Vercel under Settings, then Domains. Then enter it in Branding, Business details, "Primary domain".',
          link: { href: '/system/branding', label: 'Open Business details' },
          guide: 'Step 11',
          optional: true,
        },
      ],
    },
    {
      title: 'Before you launch',
      items: [
        {
          key: 'test-mode',
          title: 'Turn off social proof test notifications',
          why: 'Test notifications show sample activity to signed-in customers. Leave them off when real customers use the site.',
          status: social?.test_mode_enabled ? 'todo' : 'done',
          howTo: 'Open Social Proof, click "Test & preview", and switch "Test notifications" off.',
          link: { href: '/social-proof', label: 'Open Social Proof' },
          guide: 'Step 12',
        },
        {
          key: 'activity',
          title: 'Turn off activity simulation',
          why: 'Simulated activity is for demos only.',
          status: activity?.enabled ? 'todo' : 'done',
          howTo: 'Open Activity Simulation and switch "Activity simulation" off.',
          link: { href: '/system/activity', label: 'Open Activity Simulation' },
          guide: 'Step 12',
        },
        {
          key: 'maintenance',
          title: 'Maintenance mode is off',
          why: 'While it is on, customers may be locked out and deposits or withdrawals may be paused.',
          status: maintenance?.enabled ? 'todo' : 'done',
          howTo: 'Open Maintenance and switch "Maintenance mode" off.',
          link: { href: '/system/maintenance', label: 'Open Maintenance' },
          guide: 'Step 12',
        },
      ],
    },
  ]
}

// A live checklist of everything a new owner sets up before launch.
const SetupChecklist = () => {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    loadChecklist()
      .then(setGroups)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the checklist.'))
  }, [])

  useEffect(load, [load])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!groups) return <FallbackLoading />

  const required = groups.flatMap((g) => g.items).filter((i) => !i.optional && i.status !== 'manual')
  const done = required.filter((i) => i.status === 'done').length

  return (
    <>
      <Card>
        <CardBody>
          <Row className="align-items-center g-3">
            <Col>
              <h4 className="mb-1">Setup checklist</h4>
              <p className="text-muted mb-2">
                {done} of {required.length} required steps are done. Each step links to the page where you do it and to its section in SETUP.md.
              </p>
              <ProgressBar now={(done / Math.max(required.length, 1)) * 100} variant={done === required.length ? 'success' : 'primary'} style={{ height: 8 }} />
            </Col>
            <Col xs="auto">
              <button type="button" className="btn btn-light btn-sm" onClick={() => { setGroups(null); load() }}>
                <IconifyIcon icon="iconoir:refresh-double" className="me-1" />
                Check again
              </button>
            </Col>
          </Row>
        </CardBody>
      </Card>
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle as="h4">{group.title}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <ul className="list-group list-group-flush">
              {group.items.map((item) => {
                const badge = BADGE[item.status]
                return (
                  <li key={item.key} className="list-group-item px-0 py-3">
                    <div className="d-flex gap-3">
                      <IconifyIcon icon={badge.icon} className={`fs-22 text-${badge.variant} flex-shrink-0`} />
                      <div className="flex-grow-1">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="fw-semibold">{item.title}</span>
                          <span className={`badge bg-${badge.variant}-subtle text-${badge.variant}`}>{badge.label}</span>
                          {item.optional && <span className="badge bg-secondary-subtle text-secondary">Optional</span>}
                        </div>
                        <p className="text-muted mb-1 fs-13">{item.why}</p>
                        {item.status !== 'done' && <p className="mb-2 fs-13">{item.howTo}</p>}
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          {item.link && item.status !== 'done' && (
                            <Link href={item.link.href} className="btn btn-sm btn-primary">
                              {item.link.label}
                            </Link>
                          )}
                          <small className="text-muted">SETUP.md, {item.guide}</small>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>
      ))}
    </>
  )
}

export default SetupChecklist
