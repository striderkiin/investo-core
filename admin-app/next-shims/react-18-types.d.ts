import 'react'

// The template was written against @types/react 18, where forwardRef
// components still declared defaultProps; its SimplebarReactClient wrapper
// derives its prop type from that member.
declare module 'react' {
  interface ForwardRefExoticComponent<P> {
    defaultProps?: Partial<P>
  }
}
