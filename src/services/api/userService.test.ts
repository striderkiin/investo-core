import { describe, expect, it } from 'vitest';
import { createUserService } from './userService';
import { createMockSupabaseClient } from '../../test/mockSupabaseClient';

const VALID_TRANSACTION_ROW = {
  id: 'txn-1',
  user_id: 'user-1',
  type: 'adjustment',
  amount: 100,
  balance_before: 0,
  balance_after: 100,
  status: 'completed',
  reference: 'ADJ-1',
  description: 'Test credit',
  created_at: '2024-01-01T00:00:00Z',
};

describe('userService.adjustBalance', () => {
  it('calls the adjust_user_balance RPC with the exact fields the admin submitted', async () => {
    const { client, rpc } = createMockSupabaseClient({ rpcResult: { data: VALID_TRANSACTION_ROW, error: null } });
    const userService = createUserService(client);

    const result = await userService.adjustBalance({
      userId: 'user-1',
      field: 'available_balance',
      amount: 100,
      type: 'credit',
      reason: 'Test credit',
      notes: 'from support ticket #42',
    });

    expect(rpc).toHaveBeenCalledWith('adjust_user_balance', {
      p_user_id: 'user-1',
      p_field: 'available_balance',
      p_amount: 100,
      p_type: 'credit',
      p_reason: 'Test credit',
      p_notes: 'from support ticket #42',
    });
    expect(result.amount).toBe(100);
    expect(result.balanceAfter).toBe(100);
  });

  it('propagates the database error when the RPC rejects the adjustment', async () => {
    const { client } = createMockSupabaseClient({ rpcResult: { data: null, error: new Error('not authorized to adjust balances') } });
    const userService = createUserService(client);

    await expect(
      userService.adjustBalance({ userId: 'user-1', field: 'available_balance', amount: 50, type: 'debit', reason: 'test' })
    ).rejects.toThrow('not authorized to adjust balances');
  });
});
