import { useEffect, useState } from 'react'

import { brandingService } from './services'

export type AdminBranding = {
  siteName: string
  /** Full logo with dark text, for light backgrounds. */
  logoOnLight: string
  /** Full logo with white text, for dark backgrounds. */
  logoOnDark: string
  /** Square brand mark, used in the collapsed sidebar and splash screen. */
  mark: string
}

const DEFAULT_BRANDING: AdminBranding = {
  siteName: 'Investo',
  logoOnLight: '/brand/investo-logo-light.png',
  logoOnDark: '/brand/investo-logo-dark.png',
  mark: '/brand/investo-mark.png',
}

let cached: AdminBranding | null = null
let pending: Promise<AdminBranding> | null = null

const loadBranding = () => {
  pending ??= brandingService
    .get()
    .then((branding) => {
      cached = {
        siteName: branding.siteName || DEFAULT_BRANDING.siteName,
        logoOnLight: branding.logoLightUrl ?? branding.logoUrl ?? DEFAULT_BRANDING.logoOnLight,
        logoOnDark: branding.logoDarkUrl ?? branding.logoUrl ?? DEFAULT_BRANDING.logoOnDark,
        mark: branding.faviconUrl ?? DEFAULT_BRANDING.mark,
      }
      return cached
    })
    .catch(() => DEFAULT_BRANDING)
  return pending
}

// Reads the site's white-label logo and name without BrandingProvider, which
// also rewrites Bootstrap's color variables and would repaint this theme.
export const useAdminBranding = (): AdminBranding => {
  const [branding, setBranding] = useState<AdminBranding>(cached ?? DEFAULT_BRANDING)
  useEffect(() => {
    if (cached) return
    let active = true
    void loadBranding().then((result) => active && setBranding(result))
    return () => {
      active = false
    }
  }, [])
  return branding
}
