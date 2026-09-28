export type Metadata = {
  title?: string | { template?: string; default?: string }
  description?: string
  [key: string]: unknown
}
