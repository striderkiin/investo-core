'use client'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import Link from 'next/link'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ApexOptions } from 'apexcharts'
import ReactApexChart from 'react-apexcharts'
import UserAvatar from '@/investo/UserAvatar'
import type { DashboardData } from '../useDashboardData'

// Sign-ups per day over the last 7 days, oldest first.
const lastSevenDays = (data: DashboardData) => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, idx) => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - idx))
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
    return {
      label: start.toLocaleDateString(undefined, { weekday: 'short' }),
      count: data.customers.filter((c) => new Date(c.createdAt) >= start && new Date(c.createdAt) < end).length,
    }
  })
}

const NewVisitors = ({ data }: { data: DashboardData }) => {
  const days = lastSevenDays(data)
  const newThisWeek = days.reduce((total, day) => total + day.count, 0)
  const latest = data.customers.slice(0, 4)
  const others = Math.max(data.customers.length - latest.length, 0)

  const chartOptions: ApexOptions = {
    series: [
      {
        name: 'New customers',
        data: days.map((day) => day.count),
      },
    ],
    chart: {
      height: 230,
      type: 'bar',
      toolbar: {
        show: false,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 1,
        colorStops: [
          {
            offset: 0,
            color: 'rgba(106, 155, 155, 0.4)',
            opacity: 1,
          },
          {
            offset: 100,
            color: 'rgba(106, 155, 155, 0.4)',
            opacity: 1,
          },
        ],
      },
    },

    plotOptions: {
      bar: {
        columnWidth: '55%',
        // endingShape: "rounded",
        borderRadius: 5,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    grid: {
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    xaxis: {
      type: 'category',
      categories: days.map((day) => day.label),
      axisBorder: {
        show: false,
        color: 'rgba(119, 119, 142, 0.05)',
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        borderType: 'solid',
        color: 'rgba(119, 119, 142, 0.05)',
        // width: 6,
        offsetX: 0,
        offsetY: 0,
      },
      labels: {
        rotate: -90,
        style: {
          colors: 'rgb(107 ,114 ,128)',
          fontSize: '12px',
        },
      },
    },
  }

  return (
    <Card>
      <CardBody>
        <Row className="align-items-center">
          <Col>
            <p className="text-dark mb-0 fw-semibold fs-14">New Customers</p>
            <h2 className="mt-0 mb-0 fw-bold">{newThisWeek.toLocaleString()}</h2>
          </Col>
          <Col xs={'auto'} className="align-self-center">
            <div className="img-group d-flex">
              {latest.map((customer) => (
                <Link className="user-avatar position-relative d-inline-block ms-n2" href={`/customers/${customer.id}`} key={customer.id} title={customer.fullName ?? customer.email}>
                  <UserAvatar
                    photoUrl={customer.avatarUrl}
                    avatarKey={customer.avatarKey}
                    name={customer.fullName ?? customer.email}
                    className="thumb-md shadow-sm"
                  />
                </Link>
              ))}
              {others > 0 && (
                <Link href="/customers" className="user-avatar position-relative d-inline-block ms-1">
                  <span className="thumb-md shadow-sm justify-content-center d-flex align-items-center bg-info-subtle rounded-circle fw-semibold fs-6">
                    +{others}
                  </span>
                </Link>
              )}
            </div>
            <small className="text-muted ms-0">Latest Sign-ups</small>
          </Col>
        </Row>
        <ReactApexChart height={230} options={chartOptions} series={chartOptions.series} type="bar" className="mb-2" />
        <Link href="/customers" className="btn btn-primary w-100 btn-lg fs-14 flex-centered gap-1">
          View Customers <IconifyIcon icon="fa6-solid:arrow-right-long" className="" />
        </Link>
      </CardBody>
    </Card>
  )
}

export default NewVisitors
