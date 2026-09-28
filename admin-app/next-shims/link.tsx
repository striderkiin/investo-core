import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, string> }
  children?: ReactNode
  replace?: boolean
  scroll?: boolean
  prefetch?: boolean
}

const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)

const Link = ({ href, replace, scroll: _scroll, prefetch: _prefetch, children, ...rest }: LinkProps) => {
  const url =
    typeof href === 'string'
      ? href
      : `${href.pathname ?? ''}${href.query ? `?${new URLSearchParams(href.query).toString()}` : ''}`

  if (isExternal(url)) {
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <RouterLink to={url} replace={replace} {...rest}>
      {children}
    </RouterLink>
  )
}

export default Link
