import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocialProofFeed } from './useSocialProofFeed';

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
  const { settings, current, dismiss, click } = useSocialProofFeed();
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
    >
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="ic-social-proof-dot" aria-hidden="true" />
          <span className="small fw-semibold">Recent Activity</span>
        </div>
        {settings.showCloseButton && (
          <button
            type="button"
            className="btn btn-sm btn-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              dismiss('session');
            }}
          />
        )}
      </div>
      <div role="button" tabIndex={0} onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()} style={{ cursor: 'pointer' }}>
        <p className="mb-1 small">{current.message}</p>
        <p className="mb-0 text-secondary" style={{ fontSize: '0.75rem' }}>
          {timeAgo(current.createdAt)}
        </p>
      </div>
    </div>
  );
}
