import type { DropResult } from '@hello-pangea/dnd'
import type { BaseSyntheticEvent } from 'react'
import type { Control } from 'react-hook-form'

import type { BootstrapVariantType } from './component-props'
import type { IdType, KanbanSectionType, KanbanTaskType, UserType } from './data'

export type DialogControlType = {
  open: boolean
  toggle: () => void
}

export type ThemeType = 'light' | 'dark'

export type MenuType = {
  theme: ThemeType
  size: 'default' | 'collapsed'
}

export type LayoutState = {
  theme: ThemeType
  menu: MenuType
}

export type LayoutType = LayoutState & {
  themeMode: ThemeType
  changeTheme: (theme: ThemeType) => void
  changeMenu: {
    theme: (theme: MenuType['theme']) => void
    size: (size: MenuType['size']) => void
  }
}

export type KanbanDialogControlType = {
  open: boolean
  toggle: (id?: IdType) => void
}

export type KanbanDialogType = {
  showNewTaskModal: boolean
  showSectionModal: boolean
}

export type FormControlSubmitType = {
  control: Control<any>
  newRecord: (values: BaseSyntheticEvent) => void
  editRecord: (values: BaseSyntheticEvent) => void
  deleteRecord: (id: string) => void
}

export type KanbanType = {
  sections: KanbanSectionType[]
  activeSectionId: KanbanSectionType['id'] | undefined
  newTaskModal: {
    open: boolean
    toggle: (sectionId?: KanbanSectionType['id'], taskId?: KanbanTaskType['id']) => void
  }
  sectionModal: {
    open: boolean
    toggle: (sectionId?: KanbanSectionType['id']) => void
  }
  taskFormData: KanbanTaskType | undefined
  sectionFormData: KanbanSectionType | undefined
  taskForm: FormControlSubmitType
  sectionForm: FormControlSubmitType
  getAllTasksPerSection: (sectionId: KanbanSectionType['id']) => KanbanTaskType[]
  onDragEnd: (result: DropResult) => void
}

export type ShowNotificationType = {
  title?: string
  message: string
  variant?: BootstrapVariantType
  delay?: number
}

export type ToastrProps = {
  show: boolean
  onClose?: () => void
} & ShowNotificationType

export type NotificationContextType = {
  showNotification: ({ title, message, variant }: ShowNotificationType) => void
}

export type ChatContextType = {
  activeChat?: UserType
  changeActiveChat: (userId: UserType['id']) => Promise<void>
}
