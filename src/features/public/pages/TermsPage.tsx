import { LegalPage } from './LegalPage';
import { useBranding } from '../../../hooks/useBranding';

export function TermsPage() {
  const { branding } = useBranding();

  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of {branding.siteName} (the
        &quot;Platform&quot;), including the client dashboard, investment plans, deposit and withdrawal services,
        and any related tools. By creating an account or otherwise using the Platform, you agree to be bound by
        these Terms.
      </p>

      <h2 className="h5 mt-4 mb-2">1. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally capable of entering into binding contracts to use the
        Platform. You are responsible for ensuring that your use of the Platform complies with the laws of your
        jurisdiction, including any restrictions on cryptocurrency or investment activity.
      </p>

      <h2 className="h5 mt-4 mb-2">2. Account Registration &amp; Security</h2>
      <p>
        You must provide accurate registration information and keep your account credentials confidential. You are
        responsible for all activity that occurs under your account. Notify us immediately of any unauthorized
        access. We recommend enabling two-factor authentication in your account&apos;s Security settings.
      </p>

      <h2 className="h5 mt-4 mb-2">3. Deposits &amp; Investment Plans</h2>
      <p>
        Investment plans displayed on the Platform (including minimum/maximum amounts, rates, and durations) are
        configured by the platform operator and may change at any time for future investments. Funds allocated to
        an active investment are subject to the terms of that plan as displayed at the time of investment. Deposits
        are only credited to your account after confirmation by our backend systems. The Platform will never mark
        a deposit as complete based solely on client-side confirmation.
      </p>

      <h2 className="h5 mt-4 mb-2">4. Withdrawals</h2>
      <p>
        Withdrawal requests are subject to review, applicable minimums, maximums, daily limits, and processing
        fees as configured by the platform operator and displayed in your dashboard at the time of your request. We
        reserve the right to request additional verification before processing a withdrawal, and to delay or
        decline a withdrawal that we reasonably believe to be fraudulent, in error, or in violation of these Terms.
      </p>

      <h2 className="h5 mt-4 mb-2">5. Fees</h2>
      <p>
        Applicable deposit fees, withdrawal fees, and any other charges are disclosed in your dashboard before you
        confirm a transaction. Fees may be updated by the platform operator; changes apply to transactions made
        after the change takes effect.
      </p>

      <h2 className="h5 mt-4 mb-2">6. Prohibited Activities</h2>
      <p>
        You may not use the Platform for money laundering, fraud, or any unlawful purpose; attempt to circumvent
        account status restrictions (including suspension, restriction, or withdrawal freezes); interfere with the
        Platform&apos;s operation or security; or misrepresent your identity or eligibility.
      </p>

      <h2 className="h5 mt-4 mb-2">7. Risk Acknowledgment</h2>
      <p>
        Investing involves risk, including the possible loss of principal. Please review our{' '}
        <a href="/risk-disclosure">Risk Disclosure</a> before making any investment decision.
      </p>

      <h2 className="h5 mt-4 mb-2">8. Account Status &amp; Termination</h2>
      <p>
        We may restrict, suspend, or freeze withdrawals on an account that violates these Terms, is subject to a
        compliance review, or presents a security concern, consistent with the account status rules described in
        your dashboard. You may close your account at any time by contacting support, subject to settlement of any
        open investments or pending transactions.
      </p>

      <h2 className="h5 mt-4 mb-2">9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, {branding.siteName} and its operator are not liable for indirect,
        incidental, or consequential damages arising from your use of the Platform, including losses resulting from
        market conditions, third-party payment or network providers, or events outside our reasonable control.
      </p>

      <h2 className="h5 mt-4 mb-2">10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Platform after a change takes effect
        constitutes acceptance of the revised Terms. Material changes will be communicated through the Platform
        where practical.
      </p>

      <h2 className="h5 mt-4 mb-2">11. Governing Law</h2>
      <p>
        The specific governing law and dispute-resolution process applicable to your account will be provided by
        the platform operator based on their jurisdiction and regulatory obligations.
      </p>

      <h2 className="h5 mt-4 mb-2">12. Contact</h2>
      <p>
        Questions about these Terms can be sent through our <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
