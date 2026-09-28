import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { permissionLabel, roleLabel } from '@/investo/roles'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { ROLE_PERMISSIONS } from '../../../../../../../src/types/roles'
import { useAuth } from '../../../../../../../src/hooks/useAuth'

const PersonalInformation = ({ onEdit }: { onEdit: () => void }) => {
  const { profile } = useAuth()
  if (!profile) return null
  const permissions = ROLE_PERMISSIONS[profile.role] ?? []

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Account Details</CardTitle>
          </Col>
          <Col xs="auto">
            <span role="button" onClick={onEdit} className="float-end text-muted d-inline-flex text-decoration-underline">
              <IconifyIcon icon="iconoir:edit-pencil" className="fs-18 me-1" />
              Edit
            </span>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <ul className="list-unstyled mb-3">
          <li>
            <IconifyIcon icon="la:user" className="me-2 text-secondary fs-22 align-middle" /> <b> Name </b> : {profile.fullName || 'Not set'}
          </li>
          <li className="mt-2">
            <IconifyIcon icon="la:briefcase" className="me-2 text-secondary fs-22 align-middle" /> <b> Role </b> : {roleLabel(profile.role)}
          </li>
          <li className="mt-2">
            <IconifyIcon icon="la:envelope" className="text-secondary fs-22 align-middle me-2" /> <b> Email </b> : {profile.email}
          </li>
          <li className="mt-2">
            <IconifyIcon icon="la:calendar" className="text-secondary fs-22 align-middle me-2" /> <b> Member Since </b> :{' '}
            {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </li>
        </ul>
        <p className="text-muted fw-medium mb-2">What you can do</p>
        <div>
          {permissions.map((permission) => (
            <span key={permission} className="badge bg-transparent border border-light text-gray-700 fs-12 fw-medium mb-1 me-1">
              {permissionLabel(permission)}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export default PersonalInformation
