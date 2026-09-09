import { LegalPage } from './LegalPage';
import { useBranding } from '../../../hooks/useBranding';

export function RiskDisclosurePage() {
  const { branding } = useBranding();

  return (
    <LegalPage title="Risk Disclosure">
      <div className="ic-public-notice small p-3 mb-4">
        <i className="bi bi-info-circle me-1" aria-hidden="true" />
        Starter risk disclosure provided as a configurable template. Have these reviewed by qualified legal counsel
        for your jurisdiction&apos;s financial regulations before launching to real users.
      </div>

      <p>
        Please read this Risk Disclosure carefully before depositing funds or activating an investment plan on{' '}
        {branding.siteName}.
      </p>

      <h2 className="h5 mt-4 mb-2">1. General Investment Risk</h2>
      <p>
        Investing involves risk, including the possible loss of some or all of your principal. Past performance of
        any investment plan is not indicative of future results. You should only invest funds you can afford to
        lose.
      </p>

      <h2 className="h5 mt-4 mb-2">2. Cryptocurrency &amp; Digital Asset Risk</h2>
      <p>
        Deposits and withdrawals on this Platform may involve cryptocurrency or other digital assets. Digital
        assets can be highly volatile, are not backed by any government, and network or provider outages, forks,
        or protocol changes can affect the value or availability of your funds.
      </p>

      <h2 className="h5 mt-4 mb-2">3. Market Volatility</h2>
      <p>
        Market conditions can change rapidly and unpredictably. Rates and values displayed on the Platform reflect
        conditions at a point in time and may not reflect the conditions at the time your transaction is processed.
      </p>

      <h2 className="h5 mt-4 mb-2">4. No Guaranteed Returns</h2>
      <p>
        Rates displayed on investment plans are set by the platform operator and are illustrative, not guaranteed,
        unless explicitly stated in your jurisdiction&apos;s regulatory disclosures. The platform operator may
        adjust rates, pause yield, or change plan availability for future investments at their discretion.
      </p>

      <h2 className="h5 mt-4 mb-2">5. Platform &amp; Technology Risk</h2>
      <p>
        Like any software platform, {branding.siteName} may be affected by outages, bugs, or security incidents
        despite reasonable safeguards (encryption, role-based access control, audit logging, and server-side
        validation of all financial actions). No system can guarantee absolute security.
      </p>

      <h2 className="h5 mt-4 mb-2">6. Liquidity Risk</h2>
      <p>
        Withdrawal requests are subject to review, processing time, and any limits or holding periods configured
        by the platform operator. Funds allocated to an active investment plan may not be available for withdrawal
        until the plan&apos;s duration completes, depending on the plan&apos;s terms.
      </p>

      <h2 className="h5 mt-4 mb-2">7. Regulatory Risk</h2>
      <p>
        Laws and regulations governing digital assets and investment platforms vary by jurisdiction and are
        evolving. Changes in law could affect your ability to use the Platform or access your funds.
      </p>

      <h2 className="h5 mt-4 mb-2">8. Simulated &amp; Demo Data Notice</h2>
      <p>
        Market data, activity notifications, and account balances displayed while the Platform is running in
        Development, Demo, or Sandbox mode may be simulated for testing and demonstration purposes and do not
        represent real market conditions or real funds. The active environment is indicated in the admin panel.
      </p>

      <h2 className="h5 mt-4 mb-2">9. No Investment Advice</h2>
      <p>
        Nothing on this Platform constitutes financial, investment, tax, or legal advice. You are solely
        responsible for evaluating whether an investment plan is suitable for your circumstances, and you should
        consult an independent professional advisor if you are unsure.
      </p>

      <h2 className="h5 mt-4 mb-2">10. Acknowledgment</h2>
      <p>By creating an account and using the Platform, you acknowledge that you have read and understood this Risk Disclosure.</p>
    </LegalPage>
  );
}
