import { useEffect, useState } from 'react';
import { createKycService } from '../../../services/api/kycService';
import type { KycReviewAction, KycStatus, KycSubmission } from '../../../services/api/kycService';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';

const kycService = createKycService();

const STATUS_VARIANT: Record<KycStatus, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const FILTERS: { label: string; value: KycStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function AdminKycPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [filter, setFilter] = useState<KycStatus | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canReview = can('compliance.manage');

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setSubmissions(await kycService.listAll(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identity verification submissions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAction(submission: KycSubmission, action: KycReviewAction) {
    let notes: string | undefined;
    if (action === 'reject') {
      const input = window.prompt(`Reason for rejecting ${submission.legalFullName}'s submission (shown to the user):`);
      if (input === null) return;
      notes = input.trim() || undefined;
    } else if (!window.confirm(`Approve identity verification for ${submission.legalFullName}?`)) {
      return;
    }
    try {
      await kycService.review(submission.id, action, notes);
      showSuccess(`Submission ${action}d.`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update submission');
    }
  }

  async function viewDocument(path: string) {
    try {
      const url = await kycService.getSignedDocumentUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to open document');
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Identity Verification</h2>

      <div className="d-flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading submissions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : submissions.length === 0 ? (
        <EmptyState icon="bi-person-check" title="No submissions" message="Nothing to show for this filter." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Submitted</th>
                <th scope="col">Legal Name</th>
                <th scope="col">Country</th>
                <th scope="col">Documents</th>
                <th scope="col">Status</th>
                {canReview && (
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{new Date(submission.createdAt).toLocaleString()}</td>
                  <td>
                    {submission.legalFullName}
                    <div className="text-secondary small">DOB: {submission.dateOfBirth}</div>
                  </td>
                  <td>{submission.country}</td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => viewDocument(submission.idDocumentPath)}>
                        ID Document
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => viewDocument(submission.proofOfAddressPath)}>
                        Proof of Address
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge text-bg-${STATUS_VARIANT[submission.status]} text-capitalize`}>{submission.status}</span>
                    {submission.reviewNotes && <div className="text-secondary small mt-1">{submission.reviewNotes}</div>}
                  </td>
                  {canReview && (
                    <td className="text-end">
                      {submission.status === 'pending' && (
                        <div className="d-flex gap-1 justify-content-end flex-wrap">
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleAction(submission, 'approve')}>
                            Approve
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleAction(submission, 'reject')}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
