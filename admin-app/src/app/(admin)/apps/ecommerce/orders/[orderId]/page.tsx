'use client'
import type { Metadata } from 'next'
import MoneyDetail from './components/MoneyDetail'

export const metadata: Metadata = { title: 'Deposit' }

type ParamsOrderId = {
  params: {
    orderId: string
  }
}

const OrderDetails = ({ params }: ParamsOrderId) => <MoneyDetail kind="deposit" id={params.orderId} />

export default OrderDetails
