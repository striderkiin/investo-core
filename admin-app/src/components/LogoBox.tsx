import Link from 'next/link'
import Image from 'next/image'

import { useAdminBranding } from '@/investo/useAdminBranding'

// The template's logo-light / logo-dark classes pick which image shows for
// the sidebar's color scheme: logo-light sits on dark sidebars, logo-dark on
// light ones.
const LogoBox = () => {
  const { mark, logoOnLight, logoOnDark, siteName } = useAdminBranding()
  return (
    <Link href="/" className="logo">
      <span>
        <Image src={mark} alt={`${siteName} mark`} width={38} height={38} className="logo-sm" />
      </span>
      <span>
        <Image src={logoOnDark} alt={siteName} className="logo-lg logo-light" />
        <Image src={logoOnLight} alt={siteName} className="logo-lg logo-dark" />
      </span>
    </Link>
  )
}

export default LogoBox
