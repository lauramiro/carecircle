import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GPContact } from '../../api/groups/groups.types';
import GPContactSection from './GPContactSection';

const contacts: GPContact[] = [
  {
    id: 'gp-001',
    gpName: 'Dr. Helen Carter',
    phoneNumber: '+44 20 7946 0123',
    practiceName: 'Northside Family Practice',
  },
  {
    id: 'gp-002',
    gpName: 'Dr. Samuel Patel',
    phoneNumber: '020 7946 0188',
    practiceName: 'Carewell Medical Centre',
  },
];

function renderSection(
  role: 'Admin' | 'Member' = 'Admin',
  gpContacts: GPContact[] = contacts,
) {
  render(
    <GPContactSection
      groupId="group-care-001"
      gpContacts={gpContacts}
      userRole={role}
      isSubmitting={{ add: false, update: false, remove: false }}
      onAddGP={vi.fn().mockResolvedValue(undefined)}
      onUpdateGP={vi.fn().mockResolvedValue(undefined)}
      onRemoveGP={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe('GPContactSection', () => {
  it('renders Add GP Contact button for admins', () => {
    renderSection('Admin');

    expect(screen.getByRole('button', { name: /\+ add gp contact/i })).toBeInTheDocument();
  });

  it('does not render Add GP Contact button for members', () => {
    renderSection('Member');

    expect(screen.queryByRole('button', { name: /\+ add gp contact/i })).not.toBeInTheDocument();
  });

  it('shows the admin empty state when no GP contacts exist', () => {
    renderSection('Admin', []);

    expect(screen.getByText('No GP contacts added yet')).toBeInTheDocument();
  });

  it('shows the member empty state when no GP contacts exist', () => {
    renderSection('Member', []);

    expect(screen.getByText('No GP contact information available')).toBeInTheDocument();
  });

  it('renders the correct number of GP contact cards', () => {
    renderSection('Admin');

    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
});
