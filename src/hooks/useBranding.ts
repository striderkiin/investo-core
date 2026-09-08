import { useContext } from 'react';
import { BrandingContext } from '../features/branding/BrandingContext';

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
