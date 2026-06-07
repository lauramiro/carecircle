import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MedicationSummaryWidget from './MedicationSummaryWidget';
import type { MedicationSummaryState } from '@hooks/dashboard/useMedicationSummary';

const summaryHookMock = vi.hoisted(() => ({
  value: {
    summary: { total: 0, due: 0, given: 0, overdue: 0, skipped: 0, remaining: 0 },
    checklistId: null,
    loading: false,
    error: null,
  } as MedicationSummaryState,
}));

vi.mock('@hooks/dashboard/useMedicationSummary', () => ({
  useMedicationSummary: () => summaryHookMock.value,
}));

function render_widget() {
  return render(
    <MemoryRouter>
      <MedicationSummaryWidget groupId="g1" patientId="p1" groupName="Dad Care Circle" />
    </MemoryRouter>,
  );
}

describe('MedicationSummaryWidget', () => {
  beforeEach(() => {
    summaryHookMock.value = {
      summary: { total: 0, due: 0, given: 0, overdue: 0, skipped: 0, remaining: 0 },
      checklistId: null,
      loading: false,
      error: null,
    };
  });

  it('shows the widget title and group name', () => {
    render_widget();
    expect(screen.getByText("Today's Medications")).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    summaryHookMock.value = { ...summaryHookMock.value, loading: true };
    render_widget();
    expect(screen.getByText('Loading medication data…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    summaryHookMock.value = { ...summaryHookMock.value, error: 'Failed to load medication data.' };
    render_widget();
    expect(screen.getByText('Failed to load medication data.')).toBeInTheDocument();
  });

  it('shows empty state when no medications today', () => {
    render_widget();
    expect(screen.getByText('No medications scheduled for today.')).toBeInTheDocument();
  });

  it('shows summary counts when medications exist', () => {
    summaryHookMock.value = {
      ...summaryHookMock.value,
      summary: { total: 5, due: 2, given: 2, overdue: 1, skipped: 0, remaining: 3 },
    };
    render_widget();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders overdue count as a link when overdue > 0', () => {
    summaryHookMock.value = {
      ...summaryHookMock.value,
      summary: { total: 5, due: 2, given: 2, overdue: 3, skipped: 0, remaining: 5 },
    };
    render_widget();
    const link = screen.getByRole('link', { name: /3 overdue/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('filter=overdue'));
  });

  it('does not render overdue as a link when overdue is 0', () => {
    summaryHookMock.value = {
      ...summaryHookMock.value,
      summary: { total: 3, due: 1, given: 2, overdue: 0, skipped: 0, remaining: 1 },
    };
    render_widget();
    expect(screen.queryByRole('link', { name: /overdue/i })).not.toBeInTheDocument();
  });
});
