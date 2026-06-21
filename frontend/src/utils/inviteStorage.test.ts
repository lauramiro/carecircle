import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInviteConfirmationPath,
  clearPendingInvite,
  getPendingInvite,
  savePendingInvite,
} from './inviteStorage';

describe('inviteStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('builds confirmation paths for the group invite route', () => {
    expect(
      buildInviteConfirmationPath({
        email: 'new@example.com',
        inviteId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toBe(
      '/group-invite?inviteId=550e8400-e29b-41d4-a716-446655440000&email=new%40example.com&confirmation=true',
    );
  });

  it('expires stale pending invites', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
    savePendingInvite({
      email: 'new@example.com',
      inviteId: '550e8400-e29b-41d4-a716-446655440000',
    });

    vi.setSystemTime(new Date('2026-06-17T12:00:00Z'));

    expect(getPendingInvite()).toBeNull();
    expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
  });

  it('clears pending invite storage', () => {
    savePendingInvite({
      email: 'new@example.com',
      inviteId: '550e8400-e29b-41d4-a716-446655440000',
    });

    clearPendingInvite();

    expect(getPendingInvite()).toBeNull();
  });
});
