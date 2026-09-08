import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { ToastProvider } from '../components/notifications/ToastContext';
import { BrandingProvider } from '../features/branding/BrandingContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}
