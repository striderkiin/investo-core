import type { StaticImageData } from 'next/image'

export type IdType = string

export type FileType = Partial<File> & {
  preview?: StaticImageData
}

export type NotificationType = {
  title: string
  description: string
  icon: string
  type: 'project' | 'team'
  createdAt: Date
}

export type ProductType = {
  id: IdType
  name: string
  description: string
  image: StaticImageData
  category: string
  pics: number
  price: number
  sellPrice: number
  sellsCount: number
  status: 'In Stock' | 'Out of Stock' | 'Published' | 'Inactive'
  createdAt: Date
  paymentType: 'UPI' | 'Banking' | 'Paypal' | 'BTC'
}

export type OrderType = {
  id: IdType
  productId: ProductType['id']
  product?: ProductType
  quantity: number
  total: number
}

export type CustomerType = {
  id: IdType
  name: string
  avatar: StaticImageData
  email: string
  order: number
  spend: number
  city: string
  startDate: Date
  completion: number
  status: 'Repeat' | 'Inactive' | 'New'
}

export type TopCountryType = {
  countryFlag: StaticImageData
  name: string
  count: string
  change: number
}

export type UserType = {
  id: IdType
  name: string
  avatar: StaticImageData
  handle: string
  email: string
  phoneNo: string
  role: string
  lastActivity: Date
  activityStatus: 'typing' | 'online' | 'offline'
  lastMessage: string
  unreadCount?: number
  status: 'Active' | 'Inactive'
  source: string
}

export type ClientType = {
  id: IdType
  userId: UserType['id']
  user?: UserType
  flag: StaticImageData
  project: string
  description: string
}

export type TeamType = {
  id: IdType
  userId: UserType['id']
  teamName: string
  user?: UserType
  logo: StaticImageData
  description: string
  membersId: UserType['id'][]
  members?: (UserType | undefined)[]
  progress: number
}

export type ProjectType = {
  id: IdType
  teamId: TeamType['id']
  teams?: TeamType
  logo: StaticImageData
  name: string
  client: string
  budget: string
  startDate: Date
  deadlineDate: Date
  description: string
  progress: number
  tasks: number
  status: 'In Progress' | 'Completed'
}

export type PriorityType = 'Low' | 'Medium' | 'High'

export type TaskType = {
  id: IdType
  projectId: ProjectType['id']
  projects?: ProjectType
  userId: UserType['id']
  allUsers?: UserType
  teamName: string
  taskName: string
  priority: PriorityType
  taskInfo: string
  report: number
  assignedTo: string
}

export type KanbanSectionType = {
  id: IdType
  title: string
}

export type KanbanTaskTag = 'API' | 'Form Submit' | 'Responsive'

export type KanbanTaskType = {
  id: IdType
  sectionId: KanbanSectionType['id']
  section?: KanbanSectionType
  title: string
  description?: string
  image?: StaticImageData
  priority: PriorityType
  tags?: KanbanTaskTag[]
  totalTasks: number
  completedTasks: number
  commentsCount: number
}

export type ChatMessageType = {
  id: IdType
  from: UserType
  to: UserType
  message: string
  sentOn: Date
}

export type FolderType = {
  title: string
  image: StaticImageData
  files: number
  storage: string
  progress: number
}

export type PricingType = {
  name: string
  description: string
  price: number
  features: string[]
  icon: string
  isPopular?: boolean
  iconVariant: string
}
