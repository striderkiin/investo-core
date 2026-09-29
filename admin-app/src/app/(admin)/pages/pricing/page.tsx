'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardBody, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import { formatMoney, statusLabel, statusVariant } from '@/investo/format'
import { investmentService } from '@/investo/services'
import PlanEditorModal, { type PlanInput } from './PlanEditorModal'
import type { InvestmentPlan, InvestmentPlanStatus } from '../../../../../../src/types/database'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Investment Plans' }

const PER: Record<InvestmentPlan['rateType'], string> = { daily: 'day', weekly: 'week', monthly: 'month' }
const PERIOD_DAYS: Record<InvestmentPlan['rateType'], number> = { daily: 1, weekly: 7, monthly: 30 }

// Simple (non-compounding) total over the plan's full term.
const totalReturn = (plan: InvestmentPlan) => (plan.rate * plan.durationDays) / PERIOD_DAYS[plan.rateType]

const PricingPlans = () => {
  const { can } = usePermission()
  const canManage = can('investments.manage')
  const { showNotification } = useNotificationContext()
  const [plans, setPlans] = useState<InvestmentPlan[] | null>(null)
  const [editing, setEditing] = useState<InvestmentPlan | 'new' | null>(null)

  const load = useCallback(() => {
    investmentService
      .listPlans()
      .then(setPlans)
      .catch((err: unknown) => showNotification({ message: err instanceof Error ? err.message : 'Could not load plans.', variant: 'danger' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(load, [load])

  const act = async (work: Promise<unknown>, message: string) => {
    try {
      await work
      showNotification({ message, variant: 'success' })
      load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'That did not work.', variant: 'danger' })
    }
  }

  const save = async (input: PlanInput) => {
    if (editing && editing !== 'new') await investmentService.updatePlan(editing.id, input)
    else await investmentService.createPlan(input)
    showNotification({ message: editing === 'new' ? 'Plan created.' : 'Plan saved.', variant: 'success' })
    load()
  }

  const setStatus = (plan: InvestmentPlan, status: InvestmentPlanStatus) =>
    act(investmentService.updatePlan(plan.id, { status }), `${plan.name} is now ${status}.`)

  const duplicate = (plan: InvestmentPlan) =>
    act(
      investmentService.createPlan({
        name: `${plan.name} (copy)`,
        description: plan.description,
        minAmount: plan.minAmount,
        maxAmount: plan.maxAmount,
        rate: plan.rate,
        rateType: plan.rateType,
        durationDays: plan.durationDays,
      }),
      'Plan copied. The copy starts active; pause it until it is ready.'
    )

  const remove = (plan: InvestmentPlan) => {
    if (!window.confirm(`Delete ${plan.name}? This cannot be undone. Plans that customers have invested in cannot be deleted; deactivate them instead.`)) return
    void act(investmentService.deletePlan(plan.id), 'Plan deleted.')
  }

  if (!plans) return <FallbackLoading />

  return (
    <>
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1">Investment Plans</h4>
          <p className="text-muted mb-0">
            Active plans appear on the landing page and on customers&apos; plans page as soon as you save. Paused plans are hidden from new
            investors; existing investments keep running.
          </p>
        </Col>
        {canManage && (
          <Col xs="auto">
            <Button variant="primary" className="icons-center" onClick={() => setEditing('new')}>
              <IconifyIcon icon="fa6-solid:plus" className="me-1" /> New plan
            </Button>
          </Col>
        )}
      </Row>
      {plans.length === 0 && <p className="text-muted text-center py-5">No plans yet.</p>}
      <Row className="justify-content-center">
        {plans.map((plan) => (
          <Col md={6} lg={3} key={plan.id}>
            <Card className={plan.status !== 'active' ? 'opacity-75' : undefined}>
              <CardBody>
                <div className="text-center">
                  <span className={`badge bg-${statusVariant(plan.status)}-subtle text-${statusVariant(plan.status)} mt-0 py-1 px-2 mx-auto`}>
                    {statusLabel(plan.status)}
                  </span>
                  <h6 className="pt-3 pb-2 m-0 fs-18 fw-medium">{plan.name}</h6>
                  <p className="text-muted pt-2 mb-0">{plan.description || 'No description'}</p>
                  <div className="pt-3">
                    <h2 className="d-inline-block ">{plan.rate}%</h2>
                    <small className="font-12 text-muted">/{PER[plan.rateType]}</small>
                  </div>
                  <hr className="hr-dashed" />
                  <ul className="list-unstyled pricing-content text-start pt-3 border-0 mb-0">
                    <li>
                      <span className="pricing-icon">
                        <IconifyIcon icon="fa6-solid:check" />
                      </span>
                      {formatMoney(plan.minAmount)} to {formatMoney(plan.maxAmount)}
                    </li>
                    <li>
                      <span className="pricing-icon">
                        <IconifyIcon icon="fa6-solid:check" />
                      </span>
                      Runs {plan.durationDays} days
                    </li>
                    <li>
                      <span className="pricing-icon">
                        <IconifyIcon icon="fa6-solid:check" />
                      </span>
                      {totalReturn(plan).toFixed(2)}% total over the term
                    </li>
                  </ul>
                  {canManage && (
                    <div className="d-flex gap-2 mt-3">
                      <Button variant="primary" className="py-2 flex-grow-1" onClick={() => setEditing(plan)}>
                        Edit
                      </Button>
                      <Dropdown align="end">
                        <DropdownToggle variant="dark" className="py-2" aria-label="More actions">
                          More
                        </DropdownToggle>
                        <DropdownMenu>
                          {plan.status !== 'active' && <DropdownItem onClick={() => void setStatus(plan, 'active')}>Activate</DropdownItem>}
                          {plan.status === 'active' && <DropdownItem onClick={() => void setStatus(plan, 'paused')}>Pause</DropdownItem>}
                          {plan.status !== 'inactive' && <DropdownItem onClick={() => void setStatus(plan, 'inactive')}>Deactivate</DropdownItem>}
                          <DropdownItem onClick={() => void duplicate(plan)}>Duplicate</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem className="text-danger" onClick={() => remove(plan)}>
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      {editing && <PlanEditorModal plan={editing === 'new' ? null : editing} show onClose={() => setEditing(null)} onSave={save} />}
    </>
  )
}

export default PricingPlans
