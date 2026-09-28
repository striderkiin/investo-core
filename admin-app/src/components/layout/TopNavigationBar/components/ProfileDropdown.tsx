import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import UserAvatar from '@/investo/UserAvatar'
import { roleLabel } from '@/investo/roles'
import { useAuth } from '../../../../../../src/hooks/useAuth'

const ProfileDropdown = () => {
  const { profile, logout } = useAuth()
  const { replace } = useRouter()

  const signOut = async () => {
    await logout()
    replace('/auth/login')
  }

  return (
    <Dropdown className="topbar-item">
      <DropdownToggle className="nav-link arrow-none nav-icon" role="button" aria-haspopup="false" aria-expanded="false">
        <UserAvatar photoUrl={profile?.avatarUrl} avatarKey={profile?.avatarKey} name={profile?.fullName} className="thumb-lg" />
      </DropdownToggle>
      <DropdownMenu align={'end'} className="py-0">
        <div className="d-flex align-items-center dropdown-item py-2 bg-secondary-subtle">
          <div className="flex-shrink-0">
            <UserAvatar photoUrl={profile?.avatarUrl} avatarKey={profile?.avatarKey} name={profile?.fullName} className="thumb-md" />
          </div>
          <div className="flex-grow-1 ms-2 text-truncate align-self-center">
            <h6 className="my-0 fw-medium text-dark fs-13">{profile?.fullName || profile?.email}</h6>
            <small className="text-muted mb-0">{profile ? roleLabel(profile.role) : ''}</small>
          </div>
        </div>
        <DropdownDivider className="mt-0" />
        <small className="text-muted px-2 pb-1 d-block">Account</small>
        <DropdownItem as={Link} href="/profile">
          <IconifyIcon icon="la:user" className="fs-18 me-1 align-text-bottom" /> Profile
        </DropdownItem>
        <DropdownItem as={Link} href="/profile?tab=security">
          <IconifyIcon icon="la:lock" className="fs-18 me-1 align-text-bottom" /> Security
        </DropdownItem>
        <DropdownDivider className="mb-0" />
        <DropdownItem as="button" className="text-danger" onClick={() => void signOut()}>
          <IconifyIcon icon="la:power-off" className="fs-18 me-1 align-text-bottom" /> Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ProfileDropdown
