import type { Group, GroupSummary, InvitePayload, InviteResult } from './groups.types';
import * as groupsMock from './groups.mock';

export async function getGroups(): Promise<GroupSummary[]> {
  return groupsMock.getGroups();
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  return groupsMock.getGroupById(groupId);
}

export async function inviteMember(payload: InvitePayload): Promise<InviteResult> {
  return groupsMock.inviteMember(payload);
}
