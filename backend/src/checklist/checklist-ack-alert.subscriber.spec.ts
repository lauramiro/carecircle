import { describe, expect, it, vi } from 'vitest';
import { ChecklistAckAlertSubscriber } from './checklist-ack-alert.subscriber';

describe('ChecklistAckAlertSubscriber', () => {
  function createSubscriber() {
    const cancelOpenAlert = vi.fn().mockResolvedValue(undefined);
    const findCancelledAlertByItemId = vi.fn().mockResolvedValue(null);
    const sendDismissToUsers = vi.fn().mockResolvedValue(undefined);
    const maybeSendLowStockAlert = vi.fn().mockResolvedValue(undefined);
    const chain = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    const client = {
      channel: vi.fn().mockReturnValue(chain),
      removeChannel: vi.fn(),
    };
    const supabase = {
      isEnabled: () => true,
      getClient: () => client as never,
    };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert, findCancelledAlertByItemId } as never,
      { sendDismissToUsers } as never,
      { maybeSendLowStockAlert } as never,
    );
    subscriber.onModuleInit();

    const handler = chain.on.mock.calls[0][2] as (payload: {
      new: Record<string, unknown>;
    }) => void;

    return {
      subscriber,
      handler,
      cancelOpenAlert,
      findCancelledAlertByItemId,
      sendDismissToUsers,
      maybeSendLowStockAlert,
      client,
      chain,
    };
  }

  it('calls cancelOpenAlert with marked_given for given status', async () => {
    const { handler, cancelOpenAlert, maybeSendLowStockAlert } = createSubscriber();

    handler({ new: { id: 'chk-1', status: 'due' } });
    expect(cancelOpenAlert).not.toHaveBeenCalled();

    handler({
      new: {
        id: 'chk-1',
        status: 'given',
        medication_id: 'med-1',
        group_id: 'group-1',
      },
    });
    await vi.waitFor(() =>
      expect(cancelOpenAlert).toHaveBeenCalledWith('chk-1', 'marked_given'),
    );
    await vi.waitFor(() =>
      expect(maybeSendLowStockAlert).toHaveBeenCalledWith({
        medicationId: 'med-1',
        groupId: 'group-1',
      }),
    );
  });

  it('calls cancelOpenAlert with marked_skipped for skipped status', async () => {
    const { handler, cancelOpenAlert, maybeSendLowStockAlert } = createSubscriber();

    handler({ new: { id: 'chk-2', status: 'skipped' } });
    await vi.waitFor(() =>
      expect(cancelOpenAlert).toHaveBeenCalledWith('chk-2', 'marked_skipped'),
    );
    expect(maybeSendLowStockAlert).not.toHaveBeenCalled();
  });

  it('still checks low stock when overdue alert cancellation fails', async () => {
    const cancelOpenAlert = vi
      .fn()
      .mockRejectedValue(new Error('cancel failed'));
    const maybeSendLowStockAlert = vi.fn().mockResolvedValue(undefined);
    const chain = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    const client = {
      channel: vi.fn().mockReturnValue(chain),
      removeChannel: vi.fn(),
    };
    const supabase = {
      isEnabled: () => true,
      getClient: () => client as never,
    };
    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
      { sendDismissToUsers: vi.fn() } as never,
      { maybeSendLowStockAlert } as never,
    );
    subscriber.onModuleInit();

    const handler = chain.on.mock.calls[0][2] as (payload: {
      new: Record<string, unknown>;
    }) => void;
    handler({
      new: {
        id: 'chk-1',
        status: 'given',
        medication_id: 'med-1',
        group_id: 'group-1',
      },
    });

    await vi.waitFor(() =>
      expect(maybeSendLowStockAlert).toHaveBeenCalledWith({
        medicationId: 'med-1',
        groupId: 'group-1',
      }),
    );
  });

  it('fires sendDismissToUsers excluding the acting user', async () => {
    const { handler, cancelOpenAlert, findCancelledAlertByItemId, sendDismissToUsers } = createSubscriber();

    findCancelledAlertByItemId.mockResolvedValue({
      id: 'alert-1',
      group_id: 'group-1',
      checklist_item_id: 'chk-1',
      push_recipient_user_ids: ['user-a', 'user-b', 'user-c'],
    });

    handler({ new: { id: 'chk-1', status: 'given', given_by_carer_id: 'user-a' } });
    await vi.waitFor(() => expect(cancelOpenAlert).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(sendDismissToUsers).toHaveBeenCalledWith(
        expect.not.arrayContaining(['user-a']),
        'chk-1',
        'group-1',
      ),
    );
    const [calledIds] = sendDismissToUsers.mock.calls[0] as [string[], string, string];
    expect(calledIds).toEqual(['user-b', 'user-c']);
  });

  it('does not fire sendDismissToUsers when no alert row exists', async () => {
    const { handler, sendDismissToUsers } = createSubscriber();
    // findCancelledAlertByItemId returns null by default
    handler({ new: { id: 'chk-3', status: 'given' } });
    await vi.waitFor(() => {
      // Give the async handleUpdate time to settle
      return new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    expect(sendDismissToUsers).not.toHaveBeenCalled();
  });

  it('does not subscribe when Supabase admin client is disabled', () => {
    const cancelOpenAlert = vi.fn();
    const client = { channel: vi.fn() };
    const supabase = {
      isEnabled: () => false,
      getClient: () => client as never,
    };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
      { sendDismissToUsers: vi.fn() } as never,
      { maybeSendLowStockAlert: vi.fn() } as never,
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
    const client = {
      channel: vi.fn().mockReturnValue(chain),
      removeChannel: vi.fn(),
    };
    const supabase = {
      isEnabled: () => true,
      getClient: () => client as never,
    };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      { cancelOpenAlert } as never,
      { sendDismissToUsers: vi.fn() } as never,
      { maybeSendLowStockAlert: vi.fn() } as never,
    );
    subscriber.onModuleInit();
    subscriber.onModuleDestroy();

    expect(client.removeChannel).toHaveBeenCalledWith(realtimeChannel);
  });
});
