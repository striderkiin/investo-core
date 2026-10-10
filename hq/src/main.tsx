import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Layout from './Layout';
import Buyers from './pages/Buyers';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/Login';
import Settings from './pages/Settings';
import SiteDetail from './pages/SiteDetail';
import Sites from './pages/Sites';

import '@admin/assets/scss/app.scss';
import '@admin/assets/scss/icons.scss';
import './hq.scss';

// Every page except sign-in needs a fully signed-in owner (password and 2FA).
const RequireOwner = ({ children }: { children: ReactNode }) => {
  const { access } = useAuth();
  if (access === 'loading') return null;
  if (access !== 'ok') return <Navigate to="/login" replace />;
  return children;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireOwner>
                <Layout />
              </RequireOwner>
            }>
            <Route index element={<Dashboard />} />
            <Route path="buyers" element={<Buyers />} />
            <Route path="sites" element={<Sites />} />
            <Route path="sites/:id" element={<SiteDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
