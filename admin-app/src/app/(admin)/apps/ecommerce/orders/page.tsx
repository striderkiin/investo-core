'use client'
import type { Metadata } from 'next'
import MoneyList from './components/MoneyList'

export const metadata: Metadata = { title: 'Deposits' }

const Orders = () => <MoneyList kind="deposit" />

export default Orders
