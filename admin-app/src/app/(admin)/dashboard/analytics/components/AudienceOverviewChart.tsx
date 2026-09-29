'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ApexOptions } from 'apexcharts'
import { useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import { formatMoney, formatMoneyAxis } from '@/investo/format'
import { bucketByRange, RANGE_LABELS, sumAmount, type ChartRange, type DashboardData } from '../useDashboardData'

const AudienceOverviewChart = ({ data }: { data: DashboardData }) => {
  const [range, setRange] = useState<ChartRange>('12m')
  const deposits = bucketByRange(data.deposits, range)
  const withdrawals = bucketByRange(data.withdrawals, range)

  const audienceChartOpts: ApexOptions = {
    chart: {
      height: 280,
      type: 'area',
      toolbar: {
        show: false,
      },
      dropShadow: {
        enabled: true,
        top: 12,
        left: 0,
        blur: 2,
        color: 'rgba(132, 145, 183, 0.3)',
        opacity: 0.35,
      },
    },
    colors: ['#a8442e', 'rgba(106, 155, 155, 0.3)'],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      curve: 'smooth',
      width: [3, 3],
      dashArray: [0, 0],
      lineCap: 'round',
    },
    series: [
      {
        name: 'Deposits',
        data: deposits.map((b) => b.total),
      },
      {
        name: 'Withdrawals',
        data: withdrawals.map((b) => b.total),
      },
    ],
    labels: deposits.map((b) => b.label),
    xaxis: {
      tickAmount: range === '30d' ? 10 : undefined,
    },
    yaxis: {
      labels: {
        offsetX: -12,
        offsetY: 0,
        formatter: function (value) {
          return formatMoneyAxis(value)
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatMoney(value),
      },
    },
    grid: {
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    },

    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        shadeIntensity: 1,
        inverseColors: !1,
        opacityFrom: 0.05,
        opacityTo: 0.05,
        stops: [45, 100],
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Deposits vs Withdrawals</CardTitle>
            <p className="text-muted mb-0 fs-12">
              Completed in this period: {formatMoney(sumAmount(deposits.map((b) => ({ amount: b.total }))))} in,{' '}
              {formatMoney(sumAmount(withdrawals.map((b) => ({ amount: b.total }))))} out
            </p>
          </Col>
          <Col xs="auto">
            <Dropdown>
              <DropdownToggle className="btn bt btn-light icons-center">
                <i className="icofont-calendar fs-5 me-1" />
                {RANGE_LABELS[range]}
                <IconifyIcon icon="la:angle-down" className="ms-1" />
              </DropdownToggle>
              <DropdownMenu align={'end'}>
                {(Object.keys(RANGE_LABELS) as ChartRange[]).map((key) => (
                  <DropdownItem key={key} active={key === range} onClick={() => setRange(key)}>
                    {RANGE_LABELS[key]}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <ReactApexChart key={range} height={280} series={audienceChartOpts.series} options={audienceChartOpts} type="area" />
      </CardBody>
    </Card>
  )
}

export default AudienceOverviewChart
