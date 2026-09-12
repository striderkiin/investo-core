import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

import { LandingPage } from '../features/public/pages/LandingPage';
import { TermsPage } from '../features/public/pages/TermsPage';
import { PrivacyPage } from '../features/public/pages/PrivacyPage';
import { RiskDisclosurePage } from '../features/public/pages/RiskDisclosurePage';
import { RefundPolicyPage } from '../features/public/pages/RefundPolicyPage';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';

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
import { ContactMessagesPage } from '../features/admin/pages/ContactMessagesPage';
import { AnnouncementsPage } from '../features/admin/pages/AnnouncementsPage';
import { SocialProofPage } from '../features/admin/pages/SocialProofPage';
import { MaintenanceModePage } from '../features/admin/pages/MaintenanceModePage';
import { ActivitySimulationPage } from '../features/admin/pages/ActivitySimulationPage';
import { WhiteLabelPage } from '../features/admin/pages/WhiteLabelPage';
import { BrandingPage } from '../features/admin/pages/BrandingPage';
import { IntegrationsPage } from '../features/admin/pages/IntegrationsPage';
import { SandboxTestingPage } from '../features/admin/pages/SandboxTestingPage';
import { SecurityCenterPage } from '../features/admin/pages/SecurityCenterPage';
import { AdminsPage } from '../features/admin/pages/AdminsPage';
import { SystemSettingsPage } from '../features/admin/pages/SystemSettingsPage';

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
        <Route path="/404" element={<NotFoundPage />} />
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
          path="/admin/announcements"
          element={
            <ProtectedRoute requireAdmin requirePermission="announcements.manage">
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/social-proof"
          element={
            <ProtectedRoute requireAdmin requirePermission="social_proof.manage">
              <SocialProofPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <ProtectedRoute requireAdmin requirePermission="settings.manage">
              <MaintenanceModePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity"
          element={
            <ProtectedRoute requireAdmin requirePermission="settings.manage">
              <ActivitySimulationPage />
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
          path="/admin/contact-messages"
          element={
            <ProtectedRoute requireAdmin requirePermission="support.read">
              <ContactMessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/white-label"
          element={
            <ProtectedRoute requireAdmin requirePermission="white_label.manage">
              <WhiteLabelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branding"
          element={
            <ProtectedRoute requireAdmin requirePermission="branding.manage">
              <BrandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/integrations"
          element={
            <ProtectedRoute requireAdmin requirePermission="integrations.manage">
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sandbox-testing"
          element={
            <ProtectedRoute requireAdmin requirePermission="integrations.manage">
              <SandboxTestingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <ProtectedRoute requireAdmin requirePermission="security.manage">
              <SecurityCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/admins"
          element={
            <ProtectedRoute requireAdmin requirePermission="admins.manage">
              <AdminsPage />
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
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin requirePermission="settings.manage">
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
      <Route path="/unauthorized" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
