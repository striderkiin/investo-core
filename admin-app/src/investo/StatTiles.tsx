import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

export type StatTile = { title: string; stat: string; subText?: string; icon: string; variant: string }

// The customer profile's stat card, as a row of tiles for summary pages.
const StatTiles = ({ tiles }: { tiles: StatTile[] }) => (
  <Row>
    {tiles.map(({ title, stat, subText, icon, variant }) => (
      <Col md={6} lg={12 / Math.min(tiles.length, 4)} key={title}>
        <Card>
          <CardBody>
            <div className="d-flex align-items-center">
              <IconifyIcon icon={icon} className={`fs-24 align-self-center text-${variant} me-2`} />
              <div className="flex-grow-1 text-truncate">
                <p className="text-dark mb-0 fw-semibold fs-13">{title}</p>
                <h3 className="mt-1 mb-0 fs-18 fw-bold">
                  {stat} {subText && <span className="fs-11 text-muted fw-normal">{subText}</span>}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>
    ))}
  </Row>
)

export default StatTiles
