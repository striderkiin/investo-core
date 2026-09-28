import type { StaticImageData } from 'next/image'

export type StatType = {
  title: string
  state: number
  icon: string
  total: number
  subTitle: string
  subIcon: string
  variant: string
}

export type CommentType = {
  avatar: StaticImageData
  name: string
  time: Date
  message: string
  replies?: CommentType[]
}
