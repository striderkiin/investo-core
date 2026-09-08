import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketControlsPage } from './MarketControlsPage';
import { AuthContext } from '../../auth/AuthContext';
import type { AuthContextValue } from '../../auth/AuthContext';
import { ToastProvider } from '../../../components/notifications/ToastContext';
import { createDefaultMarketSettings } from '../../market/marketEngine';
import type { Profile } from '../../../types/database';

const increaseMarketValue = vi.fn().mockResolvedValue(createDefaultMarketSettings());
const decreaseMarketValue = vi.fn().mockResolvedValue(createDefaultMarketSettings());
const listPresets = vi.fn().mockResolvedValue([]);
const getCurrent = vi.fn();

vi.mock('../../market/useMarketData', () => ({
  useMarketData: () => ({
    settings: {
      ...createDefaultMarketSettings(),
      mode: 'manual',
      manualControlEnabled: true,
      marketValueControlEnabled: true,
      currentMarketValue: 42580,
      marketValueStep: 100,
    },
    history: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    marketService: {
      increaseMarketValue,
      decreaseMarketValue,
      listPresets,
      getCurrent,
    },
  }),
}));

const adminProfile: Profile = {
  id: 'admin-1',
  email: 'admin@investo.test',
  fullName: 'Test Admin',
  avatarUrl: null,
  role: 'super_admin',
  accountStatus: 'active',
  totalBalance: 0,
  availableBalance: 0,
  bonusBalance: 0,
  investedBalance: 0,
  referralCode: 'TESTCODE',
  referredBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderWithAuth() {
  const authValue = {
    session: {} as never,
    profile: adminProfile,
    isLoading: false,
    isConfigured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  } satisfies AuthContextValue;

  return render(
    <ToastProvider>
      <AuthContext.Provider value={authValue}>
        <MarketControlsPage />
      </AuthContext.Provider>
    </ToastProvider>
  );
}

describe('MarketControlsPage manual value controls (real DOM interaction)', () => {
  beforeEach(() => {
    increaseMarketValue.mockClear();
    decreaseMarketValue.mockClear();
  });

  it('tapping the ▲ increase button for Market Value calls marketService.increaseMarketValue as the current admin', async () => {
    renderWithAuth();

    const increaseButton = await screen.findByRole('button', { name: /increase current market value/i });
    expect(increaseButton).not.toBeDisabled();

    fireEvent.click(increaseButton);

    await waitFor(() => expect(increaseMarketValue).toHaveBeenCalledWith('admin-1'));
  });

  it('tapping the ▼ decrease button calls marketService.decreaseMarketValue', async () => {
    renderWithAuth();

    const decreaseButton = await screen.findByRole('button', { name: /decrease current market value/i });
    fireEvent.click(decreaseButton);

    await waitFor(() => expect(decreaseMarketValue).toHaveBeenCalledWith('admin-1'));
  });

  it('renders the master Manual Live Chart Control as ON and the current value from settings', async () => {
    renderWithAuth();

    expect(await screen.findByText('Manual Control Active')).toBeInTheDocument();
    expect(screen.getByText('$42,580.00')).toBeInTheDocument();
  });
});
