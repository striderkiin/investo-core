'use client'
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import ReactApexChart from 'react-apexcharts'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ApexOptions } from 'apexcharts'
import Link from 'next/link'
import { useState } from 'react'
import type { DashboardData } from '../useDashboardData'

type Metric = 'kyc' | 'deposits' | 'withdrawals'

// Share of finished items that went through, per queue.
const METRICS: Record<Metric, { label: string; title: string; href: string; describe: (data: DashboardData) => { value: number; text: string } }> = {
  kyc: {
    label: 'KYC',
    title: 'Verified Customers',
    href: '/kyc',
    describe: (data) => {
      const approved = data.kycStatuses.filter((s) => s === 'approved').length
      const pending = data.kycStatuses.filter((s) => s === 'pending').length
      return {
        value: data.customers.length ? Math.round((approved / data.customers.length) * 100) : 0,
        text: `${approved} of ${data.customers.length} customers are verified. ${pending} ${pending === 1 ? 'submission is' : 'submissions are'} waiting for review.`,
      }
    },
  },
  deposits: {
    label: 'Deposits',
    title: 'Deposits Completed',
    href: '/deposits',
    describe: (data) => {
      const done = data.deposits.filter((d) => d.status === 'completed').length
      return {
        value: data.deposits.length ? Math.round((done / data.deposits.length) * 100) : 0,
        text: `${done} of ${data.deposits.length} deposits have been confirmed and credited.`,
      }
    },
  },
  withdrawals: {
    label: 'Withdrawals',
    title: 'Withdrawals Paid Out',
    href: '/withdrawals',
    describe: (data) => {
      const done = data.withdrawals.filter((w) => w.status === 'completed').length
      return {
        value: data.withdrawals.length ? Math.round((done / data.withdrawals.length) * 100) : 0,
        text: `${done} of ${data.withdrawals.length} withdrawal requests have been paid out.`,
      }
    },
  },
}

const TrafficSources = ({ data }: { data: DashboardData }) => {
  const [metric, setMetric] = useState<Metric>('kyc')
  const { value, text } = METRICS[metric].describe(data)
  const chartOptions: ApexOptions = {
    series: [value],
    chart: {
      height: '325',
      type: 'radialBar',
      offsetY: -20,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: '75%',
          position: 'front',
        },
        track: {
          background: ['rgba(168, 68, 46, .18)'],
          strokeWidth: '80%',
          opacity: 0.5,
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: -2,
            fontSize: '20px',
          },
        },
      },
    },
    stroke: {
      lineCap: 'butt',
    },
    colors: ['#a8442e'],
    grid: {
      padding: {
        top: -10,
      },
    },

    labels: [METRICS[metric].title],
    responsive: [
      {
        breakpoint: 1150,
        options: {
          chart: {
            height: '150',
          },
        },
      },
    ],
  }
  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle>Completion Rates</CardTitle>
          </Col>
          <Col xs="auto">
            <Dropdown>
              <DropdownToggle className="btn bt btn-light">
                <i className="icofont-chart-pie fs-5 me-1" />
                {METRICS[metric].label}
                <IconifyIcon icon="la:angle-down" className="ms-1" />
              </DropdownToggle>
              <DropdownMenu align={'end'}>
                {(Object.keys(METRICS) as Metric[]).map((key) => (
                  <DropdownItem key={key} active={key === metric} onClick={() => setMetric(key)}>
                    {METRICS[key].label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div>
          <ReactApexChart key={metric} height={325} options={chartOptions} series={chartOptions.series} className="d-block w-90 mx-auto" type="radialBar" />
          <hr className="hr-dashed border-secondary w-25 mt-0 mx-auto" />
        </div>
        <div className="text-center">
          <h4>{METRICS[metric].title}</h4>
          <p className="text-muted mt-2">{text}</p>
          <Link href={METRICS[metric].href} className="btn btn-outline-primary px-3 mt-2">
            Open {METRICS[metric].label}
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}

export default TrafficSources
