import { currentYear } from '@/context/constants'
import { useAdminBranding } from '@/investo/useAdminBranding'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

const Footer = () => {
  const { siteName } = useAdminBranding()
  return (
    <footer className="footer text-center text-sm-start d-print-none">
      <div className="container-xxl">
        <Row>
          <Col xs={12}>
            <Card className="mb-0 rounded-bottom-0">
              <CardBody>
                <p className="text-muted mb-0">
                  © {currentYear} {siteName}
                  <span className="text-muted d-none d-sm-inline-block float-end">Admin Panel</span>
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </footer>
  )
}

export default Footer
