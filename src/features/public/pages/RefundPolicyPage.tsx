import { LegalPage } from './LegalPage';
import { useBranding } from '../../../hooks/useBranding';

export function RefundPolicyPage() {
  const { branding } = useBranding();

  return (
    <LegalPage title="Refund Policy">
      <p>This Refund Policy explains how deposits, active investments, and fees are treated on {branding.siteName}.</p>

      <h2 className="h5 mt-4 mb-2">1. Deposits</h2>
      <p>
        Deposits are credited to your account only after confirmation by our backend systems. If a deposit was made
        in error or you believe it was processed incorrectly, contact support as soon as possible through your
        dashboard&apos;s Support Center or our <a href="/#contact">Contact page</a>. Refund eligibility depends on
        whether the funds have already been allocated to an active investment.
      </p>

      <h2 className="h5 mt-4 mb-2">2. Active Investments</h2>
      <p>
        Funds allocated to an active investment plan are subject to that plan&apos;s duration and terms as displayed
        at the time you invested. Early withdrawal from an active plan, where permitted by the platform operator, may
        be subject to a reduced return or a cancellation fee, disclosed on the investment plan details before you
        confirm.
      </p>

      <h2 className="h5 mt-4 mb-2">3. Fees</h2>
      <p>
        Deposit and withdrawal fees disclosed at the time of a transaction are non-refundable once the transaction
        has completed, except where required by law or where the fee was charged in error.
      </p>

      <h2 className="h5 mt-4 mb-2">4. Withdrawal Reversals</h2>
      <p>
        A withdrawal that is rejected or cancelled before processing completes is returned to your available
        balance. Once a withdrawal has completed and funds have left the platform, it cannot be reversed by us.
        Please review the destination details carefully before confirming a withdrawal.
      </p>

      <h2 className="h5 mt-4 mb-2">5. Account Status Restrictions</h2>
      <p>
        Refund requests on an account under review, restricted, or frozen for compliance reasons will be handled
        according to the outcome of that review, consistent with our <a href="/terms">Terms of Service</a>.
      </p>

      <h2 className="h5 mt-4 mb-2">6. How to Request a Refund</h2>
      <p>
        Contact us through our <a href="/#contact">Contact page</a>, or open a ticket from your dashboard&apos;s
        Support Center if you already have an account, with your transaction reference and a description of the
        issue.
      </p>
    </LegalPage>
  );
}
