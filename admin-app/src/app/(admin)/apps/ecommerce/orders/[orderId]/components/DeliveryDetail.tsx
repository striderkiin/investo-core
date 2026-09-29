import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap'
import { formatDateTime } from '@/investo/format'
import { defaultConfirmations, type MoneyRecord } from '@/investo/money'

type Step = { title: string; detail: string; icon: string }

// Where a deposit or withdrawal is on its way from request to done.
const progress = (order: MoneyRecord): { steps: [Step, Step, Step]; reached: 0 | 1 | 2; failed: boolean; heading: string } => {
  const failed = ['rejected', 'failed'].includes(order.status)
  const done = order.status === 'completed'
  const when = (iso: string | null) => (iso ? formatDateTime(iso) : '')
  if (order.kind === 'deposit') {
    const required = order.requiredConfirmations ?? defaultConfirmations(order.network)
    const seen = done ? Math.max(order.confirmations, required) : order.confirmations
    return {
      steps: [
        { title: 'Deposit created', detail: when(order.createdAt), icon: 'iconoir:page-plus' },
        { title: 'Blockchain confirmations', detail: `${Math.min(seen, required)} of ${required}`, icon: 'iconoir:link' },
        { title: failed ? 'Not credited' : 'Credited to balance', detail: done || failed ? when(order.reviewedAt ?? order.updatedAt) : 'Waiting', icon: failed ? 'iconoir:xmark-circle' : 'iconoir:wallet' },
      ],
      reached: done ? 2 : order.confirmations > 0 || order.status === 'processing' ? 1 : 0,
      failed,
      heading: done ? 'Confirmed and credited' : failed ? `Deposit ${order.status}` : order.confirmations > 0 ? 'Confirming on the blockchain' : 'Waiting for payment',
    }
  }
  const approved = ['processing', 'completed'].includes(order.status)
  return {
    steps: [
      { title: 'Withdrawal requested', detail: when(order.createdAt), icon: 'iconoir:page-plus' },
      { title: order.status === 'review' ? 'On hold for review' : 'Approved', detail: approved ? 'Ready to pay out' : 'Waiting for review', icon: 'iconoir:shield-check' },
      { title: failed ? 'Not paid' : 'Paid out', detail: done || failed ? when(order.updatedAt) : 'Waiting', icon: failed ? 'iconoir:xmark-circle' : 'iconoir:send-dollars' },
    ],
    reached: done ? 2 : approved ? 1 : 0,
    failed,
    heading: done ? 'Paid out' : failed ? `Withdrawal ${order.status}` : approved ? 'Approved, waiting to be paid' : 'Waiting for review',
  }
}

const DeliveryDetail = ({ order }: { order: MoneyRecord }) => {
  const { steps, reached, failed, heading } = progress(order)
  const dot = (idx: number) =>
    failed && idx === 2 ? 'bg-danger text-white' : idx < reached || (idx === reached && idx === 2) ? 'bg-primary text-white' : idx === reached ? 'bg-primary-subtle text-primary' : 'bg-light text-dark'

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">{heading}</CardTitle>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="position-relative m-4">
          <ProgressBar now={failed ? 100 : reached * 50} variant={failed ? 'danger' : undefined} style={{ height: 1 }} />
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className={`position-absolute top-0 translate-middle rounded-pill thumb-md d-flex align-items-center justify-content-center ${dot(idx)} ${['start-0', 'start-50', 'start-100'][idx]}`}>
              <IconifyIcon icon={step.icon} />
            </div>
          ))}
        </div>
        <Row className="row-cols-3">
          {steps.map((step, idx) => (
            <Col key={step.title} className={['text-start', 'text-center', 'text-end'][idx]}>
              <h6 className="mb-1">{step.title}</h6>
              <p className="mb-0 text-muted fs-12 fw-medium">{step.detail}</p>
            </Col>
          ))}
        </Row>
        {order.notes && (
          <div className="bg-primary-subtle p-2 border-dashed border-primary rounded mt-3">
            <span className="text-primary fw-semibold">Note :</span>
            <span className="text-primary fw-normal"> {order.notes}</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default DeliveryDetail
