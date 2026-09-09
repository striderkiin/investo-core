import { describe, expect, it, vi } from 'vitest';
import { createContactService } from './contactService';

describe('contactService', () => {
  it('submit inserts a contact_messages row without a submitted_by field (stamped server-side)', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    const service = createContactService({ from } as never);

    await service.submit({ name: 'Alex K', email: 'alex@example.com', subject: 'Question', message: 'Hi there' });

    expect(from).toHaveBeenCalledWith('contact_messages');
    expect(insert).toHaveBeenCalledWith({ name: 'Alex K', email: 'alex@example.com', subject: 'Question', message: 'Hi there' });
  });

  it('submit propagates a database error instead of swallowing it', async () => {
    const insert = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
    const from = vi.fn(() => ({ insert }));
    const service = createContactService({ from } as never);

    await expect(service.submit({ name: 'A', email: 'a@example.com', subject: 'S', message: 'M' })).rejects.toThrow('insert failed');
  });

  it('updateStatus sets responded_by/responded_at only when moving to a resolved-style status', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: '1', name: 'A', email: 'a@example.com', subject: 'S', message: 'M', status: 'read', submitted_by: null, responded_by: null, responded_at: null, created_at: '2026-01-01T00:00:00Z' },
      error: null,
    });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const service = createContactService({ from } as never);

    await service.updateStatus('1', 'read', 'admin-1');

    expect(update).toHaveBeenCalledWith({ status: 'read' });
  });
});
