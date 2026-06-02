import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnDutyCarerWidget from './OnDutyCarerWidget';
import type { OnDutyCarerState } from '@hooks/dashboard/useOnDutyCarer';

const carerHookMock = vi.hoisted(() => ({
  value: {
    carerName: null,
    shiftEnd: null,
    noCarerAssigned: false,
    loading: false,
    error: null,
  } as OnDutyCarerState,
}));

vi.mock('@hooks/dashboard/useOnDutyCarer', () => ({
  useOnDutyCarer: () => carerHookMock.value,
}));

function render_widget() {
  return render(<OnDutyCarerWidget groupId="g1" groupName="Dad Care Circle" />);
}

describe('OnDutyCarerWidget', () => {
  beforeEach(() => {
    carerHookMock.value = {
      carerName: null,
      shiftEnd: null,
      noCarerAssigned: false,
      loading: false,
      error: null,
    };
  });

  it('shows the widget title and group name', () => {
    render_widget();
    expect(screen.getByText('On Duty')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    carerHookMock.value = { ...carerHookMock.value, loading: true };
    render_widget();
    expect(screen.getByText('Loading shift data…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    carerHookMock.value = { ...carerHookMock.value, error: 'Failed to load shift data.' };
    render_widget();
    expect(screen.getByText('Failed to load shift data.')).toBeInTheDocument();
  });

  it('shows no-carer warning when noCarerAssigned is true', () => {
    carerHookMock.value = { ...carerHookMock.value, noCarerAssigned: true };
    render_widget();
    expect(screen.getByText('No carer assigned')).toBeInTheDocument();
    expect(screen.getByText(/No shift is currently covered/)).toBeInTheDocument();
  });

  it('shows carer name and shift end time', () => {
    carerHookMock.value = {
      carerName: 'Sarah Johnson',
      shiftEnd: '20:00',
      noCarerAssigned: false,
      loading: false,
      error: null,
    };
    render_widget();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Shift ends at 20:00')).toBeInTheDocument();
  });

  it('shows carer name without shift end when shiftEnd is null', () => {
    carerHookMock.value = {
      carerName: 'Sarah Johnson',
      shiftEnd: null,
      noCarerAssigned: false,
      loading: false,
      error: null,
    };
    render_widget();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.queryByText(/Shift ends/)).not.toBeInTheDocument();
  });
});
