import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GPContactForm from './GPContactForm';

describe('GPContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all GP contact fields', () => {
    render(
      <GPContactForm
        submitLabel="Save"
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/gp name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/practice name/i)).toBeInTheDocument();
  });

  it('accepts valid phone number characters and submits the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GPContactForm
        submitLabel="Save"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/gp name/i), 'Dr. Jane Smith');
    await user.type(screen.getByLabelText(/phone number/i), '+44 20-7946 0000');
    await user.type(screen.getByLabelText(/practice name/i), 'Carewell Medical');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        gpName: 'Dr. Jane Smith',
        phoneNumber: '+44 20-7946 0000',
        practiceName: 'Carewell Medical',
      });
    });
  });

  it('rejects invalid phone number characters', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GPContactForm
        submitLabel="Save"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/phone number/i), '020 ABC 123');
    await user.tab();
    expect(
      screen.getByText('Phone number can only contain digits, spaces, +, and -'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit button while submitting', () => {
    render(
      <GPContactForm
        submitLabel="Save"
        isSubmitting
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
