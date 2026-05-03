import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GPContact } from '../../api/groups/groups.types';
import { useGPContacts } from './useGPContacts';

const serviceMock = vi.hoisted(() => ({
  addGPContact: vi.fn(),
  updateGPContact: vi.fn(),
  removeGPContact: vi.fn(),
}));

vi.mock('../../api/groups/groups.service', () => ({
  addGPContact: serviceMock.addGPContact,
  updateGPContact: serviceMock.updateGPContact,
  removeGPContact: serviceMock.removeGPContact,
}));

const initialContacts: GPContact[] = [
  {
    id: 'gp-001',
    gpName: 'Dr. Helen Carter',
    phoneNumber: '+44 20 7946 0123',
    practiceName: 'Northside Family Practice',
  },
];

describe('useGPContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.addGPContact.mockResolvedValue({
      id: 'gp-002',
      gpName: 'Dr. Samuel Patel',
      phoneNumber: '020 7946 0188',
      practiceName: 'Carewell Medical Centre',
    });
    serviceMock.updateGPContact.mockResolvedValue({
      id: 'gp-001',
      gpName: 'Dr. Helen Carter',
      phoneNumber: '+44 20 7946 9999',
      practiceName: 'Northside Family Practice',
    });
    serviceMock.removeGPContact.mockResolvedValue(undefined);
  });

  it('adds GP contacts and updates local state', async () => {
    const { result } = renderHook(() =>
      useGPContacts('group-care-001', initialContacts),
    );

    await act(async () => {
      await result.current.addGP({
        gpName: 'Dr. Samuel Patel',
        phoneNumber: '020 7946 0188',
        practiceName: 'Carewell Medical Centre',
      });
    });

    expect(serviceMock.addGPContact).toHaveBeenCalledWith('group-care-001', {
      gpName: 'Dr. Samuel Patel',
      phoneNumber: '020 7946 0188',
      practiceName: 'Carewell Medical Centre',
    });
    expect(result.current.contacts).toHaveLength(2);
  });

  it('updates GP contacts and updates local state', async () => {
    const { result } = renderHook(() =>
      useGPContacts('group-care-001', initialContacts),
    );

    await act(async () => {
      await result.current.updateGP('gp-001', {
        gpName: 'Dr. Helen Carter',
        phoneNumber: '+44 20 7946 9999',
        practiceName: 'Northside Family Practice',
      });
    });

    expect(serviceMock.updateGPContact).toHaveBeenCalledWith(
      'group-care-001',
      'gp-001',
      {
        gpName: 'Dr. Helen Carter',
        phoneNumber: '+44 20 7946 9999',
        practiceName: 'Northside Family Practice',
      },
    );
    expect(result.current.contacts[0].phoneNumber).toBe('+44 20 7946 9999');
  });

  it('removes GP contacts and updates local state', async () => {
    const { result } = renderHook(() =>
      useGPContacts('group-care-001', initialContacts),
    );

    await act(async () => {
      await result.current.removeGP('gp-001');
    });

    expect(serviceMock.removeGPContact).toHaveBeenCalledWith('group-care-001', 'gp-001');
    expect(result.current.contacts).toHaveLength(0);
  });

  it('sets error state when a service call fails', async () => {
    serviceMock.addGPContact.mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() =>
      useGPContacts('group-care-001', initialContacts),
    );

    await act(async () => {
      try {
        await result.current.addGP({ gpName: 'Dr. Failed' });
      } catch {
        // The hook intentionally rethrows so callers can show toast feedback.
      }
    });

    expect(result.current.error).toBe('Something went wrong. Please try again.');
  });
});
