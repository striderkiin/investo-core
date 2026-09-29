'use client'
import type { Metadata } from 'next'
import MoneyList from '../orders/components/MoneyList'

export const metadata: Metadata = { title: 'Withdrawals' }

const Withdrawals = () => <MoneyList kind="withdrawal" />

export default Withdrawals
