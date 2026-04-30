import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GPContact } from '../../api/groups/groups.types';
import GPContactCard from './GPContactCard';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const completeContact: GPContact = {
  id: 'gp-001',
  gpName: 'Dr. Helen Carter',
  phoneNumber: '+44 20 7946 0123',
  practiceName: 'Northside Family Practice',
};

function renderCard(props?: Partial<ComponentProps<typeof GPContactCard>>) {
  return render(
    <GPContactCard
      contact={completeContact}
      canManage
      isUpdating={false}
      isRemoving={false}
      onUpdate={vi.fn().mockResolvedValue(undefined)}
      onRemove={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />,
  );
}

describe('GPContactCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Not provided for missing fields', () => {
    renderCard({
      contact: {
        id: 'gp-empty',
      },
      canManage: false,
    });

    expect(screen.getAllByText('Not provided')).toHaveLength(3);
  });

  it('renders Edit and Remove controls for admins only', () => {
    const { rerender } = renderCard({ canManage: true });

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();

    rerender(
      <GPContactCard
        contact={completeContact}
        canManage={false}
        isUpdating={false}
        isRemoving={false}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('switches to form mode when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText(/gp name/i)).toHaveValue('Dr. Helen Carter');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows removal confirmation and reverts on cancel', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Helen Carter')).toBeInTheDocument();
  });
});
