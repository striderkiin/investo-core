import type { StaticImageData } from 'next/image'

export type StatType = {
  title: string
  subTitle: string
  icon: string
  stat: string
  change: string
  variant: string
}

export type BrowserAndTrafficType = {
  browserLogo: StaticImageData
  name: string
  sessions: {
    amount: number
    percentage: number
  }
  transactions: {
    amount: number
    percentage: number
  }
  bounceRate: number
}

export type VisitType = {
  name: string
  sessions: {
    amount: number
    percentage: number
  }
  period: {
    amount: number
    percentage: number
  }
  change: number
  changeVariant: 'success' | 'danger'
}
