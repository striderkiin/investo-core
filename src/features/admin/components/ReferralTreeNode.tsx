import { useState } from 'react';
import { createReferralService } from '../../../services/api/referralService';
import type { ReferredUserSummary } from '../../../services/api/referralService';

const referralService = createReferralService();

interface ReferralTreeNodeProps {
  user: ReferredUserSummary;
  depth: number;
}

/** One expandable node of the referral hierarchy (spec section 49). Loads its own children lazily on expand. */
export function ReferralTreeNode({ user, depth }: ReferralTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ReferredUserSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function toggle() {
    if (!expanded && children === null) {
      setIsLoading(true);
      const data = await referralService.getReferredUsers(user.id);
      setChildren(data);
      setIsLoading(false);
    }
    setExpanded((current) => !current);
  }

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 my-1" onClick={toggle}>
        <i className={`bi ${expanded ? 'bi-dash-square' : 'bi-plus-square'}`} aria-hidden="true" />
        <i className="bi bi-person-circle" aria-hidden="true" />
        <span>{user.fullName || user.email}</span>
        <span className="text-secondary small">invested ${user.investedBalance.toLocaleString()}</span>
      </button>
      {isLoading && <p className="text-secondary small" style={{ marginLeft: 24 }}>Loading…</p>}
      {expanded && children && children.length === 0 && (
        <p className="text-secondary small" style={{ marginLeft: 24 }}>
          No referrals.
        </p>
      )}
      {expanded && children && children.map((child) => <ReferralTreeNode key={child.id} user={child} depth={depth + 1} />)}
    </div>
  );
}
