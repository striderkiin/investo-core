import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ClientLayout } from '../components/layout/ClientLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

import { LandingPage } from '../features/public/pages/LandingPage';
import { TermsPage } from '../features/public/pages/TermsPage';
import { PrivacyPage } from '../features/public/pages/PrivacyPage';
import { RiskDisclosurePage } from '../features/public/pages/RiskDisclosurePage';
import { ContactPage } from '../features/public/pages/ContactPage';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';

import { DashboardHomePage } from '../features/client/pages/DashboardHomePage';
import { InvestmentsPage } from '../features/client/pages/InvestmentsPage';
import { DepositPage } from '../features/client/pages/DepositPage';
import { WithdrawPage } from '../features/client/pages/WithdrawPage';
import { ClientTransactionsPage } from '../features/client/pages/ClientTransactionsPage';
import { ReferralPage } from '../features/client/pages/ReferralPage';
import { ClientNotificationsPage } from '../features/client/pages/ClientNotificationsPage';
import { SupportPage } from '../features/client/pages/SupportPage';
import { ClientSettingsPage } from '../features/client/pages/ClientSettingsPage';

import { AdminOverviewPage } from '../features/admin/pages/AdminOverviewPage';
import { FinancialCenterPage } from '../features/admin/pages/FinancialCenterPage';
import { MarketControlsPage } from '../features/admin/pages/MarketControlsPage';
import { UsersPage } from '../features/admin/pages/UsersPage';
import { AdminInvestmentsPage } from '../features/admin/pages/AdminInvestmentsPage';
import { AdminDepositsPage } from '../features/admin/pages/AdminDepositsPage';
import { AdminWithdrawalsPage } from '../features/admin/pages/AdminWithdrawalsPage';
import { AdminTransactionsPage } from '../features/admin/pages/AdminTransactionsPage';
import { TreasuryPage } from '../features/admin/pages/TreasuryPage';
import { AdminReferralsPage } from '../features/admin/pages/AdminReferralsPage';
import { AdminSupportPage } from '../features/admin/pages/AdminSupportPage';
import { AuditLogsPage } from '../features/admin/pages/AuditLogsPage';

import { NotFoundPage } from '../features/public/pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHomePage />} />
        <Route path="/dashboard/investments" element={<InvestmentsPage />} />
        <Route path="/dashboard/deposit" element={<DepositPage />} />
        <Route path="/dashboard/withdraw" element={<WithdrawPage />} />
        <Route path="/dashboard/transactions" element={<ClientTransactionsPage />} />
        <Route path="/dashboard/referral" element={<ReferralPage />} />
        <Route path="/dashboard/notifications" element={<ClientNotificationsPage />} />
        <Route path="/dashboard/support" element={<SupportPage />} />
        <Route path="/dashboard/settings" element={<ClientSettingsPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route
          path="/admin/financial"
          element={
            <ProtectedRoute requireAdmin requirePermission="treasury.read">
              <FinancialCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/market"
          element={
            <ProtectedRoute requireAdmin requirePermission="market.read">
              <MarketControlsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin requirePermission="users.read">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/investments"
          element={
            <ProtectedRoute requireAdmin requirePermission="investments.read">
              <AdminInvestmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/deposits"
          element={
            <ProtectedRoute requireAdmin requirePermission="deposits.read">
              <AdminDepositsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <ProtectedRoute requireAdmin requirePermission="withdrawals.read">
              <AdminWithdrawalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute requireAdmin requirePermission="transactions.read">
              <AdminTransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/treasury"
          element={
            <ProtectedRoute requireAdmin requirePermission="treasury.read">
              <TreasuryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <ProtectedRoute requireAdmin requirePermission="referrals.read">
              <AdminReferralsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute requireAdmin requirePermission="support.read">
              <AdminSupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requireAdmin requirePermission="audit.read">
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/unauthorized" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
