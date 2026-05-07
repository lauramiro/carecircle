import type { InviteGroupDetails } from '../services/inviteService';
import type { PendingInvite } from '../utils/inviteStorage';

export type InviteState =
  | { type: 'loading'; message: string }
  | { type: 'error'; message: string }
  | {
      type: 'confirmation';
      invite: PendingInvite;
      group: InviteGroupDetails;
      alreadyMember: boolean;
    };
