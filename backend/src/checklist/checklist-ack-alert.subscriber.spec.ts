import { describe, expect, it, vi } from 'vitest';
import { ChecklistAckAlertSubscriber } from './checklist-ack-alert.subscriber';

describe('ChecklistAckAlertSubscriber', () => {
  function createSubscriber() {
    const cancelOpenAlert = vi.fn().mockResolvedValue(undefined);
    const chain = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    const client = { channel: vi.fn().mockReturnValue(chain), removeChannel: vi.fn() };
    const supabase = {
      isEnabled: () => true,
      getClient: () => client as never,
    };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
    );
    subscriber.onModuleInit();

    const handler = chain.on.mock.calls[0][2] as (payload: {
      new: Record<string, unknown>;
    }) => void;

    return { subscriber, handler, cancelOpenAlert, client, chain };
  }

  it('calls cancelOpenAlert for given status updates', async () => {
    const { handler, cancelOpenAlert } = createSubscriber();

    handler({ new: { id: 'chk-1', status: 'due' } });
    expect(cancelOpenAlert).not.toHaveBeenCalled();

    handler({ new: { id: 'chk-1', status: 'given' } });
    await vi.waitFor(() =>
      expect(cancelOpenAlert).toHaveBeenCalledWith('chk-1', 'acknowledged'),
    );
  });

  it('calls cancelOpenAlert for skipped status updates', async () => {
    const { handler, cancelOpenAlert } = createSubscriber();

    handler({ new: { id: 'chk-2', status: 'skipped' } });
    await vi.waitFor(() =>
      expect(cancelOpenAlert).toHaveBeenCalledWith('chk-2', 'acknowledged'),
    );
  });

  it('does not subscribe when Supabase admin client is disabled', () => {
    const cancelOpenAlert = vi.fn();
    const client = { channel: vi.fn() };
    const supabase = { isEnabled: () => false, getClient: () => client as never };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
    );
    subscriber.onModuleInit();

    expect(client.channel).not.toHaveBeenCalled();
  });

  it('removes channel on destroy', () => {
    const cancelOpenAlert = vi.fn();
    const realtimeChannel = { kind: 'RealtimeChannel' };
    const chain = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue(realtimeChannel),
    };
    const client = { channel: vi.fn().mockReturnValue(chain), removeChannel: vi.fn() };
    const supabase = { isEnabled: () => true, getClient: () => client as never };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
    );
    subscriber.onModuleInit();
    subscriber.onModuleDestroy();

    expect(client.removeChannel).toHaveBeenCalledWith(realtimeChannel);
  });
});
