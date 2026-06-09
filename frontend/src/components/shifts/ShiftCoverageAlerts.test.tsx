import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ShiftCoverageAlerts from './ShiftCoverageAlerts';

describe('ShiftCoverageAlerts', () => {
  it('renders themed coverage gaps with assign link', () => {
    render(
      <MemoryRouter>
        <ShiftCoverageAlerts
          loading={false}
          error={null}
          warnings={[
            {
              groupId: 'group-1',
              groupName: 'Mum',
              unassignedCount: 28,
              weekStart: '2026-05-26',
              weekEnd: '2026-06-01',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Shift coverage gaps')).toBeInTheDocument();
    expect(screen.getByText(/28 of 28 sessions need coverage/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assign shifts/i })).toHaveAttribute(
      'href',
      '/groups/group-1/shifts',
    );
  });
});
