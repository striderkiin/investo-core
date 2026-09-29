import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { formatMoney } from '@/investo/format'
import type { CustomerDetail } from '../useCustomer'

type StatType = { title: string; stat: string; subText: string; icon: string; variant: string }

const StatCard = ({ icon, stat, subText, title, variant }: StatType) => {
  return (
    <Card className="shadow-none border mb-3 mb-lg-0">
      <CardBody>
        <div className="d-flex align-items-center">
          <IconifyIcon icon={icon} className={`fs-24 align-self-center text-${variant} me-2`} />
          <div className="flex-grow-1 text-truncate">
            <p className="text-dark mb-0 fw-semibold fs-13">{title}</p>
            <h3 className="mt-1 mb-0 fs-18 fw-bold">
              {stat} <span className="fs-11 text-muted fw-normal">{subText}</span>{' '}
            </h3>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const Stats = ({ detail }: { detail: CustomerDetail }) => {
  const { profile, deposits, withdrawals, investments } = detail
  const active = investments.filter((i) => i.status === 'active')
  const stats: StatType[] = [
    { title: 'Total Balance', stat: formatMoney(profile.totalBalance), subText: 'all balances', icon: 'iconoir:wallet', variant: 'primary' },
    { title: 'Available', stat: formatMoney(profile.availableBalance), subText: 'can withdraw', icon: 'iconoir:hand-cash', variant: 'success' },
    {
      title: 'Invested',
      stat: formatMoney(profile.investedBalance),
      subText: `${active.length} active ${active.length === 1 ? 'plan' : 'plans'}`,
      icon: 'iconoir:graph-up',
      variant: 'info',
    },
    { title: 'Bonus', stat: formatMoney(profile.bonusBalance), subText: 'bonus balance', icon: 'iconoir:gift', variant: 'warning' },
  ]
  const deposited = sum(deposits.filter((d) => d.status === 'completed').map((d) => d.amount))
  const withdrawn = sum(withdrawals.filter((w) => w.status === 'completed').map((w) => w.amount))
  const earned = sum(investments.map((i) => i.earnings))

  return (
    <Card>
      <CardBody>
        <Row className="g-3">
          {stats.map((stat, idx) => (
            <Col md={6} lg={6} key={idx}>
              <StatCard {...stat} />
            </Col>
          ))}
        </Row>
        <div className="bg-primary-subtle p-2 border-dashed border-primary rounded mt-3">
          <span className="text-primary fw-semibold">Lifetime: </span>
          <span className="text-primary fw-normal">
            {formatMoney(deposited)} deposited · {formatMoney(withdrawn)} withdrawn · {formatMoney(earned)} earned from plans
          </span>
        </div>
      </CardBody>
    </Card>
  )
}

export default Stats
