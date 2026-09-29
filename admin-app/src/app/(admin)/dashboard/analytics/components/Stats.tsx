import { Card, CardBody, Col, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { formatMoney, formatMoneyShort } from '@/investo/format'
import type { StatType } from '../types'
import { PENDING_DEPOSIT, PENDING_WITHDRAWAL, since, sumAmount, type DashboardData } from '../useDashboardData'

const StatCard = ({ change, icon, stat, subTitle, title, variant }: StatType) => {
  return (
    <Card>
      <CardBody>
        <Row className="d-flex justify-content-center border-dashed-bottom pb-3">
          <Col xs={9}>
            <p className="text-dark mb-0 fw-semibold fs-14">{title}</p>
            <h3 className="mt-2 mb-0 fw-bold">{stat}</h3>
          </Col>
          <Col xs={3} className="align-self-center">
            <div className="d-flex justify-content-center align-items-center thumb-xl bg-light rounded-circle mx-auto">
              <IconifyIcon icon={icon} className="h1 align-self-center mb-0 text-secondary" />
            </div>
          </Col>
        </Row>
        <p className="mb-0 text-truncate text-muted mt-3">
          <span className={`text-${variant}`}>{change}</span> {subTitle}
        </p>
      </CardBody>
    </Card>
  )
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const buildStats = (data: DashboardData): StatType[] => {
  const newCustomers = data.customers.filter((c) => since(c.createdAt, 7)).length
  const completedDeposits = data.deposits.filter((d) => d.status === 'completed')
  const depositsThisMonth = sumAmount(completedDeposits.filter((d) => since(d.createdAt, 30)))
  const completedWithdrawals = data.withdrawals.filter((w) => w.status === 'completed')
  const pendingWithdrawals = data.withdrawals.filter((w) => PENDING_WITHDRAWAL.includes(w.status))
  const activeInvestments = data.investments.filter((i) => i.status === 'active')
  const pendingDeposits = data.deposits.filter((d) => PENDING_DEPOSIT.includes(d.status)).length
  const pendingKyc = data.kycStatuses.filter((s) => s === 'pending').length
  const needsAttention = pendingDeposits + pendingWithdrawals.length + pendingKyc + data.openTickets

  return [
    {
      title: 'Customers',
      stat: data.customers.length.toLocaleString(),
      icon: 'iconoir:group',
      change: `+${newCustomers}`,
      subTitle: 'Joined This Week',
      variant: newCustomers > 0 ? 'success' : 'muted',
    },
    {
      title: 'Total Deposits',
      stat: formatMoneyShort(sumAmount(completedDeposits)),
      icon: 'iconoir:arrow-down-circle',
      change: formatMoney(depositsThisMonth),
      subTitle: 'In The Last 30 Days',
      variant: depositsThisMonth > 0 ? 'success' : 'muted',
    },
    {
      title: 'Total Withdrawals',
      stat: formatMoneyShort(sumAmount(completedWithdrawals)),
      icon: 'iconoir:arrow-up-circle',
      change: formatMoney(sumAmount(pendingWithdrawals)),
      subTitle: 'Waiting To Be Paid Out',
      variant: pendingWithdrawals.length > 0 ? 'warning' : 'muted',
    },
    {
      title: 'Active Investments',
      stat: formatMoneyShort(sumAmount(activeInvestments)),
      icon: 'iconoir:graph-up',
      change: activeInvestments.length.toLocaleString(),
      subTitle: activeInvestments.length === 1 ? 'Plan Running' : 'Plans Running',
      variant: 'primary',
    },
    {
      title: 'Customer Balances',
      stat: formatMoneyShort(data.customers.reduce((total, c) => total + c.totalBalance, 0)),
      icon: 'iconoir:wallet',
      change: formatMoney(data.customers.reduce((total, c) => total + c.availableBalance, 0)),
      subTitle: 'Available To Withdraw',
      variant: 'primary',
    },
    {
      title: 'Needs Attention',
      stat: needsAttention.toLocaleString(),
      icon: 'iconoir:warning-triangle',
      change: needsAttention > 0 ? 'Waiting:' : 'All clear:',
      subTitle: [
        plural(pendingDeposits, 'deposit'),
        plural(pendingWithdrawals.length, 'withdrawal'),
        `${pendingKyc} KYC`,
        plural(data.openTickets, 'ticket'),
      ].join(' · '),
      variant: needsAttention > 0 ? 'danger' : 'muted',
    },
  ]
}

const Stats = ({ data }: { data: DashboardData }) => {
  return (
    <Row className="justify-content-center">
      {buildStats(data).map((stat, idx) => (
        <Col md={6} lg={4} key={idx}>
          <StatCard {...stat} />
        </Col>
      ))}
    </Row>
  )
}

export default Stats
