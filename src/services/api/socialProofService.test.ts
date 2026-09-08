import { describe, expect, it, vi } from 'vitest';
import { createSocialProofService } from './socialProofService';

describe('socialProofService', () => {
  it('sendTestEventToClientStream calls the RPC with the right shape', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: 'evt-1',
        event_type: 'plan_activation',
        source: 'admin_test',
        display_name: 'Alex K.',
        message: 'Alex K. just activated Growth Plan',
        amount: 500,
        plan_name: 'Growth Plan',
        reference_table: null,
        reference_id: null,
        generated_by_admin_id: 'admin-1',
        environment: 'development',
        broadcast_scope: 'client_test',
        created_at: '2026-01-01T00:00:00Z',
        expires_at: '2026-01-01T00:10:00Z',
      },
      error: null,
    });
    const service = createSocialProofService({ rpc } as never);

    const result = await service.sendTestEventToClientStream('plan_activation', { name: 'Alex K.' }, 500, 'Growth Plan');

    expect(rpc).toHaveBeenCalledWith('admin_send_test_social_proof_event', {
      p_event_type: 'plan_activation',
      p_vars: { name: 'Alex K.' },
      p_amount: 500,
      p_plan_name: 'Growth Plan',
    });
    expect(result.broadcastScope).toBe('client_test');
    expect(result.source).toBe('admin_test');
  });

  it('propagates the server-side error when test mode is disabled instead of silently succeeding', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('live-looking test notifications are disabled') });
    const service = createSocialProofService({ rpc } as never);

    await expect(service.sendTestEventToClientStream('plan_activation', { name: 'Alex K.' })).rejects.toThrow('live-looking test notifications are disabled');
  });

  it('recordInteraction calls the RPC with the event id and interaction type', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = createSocialProofService({ rpc } as never);

    await service.recordInteraction('evt-1', 'clicked');

    expect(rpc).toHaveBeenCalledWith('record_social_proof_interaction', { p_event_id: 'evt-1', p_interaction: 'clicked' });
  });
});
