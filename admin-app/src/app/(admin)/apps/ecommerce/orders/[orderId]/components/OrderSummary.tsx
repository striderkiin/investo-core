import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { formatMoney, statusLabel, statusVariant } from '@/investo/format'
import type { MoneyRecord } from '@/investo/money'

const OrderSummary = ({ order }: { order: MoneyRecord }) => {
  const variant = statusVariant(order.status)
  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as={'h4'}>Summary</CardTitle>
          </Col>
          <Col xs="auto">
            <span className={`badge rounded text-${variant} bg-${variant}-subtle fs-12 p-1`}>{statusLabel(order.status)}</span>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div>
          <div className="d-flex justify-content-between">
            <p className="text-body fw-semibold">Amount :</p>
            <p className="text-body-emphasis fw-semibold">{formatMoney(order.amount)}</p>
          </div>
          {order.kind === 'withdrawal' && (
            <div className="d-flex justify-content-between">
              <p className="text-body fw-semibold">Fee :</p>
              <p className="text-danger fw-semibold">-{formatMoney(order.fee)}</p>
            </div>
          )}
          <div className="d-flex justify-content-between">
            <p className="text-body fw-semibold mb-0">Coin :</p>
            <p className="text-body-emphasis fw-semibold mb-0">{order.currency}</p>
          </div>
        </div>
        <hr className="hr-dashed" />
        <div className="d-flex justify-content-between">
          <h4 className="mb-0">{order.kind === 'deposit' ? 'Credits :' : 'Customer receives :'}</h4>
          <h4 className="mb-0">{formatMoney(order.kind === 'deposit' ? order.amount : order.amount - order.fee)}</h4>
        </div>
      </CardBody>
    </Card>
  )
}

export default OrderSummary
