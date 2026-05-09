import { useState } from 'react';
import type { GPContact } from '../../api/groups/groups.types';
import {
  addGPContact,
  removeGPContact,
  updateGPContact,
} from '../../api/groups/groups.service';

interface GPContactState {
  groupId: string;
  contacts: GPContact[];
}

interface GPContactSubmittingState {
  add: boolean;
  update: boolean;
  remove: boolean;
}

export function useGPContacts(groupId: string, initialContacts: GPContact[]) {
  const [state, setState] = useState<GPContactState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<GPContactSubmittingState>({
    add: false,
    update: false,
    remove: false,
  });
  const [error, setError] = useState<string | null>(null);

  const contacts =
    state?.groupId === groupId ? state.contacts : initialContacts;

  async function addGP(data: Omit<GPContact, 'id'>): Promise<GPContact> {
    setIsSubmitting((current) => ({ ...current, add: true }));
    setError(null);

    try {
      const contact = await addGPContact(groupId, data);
      setState({ groupId, contacts: [...contacts, contact] });
      return contact;
    } catch (requestError) {
      setError('Something went wrong. Please try again.');
      throw requestError;
    } finally {
      setIsSubmitting((current) => ({ ...current, add: false }));
    }
  }

  async function updateGP(
    gpId: string,
    data: Omit<GPContact, 'id'>,
  ): Promise<GPContact> {
    setIsSubmitting((current) => ({ ...current, update: true }));
    setError(null);

    try {
      const updatedContact = await updateGPContact(groupId, gpId, data);
      setState({
        groupId,
        contacts: contacts.map((contact) =>
          contact.id === gpId ? updatedContact : contact,
        ),
      });
      return updatedContact;
    } catch (requestError) {
      setError('Something went wrong. Please try again.');
      throw requestError;
    } finally {
      setIsSubmitting((current) => ({ ...current, update: false }));
    }
  }

  async function removeGP(gpId: string): Promise<void> {
    setIsSubmitting((current) => ({ ...current, remove: true }));
    setError(null);

    try {
      await removeGPContact(groupId, gpId);
      setState({
        groupId,
        contacts: contacts.filter((contact) => contact.id !== gpId),
      });
    } catch (requestError) {
      setError('Something went wrong. Please try again.');
      throw requestError;
    } finally {
      setIsSubmitting((current) => ({ ...current, remove: false }));
    }
  }

  return {
    contacts,
    error,
    isSubmitting,
    addGP,
    updateGP,
    removeGP,
  };
}
