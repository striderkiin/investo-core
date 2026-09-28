import { Suspense } from 'react'

import type { ChildrenType } from '@/types/component-props'
import { CardBody, Col, Row } from 'react-bootstrap'

const OtherLayout = ({ children }: ChildrenType) => {
  return (
    <div className="container-xxl">
      <Row className="vh-100 d-flex justify-content-center">
        <Col xs={12} className="align-self-center">
          <CardBody>
            <Row>
              <Suspense>{children}</Suspense>
            </Row>
          </CardBody>
        </Col>
      </Row>
    </div>
  )
}

export default OtherLayout
