import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocialProofFeed } from './useSocialProofFeed';
import { Avatar } from '../../components/common/Avatar';

const CLICK_DESTINATION: Record<string, string> = {
  new_account: '/dashboard',
  plan_activation: '/dashboard/investments',
  milestone: '/dashboard/investments',
  deposit_confirmed: '/dashboard/transactions',
  withdrawal_completed: '/dashboard/transactions',
  referral_joined: '/dashboard/referral',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

/**
 * Renders identically for a confirmed production event and an
 * admin-enabled test-stream event — the SocialProofEvent shape carries no
 * "test" label this component could even render (spec items 21/22).
 */
export function SocialProofPopup() {
  const { settings, current, dismiss, click, pause, resume } = useSocialProofFeed();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!current);
  }, [current]);

  if (!settings?.enabled || !current) return null;

  const side = settings.popupPosition === 'bottom-right' ? 'ic-social-proof-right' : 'ic-social-proof-left';

  function handleClick() {
    click();
    const destination = CLICK_DESTINATION[current!.eventType] ?? '/dashboard';
    navigate(destination);
    dismiss('session');
  }

  return (
    <div
      className={`ic-social-proof-popup ${side} ${visible ? 'ic-social-proof-enter' : 'ic-social-proof-exit'}`}
      role="status"
      aria-live="polite"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {settings.showCloseButton && (
        <button
          type="button"
          className="btn btn-sm btn-close"
          aria-label="Close"
          style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}
          onClick={(e) => {
            e.stopPropagation();
            dismiss('session');
          }}
        />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}
      >
        <Avatar photoUrl={current.avatarUrl} avatarKey={current.avatarKey} displayName={current.displayName} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="mb-1 small fw-bold" style={{ lineHeight: 1.35 }}>
            {current.message}
          </p>
          <p className="mb-0" style={{ fontSize: '0.7rem', color: 'rgba(26,23,16,0.45)' }}>
            {timeAgo(current.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
