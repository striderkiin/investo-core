'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import FallbackLoading from '@/components/FallbackLoading'
import { supabase } from '@/investo/services'

export const metadata: Metadata = { title: 'Setup Checklist' }

type Status = 'done' | 'todo'
type Item = {
  key: string
  title: string
  why: string
  status: Status
  /** Shown when the step is not done: exactly what to do. */
  howTo: string
  link?: { href: string; label: string }
  /** Chapter of the Launch Guide that covers this step. */
  guide: string
  /** Steps only the owner can judge: they press "Mark as done". */
  confirm?: boolean
  optional?: boolean
}
type Group = { title: string; items: Item[] }

const BADGE: Record<Status, { label: string; variant: string; icon: string }> = {
  done: { label: 'Done', variant: 'success', icon: 'iconoir:check-circle' },
  todo: { label: 'To do', variant: 'warning', icon: 'iconoir:warning-circle' },
}

const LEGAL_KEYS = ['legal.terms', 'legal.privacy', 'legal.risk', 'legal.refund']
const HOSTED_DEFAULTS = /(^localhost$)|(^127\.)|(\.vercel\.app$)/

// Reads the live settings and returns each launch step with its status.
const loadChecklist = async (): Promise<Group[]> => {
  const [{ data: branding }, { data: whiteLabel }, { data: integrations }, { data: plans }, { data: social }, { data: maintenance }, { data: content }, { data: addresses }, deposits, withdrawals] =
    await Promise.all([
      supabase.from('branding').select('site_name, logo_url, logo_light_url, favicon_url').limit(1).maybeSingle(),
      supabase.from('white_label_settings').select('legal_business_name, support_email, primary_domain').limit(1).maybeSingle(),
      supabase.from('integration_configs').select('provider_type, provider_name, status'),
      supabase.from('investment_plans').select('id').eq('status', 'active'),
      supabase.from('social_proof_settings').select('test_mode_enabled').limit(1).maybeSingle(),
      supabase.from('maintenance_settings').select('enabled').limit(1).maybeSingle(),
      supabase.from('site_content').select('key'),
      supabase.rpc('admin_list_deposit_addresses', { p_environment: 'live' }),
      supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

  const connected = (type: string) => (integrations ?? []).some((i: { provider_type: string; status: string }) => i.provider_type === type && i.status === 'connected')
  const saved = new Set(((content ?? []) as { key: string }[]).map((r) => r.key))
  const confirmed = (key: string): Status => (saved.has(`setup.${key}`) ? 'done' : 'todo')
  const hasAddresses = ((addresses ?? []) as { address?: string }[]).some((a) => a.address)
  const onOwnDomain = !HOSTED_DEFAULTS.test(window.location.hostname)
  const landingEdited = [...saved].some((k) => !k.startsWith('legal.') && !k.startsWith('setup.'))

  return [
    {
      title: 'Your site',
      items: [
        {
          key: 'domain',
          title: 'Connect your domain',
          why: 'Customers trust a site on your own domain. We host it; you only point your domain at it.',
          status: onOwnDomain ? 'done' : 'todo',
          howTo: 'Add the DNS records we sent you at the company where you bought your domain. It can take up to 24 hours to work. Then open the admin panel on your own domain and this step turns green.',
          guide: 'Chapter 2',
        },
      ],
    },
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
          guide: 'Chapter 6',
        },
        {
          key: 'brand-logo',
          title: 'Upload your logo and favicon',
          why: 'Customers see your logo on every page, and the favicon in their browser tab.',
          status: branding?.favicon_url && branding.logo_url && !branding.logo_url.startsWith('/brand/investo') ? 'done' : 'todo',
          howTo: 'Open Branding and upload a logo, a logo for light backgrounds, a logo for dark backgrounds and a favicon. Then click Save changes.',
          link: { href: '/system/branding', label: 'Open Branding' },
          guide: 'Chapter 6',
        },
        {
          key: 'business',
          title: 'Add your business details',
          why: 'Your legal name and support email appear in emails and on the website.',
          status: whiteLabel?.legal_business_name && whiteLabel.support_email ? 'done' : 'todo',
          howTo: 'Open Branding, click the "Business details" tab, fill in "Legal business name" and "Support email", and click Save changes.',
          link: { href: '/system/branding', label: 'Open Business details' },
          guide: 'Chapter 6',
        },
      ],
    },
    {
      title: 'Email and payments',
      items: [
        {
          key: 'email',
          title: 'Connect email',
          why: 'Sign-up confirmations, password resets and statements are sent from your own address.',
          status: connected('email') ? 'done' : 'todo',
          howTo: 'Create a Resend account, add your domain there and add the DNS records it shows you. Then open Integrations and fill in the Email (Resend) card.',
          link: { href: '/system/integrations', label: 'Open Integrations' },
          guide: 'Chapter 5',
        },
        {
          key: 'payments',
          title: 'Connect payments',
          why: 'Customers cannot deposit, and withdrawals cannot be paid out automatically, until PayRam is connected.',
          status: connected('payment') || hasAddresses ? 'done' : 'todo',
          howTo: 'Set up your PayRam server, then open Integrations, fill in the PayRam card and click "Check connection". If you take deposits by hand instead, add your wallet addresses on the same page.',
          link: { href: '/system/integrations', label: 'Open Integrations' },
          guide: 'Chapter 4',
        },
      ],
    },
    {
      title: 'Your content',
      items: [
        {
          key: 'plans',
          title: 'Review your investment plans',
          why: 'Your site starts with four sample plans. Check the names, rates, limits and minimum withdrawals before customers invest.',
          status: (plans ?? []).length > 0 ? confirmed('plans') : 'todo',
          howTo: (plans ?? []).length > 0 ? 'Open Investment Plans, edit each plan as you need, then come back and click "Mark as done".' : 'Open Investment Plans and click "New plan". Customers can only invest in active plans.',
          link: { href: '/plans', label: 'Open Investment Plans' },
          guide: 'Chapter 6',
          confirm: (plans ?? []).length > 0,
        },
        {
          key: 'landing',
          title: 'Make the website yours',
          why: 'The website starts with sample wording and pictures.',
          status: landingEdited ? 'done' : 'todo',
          howTo: 'Open Landing Page and change the headings, text and pictures to suit your business, then click Save changes.',
          link: { href: '/system/website', label: 'Open Landing Page' },
          guide: 'Chapter 6',
        },
        {
          key: 'legal',
          title: 'Write your legal pages',
          why: 'Terms, Privacy Policy, Risk Disclosure and Refund Policy must describe your business and your country\'s rules. The sample text is only a starting point.',
          status: LEGAL_KEYS.every((k) => saved.has(k)) ? 'done' : 'todo',
          howTo: `Open Landing Page, then each page under "Legal pages". Update the text and save. ${LEGAL_KEYS.filter((k) => !saved.has(k)).length} of 4 pages still use the sample text.`,
          link: { href: '/system/website', label: 'Open Legal pages' },
          guide: 'Chapter 7',
        },
        {
          key: 'social',
          title: 'Decide on the activity pop-ups',
          why: 'The demo ticker shows example activity to visitors. Decide whether you want it, and check its lines.',
          status: confirmed('social'),
          howTo: 'Open Social Proof, review the Demo ticker lines and turn it on or off. Then come back and click "Mark as done".',
          link: { href: '/social-proof', label: 'Open Social Proof' },
          guide: 'Chapter 6',
          confirm: true,
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
          guide: 'Chapter 8',
        },
        {
          key: 'test-money',
          title: 'Make a small test deposit and withdrawal',
          why: 'The only way to be sure payments work end to end. Use a small amount such as $10.',
          status: (deposits.count ?? 0) > 0 && (withdrawals.count ?? 0) > 0 ? 'done' : 'todo',
          howTo: 'Create a customer account on your site, deposit $10, then request a withdrawal and pay it from Withdrawals. This step turns green when both are completed.',
          link: { href: '/withdrawals', label: 'Open Withdrawals' },
          guide: 'Chapter 8',
        },
        {
          key: 'maintenance',
          title: 'Maintenance mode is off',
          why: 'While it is on, customers may be locked out and deposits or withdrawals may be paused.',
          status: maintenance?.enabled ? 'todo' : 'done',
          howTo: 'Open Maintenance and switch "Maintenance mode" off.',
          link: { href: '/system/maintenance', label: 'Open Maintenance' },
          guide: 'Chapter 8',
        },
      ],
    },
  ]
}

// A live checklist of everything a new owner does before launch. We host the
// site, so only the steps the owner does are listed.
const SetupChecklist = () => {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    loadChecklist()
      .then(setGroups)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the checklist.'))
  }, [])

  useEffect(load, [load])

  // Owner-confirmed steps are remembered as a site_content row, so they stay done.
  const markDone = async (key: string) => {
    const { error: saveError } = await supabase.from('site_content').upsert({ key: `setup.${key}`, value: new Date().toISOString() }, { onConflict: 'key' })
    if (saveError) setError(saveError.message)
    else load()
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!groups) return <FallbackLoading />

  const required = groups.flatMap((g) => g.items).filter((i) => !i.optional)
  const done = required.filter((i) => i.status === 'done').length

  return (
    <>
      <Card>
        <CardBody>
          <Row className="align-items-center g-3">
            <Col>
              <h4 className="mb-1">Setup checklist</h4>
              <p className="text-muted mb-2">
                {done} of {required.length} steps are done. Each step links to the page where you do it and to its chapter in the Launch Guide.
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
                          {item.confirm && item.status !== 'done' && (
                            <button type="button" className="btn btn-sm btn-light" onClick={() => void markDone(item.key)}>
                              Mark as done
                            </button>
                          )}
                          <small className="text-muted">Launch Guide, {item.guide}</small>
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
