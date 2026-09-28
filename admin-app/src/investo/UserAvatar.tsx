import clsx from 'clsx'

import { resolveAvatar } from '../../../src/shared/avatar'

type UserAvatarProps = {
  photoUrl?: string | null
  avatarKey?: string | null
  name?: string | null
  /** Template size class, e.g. thumb-md, thumb-lg, thumb-xl. */
  className?: string
  style?: React.CSSProperties
}

// Same fallback chain as the client dashboard: photo, then the picked
// illustrated avatar, then the name's initial on a brand-colored circle.
const UserAvatar = ({ photoUrl, avatarKey, name, className, style }: UserAvatarProps) => {
  const avatar = resolveAvatar({ photoUrl, avatarKey, displayName: name })

  if (avatar.tier === 'photo') {
    return <img src={avatar.url} alt={name ?? 'avatar'} className={clsx('rounded-circle object-fit-cover', className)} style={style} />
  }
  if (avatar.tier === 'illustrated') {
    return <img src={avatar.entry.imageDataUri} alt={name ?? 'avatar'} className={clsx('rounded-circle object-fit-cover', className)} style={style} />
  }
  return (
    <span
      className={clsx('rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-semibold', className)}
      style={style}
      aria-label={name ?? 'avatar'}>
      {avatar.tier === 'initials' ? avatar.letter : '?'}
    </span>
  )
}

export default UserAvatar
