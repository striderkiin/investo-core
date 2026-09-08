import { describe, expect, it, vi } from 'vitest';
import { createMarketService } from './marketService';
import { createDefaultMarketSettings } from '../../features/market/marketEngine';

function buildSettingsRow(overrides: Partial<ReturnType<typeof createDefaultMarketSettings>> = {}) {
  const state = { ...createDefaultMarketSettings(), ...overrides };
  return {
    id: state.id,
    mode: state.mode,
    automatic_behavior: state.automaticBehavior,
    update_interval_ms: state.updateIntervalMs,
    min_movement: state.minMovement,
    max_movement: state.maxMovement,
    starting_value: state.startingValue,
    manual_control_enabled: state.manualControlEnabled,
    market_value_control_enabled: state.marketValueControlEnabled,
    percentage_control_enabled: state.percentageControlEnabled,
    trend_control_enabled: state.trendControlEnabled,
    volatility_control_enabled: state.volatilityControlEnabled,
    movement_control_enabled: state.movementControlEnabled,
    market_value_step: state.marketValueStep,
    percentage_step: state.percentageStep,
    current_market_value: state.currentMarketValue,
    current_percentage_change: state.currentPercentageChange,
    current_trend: state.currentTrend,
    current_volatility: state.currentVolatility,
    movement_strength: state.movementStrength,
    preview_mode: state.previewMode,
    updated_at: state.updatedAt,
  };
}

/** Builds a chainable query-builder mock whose terminal method resolves to `result`. */
function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'update', 'insert', 'eq', 'order', 'limit'];
  for (const method of methods) builder[method] = vi.fn(() => builder);
  builder.single = vi.fn().mockResolvedValue(result);
  return builder;
}

describe('marketService manual actions', () => {
  it('increaseMarketValue persists the new value, records a market_data point, and writes an audit log', async () => {
    const before = buildSettingsRow({ manualControlEnabled: true, marketValueControlEnabled: true, marketValueStep: 100, currentMarketValue: 42580 });
    const after = buildSettingsRow({ manualControlEnabled: true, marketValueControlEnabled: true, marketValueStep: 100, currentMarketValue: 42680 });

    const getChain = chain({ data: before, error: null });
    const updateChain = chain({ data: after, error: null });
    const insertCalls: { table: string; payload: unknown }[] = [];

    const from = vi.fn((table: string) => {
      if (table === 'market_settings') {
        // First call (getCurrent) selects; second call (persist) updates.
        return from.mock.calls.filter((c) => c[0] === 'market_settings').length <= 1 ? getChain : updateChain;
      }
      const insertBuilder = {
        insert: vi.fn((payload: unknown) => {
          insertCalls.push({ table, payload });
          return insertBuilder;
        }),
      };
      return insertBuilder;
    });

    const client = { from } as never;
    const marketService = createMarketService(client);

    const result = await marketService.increaseMarketValue('admin-1');

    expect(result.currentMarketValue).toBe(42680);
    expect(insertCalls.some((c) => c.table === 'market_data')).toBe(true);
    expect(insertCalls.some((c) => c.table === 'admin_audit_logs')).toBe(true);
    const auditPayload = insertCalls.find((c) => c.table === 'admin_audit_logs')?.payload as Record<string, unknown>;
    expect(auditPayload.action).toBe('increase_market_value');
    expect(auditPayload.module).toBe('market');
    expect(auditPayload.admin_id).toBe('admin-1');
  });
});
