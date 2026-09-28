import { getCustomersById } from '@/helpers/data'
import { notFound } from 'next/navigation'
import { Col, Row } from 'react-bootstrap'
import CustomerCard from './components/CustomerCard'
import Orders from './components/Orders'
import Stats from './components/Stats'
import type { Metadata } from 'next'

type ParamsCustomerId = {
  params: {
    customerId: string
  }
}

export const generateMetadata = async ({ params }: ParamsCustomerId): Promise<Metadata> => {
  const order = await getCustomersById(params.customerId)
  return { title: order?.id ?? 'Customer Details' }
}

const CustomerDetails = async ({ params }: ParamsCustomerId) => {
  const customer = await getCustomersById(params.customerId)
  if (!customer) notFound()
  return (
    <>
      <Row>
        <Col md={12} lg={5}>
          <CustomerCard customer={customer} />
        </Col>
        <Col md={12} lg={7}>
          <Stats />
        </Col>
      </Row>
      <Row>
        <Col lg={12}>
          <Orders />
        </Col>
      </Row>
    </>
  )
}

export default CustomerDetails
