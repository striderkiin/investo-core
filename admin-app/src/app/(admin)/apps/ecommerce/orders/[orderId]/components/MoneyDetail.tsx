'use client'
import { useCallback, useEffect, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import NotFound from '@/app/not-found'
import { getMoney, MONEY, type MoneyKind, type MoneyRecord } from '@/investo/money'
import OrderItems from './OrderItems'
import OrderSummary from './OrderSummary'
import DeliveryDetail from './DeliveryDetail'
import OrderInformation from './OrderInformation'

const MoneyDetail = ({ kind, id }: { kind: MoneyKind; id: string }) => {
  const [order, setOrder] = useState<MoneyRecord | null | undefined>(undefined)

  const load = useCallback(() => {
    getMoney(kind, id)
      .then(setOrder)
      .catch(() => setOrder(null))
  }, [kind, id])

  useEffect(() => {
    setOrder(undefined)
    load()
  }, [load])

  useEffect(() => {
    if (order) document.title = `${MONEY[kind].singular} #${order.id.slice(0, 8).toUpperCase()} | Investo Admin`
  }, [order, kind])

  if (order === undefined) return <FallbackLoading />
  if (order === null) return <NotFound />

  return (
    <Row>
      <Col lg={8}>
        <OrderItems order={order} />
        <DeliveryDetail order={order} />
      </Col>
      <Col lg={4}>
        <OrderSummary order={order} />
        <OrderInformation key={order.status} order={order} onChanged={load} />
      </Col>
    </Row>
  )
}

export default MoneyDetail
