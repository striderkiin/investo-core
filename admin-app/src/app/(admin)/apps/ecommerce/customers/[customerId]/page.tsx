'use client'
import { Col, Row } from 'react-bootstrap'
import { useEffect } from 'react'
import CustomerCard from './components/CustomerCard'
import Orders from './components/Orders'
import Stats from './components/Stats'
import Projections from './components/Projections'
import FallbackLoading from '@/components/FallbackLoading'
import NotFound from '@/app/not-found'
import { useCustomer } from './useCustomer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customer' }

type ParamsCustomerId = {
  params: {
    customerId: string
  }
}

const CustomerDetails = ({ params }: ParamsCustomerId) => {
  const { detail, refresh } = useCustomer(params.customerId)
  const name = detail ? detail.profile.fullName || detail.profile.email : null

  useEffect(() => {
    if (name) document.title = `${name} | Investo Admin`
  }, [name])

  if (detail === undefined) return <FallbackLoading />
  if (detail === null) return <NotFound />

  return (
    <>
      <Row>
        <Col md={12} lg={5}>
          <CustomerCard detail={detail} onChanged={() => void refresh()} />
        </Col>
        <Col md={12} lg={7}>
          <Stats detail={detail} />
        </Col>
      </Row>
      <Row>
        <Col lg={12}>
          <Orders detail={detail} />
        </Col>
      </Row>
      <Row>
        <Col lg={12}>
          <Projections customerId={detail.profile.id} />
        </Col>
      </Row>
    </>
  )
}

export default CustomerDetails
