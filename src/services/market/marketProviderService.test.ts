import { describe, expect, it, vi } from 'vitest';
import { createMarketProviderService } from './marketProviderService';

function providerStateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'state-1',
    asset_id: 'asset-btc',
    provider_price: 66980,
    manual_offset: 265,
    effective_price: 67245,
    manual_increase_enabled: true,
    manual_decrease_enabled: true,
    direct_value_entry_enabled: true,
    percentage_adjustment_enabled: true,
    automatic_behavior: 'stable',
    min_movement: 5,
    max_movement: 40,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('marketProviderService', () => {
  it('applyFixedAdjustment calls the RPC with the right asset/direction/amount and maps the row back', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: providerStateRow(), error: null });
    const service = createMarketProviderService({ rpc } as never);

    const result = await service.applyFixedAdjustment('asset-btc', 'increase', 500);

    expect(rpc).toHaveBeenCalledWith('market_apply_fixed_adjustment', { p_asset_id: 'asset-btc', p_direction: 'increase', p_amount: 500 });
    expect(result.effectivePrice).toBe(67245);
    expect(result.manualOffset).toBe(265);
  });

  it('setCapabilityToggle translates the camelCase key to its snake_case column name', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: providerStateRow({ direct_value_entry_enabled: false }), error: null });
    const service = createMarketProviderService({ rpc } as never);

    await service.setCapabilityToggle('asset-btc', 'directValueEntryEnabled', false);

    expect(rpc).toHaveBeenCalledWith('market_set_capability_toggle', {
      p_asset_id: 'asset-btc',
      p_key: 'direct_value_entry_enabled',
      p_enabled: false,
    });
  });

  it('propagates RPC errors (e.g. a disabled capability) instead of swallowing them', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('manual increase is disabled for this asset') });
    const service = createMarketProviderService({ rpc } as never);

    await expect(service.applyFixedAdjustment('asset-btc', 'increase', 500)).rejects.toThrow('manual increase is disabled for this asset');
  });
});
