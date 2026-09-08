import { describe, expect, it } from 'vitest';
import { createWithdrawalService } from './withdrawalService';
import { createMockSupabaseClient } from '../../test/mockSupabaseClient';

const VALID_WITHDRAWAL_ROW = {
  id: 'wd-1',
  user_id: 'user-1',
  amount: 500,
  fee: 5,
  currency: 'USDT',
  network: 'Tron (TRC-20)',
  destination: 'Taddress',
  status: 'pending',
  reviewed_by: null,
  transaction_id: 'txn-1',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('withdrawalService.request', () => {
  it('sends the withdrawal request through the request_withdrawal RPC, never a direct table write', async () => {
    const { client, rpc, from } = createMockSupabaseClient({ rpcResult: { data: VALID_WITHDRAWAL_ROW, error: null } });
    const withdrawalService = createWithdrawalService(client);

    const result = await withdrawalService.request({ amount: 500, currency: 'USDT', network: 'Tron (TRC-20)', destination: 'Taddress' });

    expect(rpc).toHaveBeenCalledWith('request_withdrawal', {
      p_amount: 500,
      p_currency: 'USDT',
      p_network: 'Tron (TRC-20)',
      p_destination: 'Taddress',
    });
    expect(from).not.toHaveBeenCalledWith('withdrawals');
    expect(result.status).toBe('pending');
  });

  it('surfaces server-side validation failures (e.g. insufficient balance) as errors', async () => {
    const { client } = createMockSupabaseClient({ rpcResult: { data: null, error: new Error('insufficient available balance') } });
    const withdrawalService = createWithdrawalService(client);

    await expect(
      withdrawalService.request({ amount: 999999, currency: 'USDT', network: 'Tron (TRC-20)', destination: 'Taddress' })
    ).rejects.toThrow('insufficient available balance');
  });
});

describe('withdrawalService.review', () => {
  it('calls review_withdrawal with the admin-chosen action', async () => {
    const { client, rpc } = createMockSupabaseClient({ rpcResult: { data: { ...VALID_WITHDRAWAL_ROW, status: 'processing' }, error: null } });
    const withdrawalService = createWithdrawalService(client);

    const result = await withdrawalService.review('wd-1', 'approve', 'looks fine');

    expect(rpc).toHaveBeenCalledWith('review_withdrawal', { p_withdrawal_id: 'wd-1', p_action: 'approve', p_notes: 'looks fine' });
    expect(result.status).toBe('processing');
  });
});
