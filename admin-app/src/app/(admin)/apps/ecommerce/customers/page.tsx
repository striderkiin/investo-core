import IconifyIcon from '@/components/wrappers/IconifyIcon'
import clsx from 'clsx'
import type { Metadata } from 'next'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownMenu, DropdownToggle, FormCheck, Row } from 'react-bootstrap'
import CustomerTable from './components/CustomerTable'
import { getAllCustomers } from '@/helpers/data'

export const metadata: Metadata = { title: 'Customers' }

const Customers = async () => {
  const filters = ['All', 'Fashion', 'Plants', 'Toys', 'Gadgets', 'Food', 'Drinks']
  const customers = await getAllCustomers()
  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <Row className="align-items-center">
              <Col>
                <CardTitle as="h4">Customers</CardTitle>
              </Col>
              <Col xs="auto">
                <form className="row g-2">
                  <Col xs="auto">
                    <Dropdown>
                      <DropdownToggle
                        variant="link"
                        className="btn bg-primary-subtle text-primary d-flex align-items-center arrow-none"
                        role="button">
                        <IconifyIcon icon="iconoir:filter-alt" className="me-1" /> Filter
                      </DropdownToggle>
                      <DropdownMenu align="start">
                        <div className="p-2">
                          {filters.map((filter, idx) => (
                            <FormCheck
                              label={filter}
                              className={clsx({ 'mb-2': filters.length - 1 != idx })}
                              id={`filter-${idx}`}
                              key={idx}
                              defaultChecked
                            />
                          ))}
                        </div>
                      </DropdownMenu>
                    </Dropdown>
                  </Col>
                  <Col xs="auto">
                    <Button variant="primary" type="button" className="icons-center">
                      <IconifyIcon icon="fa6-solid:plus" className="me-1" /> Add Product
                    </Button>
                  </Col>
                </form>
              </Col>
            </Row>
          </CardHeader>
          <CardBody className="pt-0">
            <CustomerTable customers={customers} />
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default Customers
