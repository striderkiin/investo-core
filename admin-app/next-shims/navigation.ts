import { useLocation, useNavigate, useParams as useRouterParams, useSearchParams as useRouterSearchParams } from 'react-router-dom'

export class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND')
  }
}

export function notFound(): never {
  throw new NotFoundError()
}

export const useRouter = () => {
  const navigate = useNavigate()
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => undefined,
    prefetch: () => undefined,
  }
}

export const usePathname = () => useLocation().pathname

export const useSearchParams = () => useRouterSearchParams()[0]

export const useParams = useRouterParams
