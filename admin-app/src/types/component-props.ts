import type { ColumnDef, PaginationState, Table, TableOptions } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

export type ChildrenType = Readonly<{ children: ReactNode }>

export type BootstrapVariantType = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light'

export type ComponentContainerProps = {
  title: string
  children: ReactNode
}

export type ReactTableProps<RowType> = {
  options?: TableOptions<RowType>
  columns: ColumnDef<RowType>[]
  data: RowType[]
  showPagination?: boolean
  rowsPerPageList?: number[]
  pageSize?: number
  tableClass?: string
  theadClass?: string
}

export type ReactTablePaginationProps<RowType> = {
  table: Table<RowType>
  rowsPerPageList?: number[]
  currentPage: number
  totalPages: number
  pagination: PaginationState
}

export type FormInputProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  id?: string
  containerClassName?: string
  label?: string | ReactNode
  placeholder?: string
  noValidate?: boolean
  labelClassName?: string
}
