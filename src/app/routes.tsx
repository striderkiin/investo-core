import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';

import { LandingPage } from '../features/public/pages/LandingPage';
import { TermsPage } from '../features/public/pages/TermsPage';
import { PrivacyPage } from '../features/public/pages/PrivacyPage';
import { RiskDisclosurePage } from '../features/public/pages/RiskDisclosurePage';
import { RefundPolicyPage } from '../features/public/pages/RefundPolicyPage';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';

import { DepositPage } from '../features/financial/pages/DepositPage';
import { WithdrawPage } from '../features/financial/pages/WithdrawPage';
import { InvestmentsPage } from '../features/investments/pages/InvestmentsPage';


import { NotFoundPage } from '../features/public/pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard/deposit" element={<DepositPage />} />
        <Route path="/dashboard/withdraw" element={<WithdrawPage />} />
        <Route path="/dashboard/investments" element={<InvestmentsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
      <Route path="/unauthorized" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
