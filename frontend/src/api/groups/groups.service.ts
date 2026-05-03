import type {
  GPContact,
  Group,
  GroupSummary,
  InvitePayload,
  InviteResult,
} from './groups.types';
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

export async function addGPContact(
  groupId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  return groupsMock.addGPContact(groupId, data);
}

export async function updateGPContact(
  groupId: string,
  gpId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  return groupsMock.updateGPContact(groupId, gpId, data);
}

export async function removeGPContact(groupId: string, gpId: string): Promise<void> {
  return groupsMock.removeGPContact(groupId, gpId);
}
