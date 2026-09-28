'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useState, type FormEvent } from 'react'
import ThemeModeToggle from './components/ThemeModeToggle'
import Notifications from './components/Notifications'
import ProfileDropdown from './components/ProfileDropdown'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import clsx from 'clsx'
import useScrollEvent from '@/hooks/useScrollEvent'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../../src/hooks/useAuth'

const greetingFor = (hour: number) => (hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening')

const TopNavigationBar = () => {
  const { scrollY } = useScrollEvent()
  const { profile } = useAuth()
  const { push } = useRouter()
  const [search, setSearch] = useState('')
  const firstName = profile?.fullName?.trim().split(/\s+/)[0]

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = search.trim()
    push(query ? `/customers?q=${encodeURIComponent(query)}` : '/customers')
  }

  return (
    <div className="topbar d-print-none">
      <div className="container-xxl">
        <nav className={clsx('topbar-custom d-flex justify-content-between', { 'nav-sticky': scrollY >= 50 })} id="topbar-custom">
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <LeftSideBarToggle />

            <li className="mx-3 welcome-text">
              <h3 className="mb-0 fw-bold text-truncate">
                {greetingFor(new Date().getHours())}
                {firstName ? `, ${firstName}!` : '!'}
              </h3>
            </li>
          </ul>
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <li className="hide-phone app-search">
              <form role="search" onSubmit={submitSearch}>
                <input
                  type="search"
                  name="search"
                  className="form-control top-search mb-0"
                  placeholder="Search customers..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button type="submit">
                  <IconifyIcon icon="iconoir:search" className="mb-1" />
                </button>
              </form>
            </li>
            <ThemeModeToggle />
            <Notifications />
            <ProfileDropdown />
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default TopNavigationBar
