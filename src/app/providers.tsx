import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '../features/auth/AuthContext';
import { ToastProvider } from '../components/notifications/ToastContext';
import { BrandingProvider } from '../features/branding/BrandingContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      {/* reducedMotion="user" makes every framer-motion animation in the
          app respect prefers-reduced-motion automatically — the CSS
          transition-duration override in public-theme.css only covers
          CSS transitions, not framer's own rAF-driven animations. */}
      <MotionConfig reducedMotion="user">
        <BrandingProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </BrandingProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
