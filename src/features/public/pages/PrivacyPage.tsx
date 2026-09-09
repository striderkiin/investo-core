import { LegalPage } from './LegalPage';
import { useBranding } from '../../../hooks/useBranding';

export function PrivacyPage() {
  const { branding } = useBranding();

  return (
    <LegalPage title="Privacy Policy">
      <div className="alert alert-secondary small mb-4">
        <i className="bi bi-info-circle me-1" aria-hidden="true" />
        Starter privacy policy provided as a configurable template. Have these reviewed by qualified legal counsel
        for your jurisdiction (e.g. GDPR, CCPA) before launching to real users.
      </div>

      <p>
        This Privacy Policy explains how {branding.siteName} collects, uses, and protects your information when
        you use our platform.
      </p>

      <h2 className="h5 mt-4 mb-2">1. Information We Collect</h2>
      <p>
        <strong>Account information</strong> — name, email address, and password (stored securely by our
        authentication provider, never in plain text). <strong>Financial information</strong> — deposit, investment,
        withdrawal, and transaction records associated with your account. <strong>Support communications</strong> —
        messages you send through our Support Center or Contact page. <strong>Security information</strong> — login
        timestamps, active sessions, and security events used to protect your account.
      </p>

      <h2 className="h5 mt-4 mb-2">2. How We Use Your Information</h2>
      <p>
        We use your information to operate your account, process deposits and withdrawals, calculate investment
        earnings, respond to support requests, detect and prevent fraud, comply with applicable financial
        regulations, and communicate important account or platform updates.
      </p>

      <h2 className="h5 mt-4 mb-2">3. How We Protect Your Information</h2>
      <p>
        Financial data is processed server-side and protected with role-based access control and row-level
        security, meaning only you (and platform staff with an explicit, audited business reason) can access your
        account&apos;s financial records. Sensitive credentials, such as third-party payment provider secrets, are
        never exposed to the browser and are stored with restricted database-level access.
      </p>

      <h2 className="h5 mt-4 mb-2">4. Data Sharing</h2>
      <p>
        We do not sell your personal information. We may share data with payment providers, identity-verification
        (KYC) providers, or regulators strictly to the extent necessary to process deposits, withdrawals,
        compliance checks, or as required by law.
      </p>

      <h2 className="h5 mt-4 mb-2">5. Data Retention</h2>
      <p>
        We retain account and transaction records for as long as your account is active and for a period afterward
        as required by applicable financial recordkeeping and anti-money-laundering regulations.
      </p>

      <h2 className="h5 mt-4 mb-2">6. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, correct, or request deletion of your
        personal information, or to object to certain processing. Contact us through our{' '}
        <a href="/contact">Contact page</a> to make a request.
      </p>

      <h2 className="h5 mt-4 mb-2">7. Cookies</h2>
      <p>
        We use essential cookies and local storage to keep you signed in and remember basic preferences. We do not
        use third-party advertising trackers.
      </p>

      <h2 className="h5 mt-4 mb-2">8. Children&apos;s Privacy</h2>
      <p>The Platform is not intended for individuals under 18 years of age, and we do not knowingly collect information from minors.</p>

      <h2 className="h5 mt-4 mb-2">9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be communicated through the Platform where practical.</p>

      <h2 className="h5 mt-4 mb-2">10. Contact</h2>
      <p>
        Questions about this Privacy Policy can be sent through our <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
