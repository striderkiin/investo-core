'use client'
import type { Metadata } from 'next'
import MoneyDetail from '../../orders/[orderId]/components/MoneyDetail'

export const metadata: Metadata = { title: 'Withdrawal' }

type Params = {
  params: {
    withdrawalId: string
  }
}

const WithdrawalDetails = ({ params }: Params) => <MoneyDetail kind="withdrawal" id={params.withdrawalId} />

export default WithdrawalDetails
