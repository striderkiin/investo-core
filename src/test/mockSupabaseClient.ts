import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal mock of the Supabase client's fluent query builder, enough to drive
 * the service-layer unit tests without a live project. Each test configures
 * `resolvedValue`/`rpcResolvedValue` for the specific call it cares about.
 */
export function createMockSupabaseClient(overrides: { rpcResult?: { data?: unknown; error?: unknown } } = {}) {
  const single = vi.fn().mockResolvedValue({ data: null, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'ilike', 'or', 'in', 'is', 'gte'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = single;
  builder.maybeSingle = maybeSingle;
  // Support `await query` directly (thenable) by resolving to an empty list.
  (builder as unknown as { then: (resolve: (value: unknown) => void) => void }).then = (resolve) =>
    resolve({ data: [], error: null });

  const from = vi.fn(() => builder);
  const rpc = vi.fn().mockResolvedValue(overrides.rpcResult ?? { data: null, error: null });

  const client = { from, rpc, auth: {} } as unknown as SupabaseClient;

  return { client, from, rpc, builder, single, maybeSingle };
}
