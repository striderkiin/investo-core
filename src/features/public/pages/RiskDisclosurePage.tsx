import { LegalPage } from './LegalPage';

export function RiskDisclosurePage() {
  return (
    <LegalPage title="Risk Disclosure">
      <p>
        Investing involves risk, including the possible loss of principal. Past performance is not indicative of
        future results. Rates displayed on investment plans are set by the platform operator and are not
        guaranteed unless explicitly stated in your jurisdiction&apos;s regulatory disclosures.
      </p>
      <p>
        Market data displayed on this platform may reflect simulated or demo values while the platform is running
        in Development, Demo, or Sandbox mode. These values do not represent real market conditions.
      </p>
      <p>This is placeholder legal copy. Replace it with your jurisdiction-specific risk disclosure before going live.</p>
    </LegalPage>
  );
}
