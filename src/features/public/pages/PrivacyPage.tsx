import { LegalPage } from './LegalPage';

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        We collect the information necessary to operate your account: your profile details, transaction history,
        support communications, and security events. Financial data is processed server-side and protected with
        role-based access control and row-level security.
      </p>
      <p>
        We do not sell your personal information. Data may be shared with payment and identity-verification
        providers strictly to process deposits, withdrawals, and compliance checks.
      </p>
      <p>This is placeholder legal copy. Replace it with your jurisdiction-specific privacy policy before going live.</p>
    </LegalPage>
  );
}
