import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import OrdersTable from './components/OrdersTable'
import type { Metadata } from 'next'
import { getAllProducts } from '@/helpers/data'

export const metadata: Metadata = { title: 'Orders' }

const Orders = async () => {
  const orders = await getAllProducts()
  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <Row className="align-items-center">
              <Col>
                <CardTitle as="h4">Orders</CardTitle>
              </Col>
              <Col xs="auto">
                <button className="btn btn-primary">
                  <IconifyIcon icon="fa6-solid:plus" className="me-1" /> Add Order
                </button>
              </Col>
            </Row>
          </CardHeader>
          <CardBody className="pt-0">
            <OrdersTable orders={orders} />
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default Orders
