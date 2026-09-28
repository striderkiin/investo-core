import { lazy, Suspense, type ComponentType } from 'react'

type Loader<P> = () => Promise<ComponentType<P> | { default: ComponentType<P> }>

// next/dynamic accepts a loader resolving to either a module or the component
// itself (`import(...).then((mod) => mod.X)`), so both shapes are unwrapped.
const dynamic = <P extends object>(loader: Loader<P>, _options?: { ssr?: boolean; loading?: () => unknown }) => {
  const LazyComponent = lazy(async () => {
    const resolved = await loader()
    const component = typeof resolved === 'object' && resolved !== null && 'default' in resolved ? resolved.default : resolved
    return { default: component as ComponentType<P> }
  })

  const DynamicComponent = (props: P) => (
    <Suspense fallback={null}>
      <LazyComponent {...props} />
    </Suspense>
  )
  return DynamicComponent
}

export default dynamic
