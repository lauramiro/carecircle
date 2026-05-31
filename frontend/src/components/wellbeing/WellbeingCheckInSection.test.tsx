import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WellbeingCheckInSection from './WellbeingCheckInSection';

const useWellbeingCheckInsMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/wellbeing/useWellbeingCheckIns', () => ({
  useWellbeingCheckIns: useWellbeingCheckInsMock,
}));

describe('WellbeingCheckInSection', () => {
  beforeEach(() => {
    useWellbeingCheckInsMock.mockReturnValue({
      canSubmitCheckIn: true,
      checkIns: [
        {
          id: 'check-in-1',
          submittedAt: '2026-05-26T08:00:00.000Z',
          weekStart: '2026-05-25',
          sleepQuality: 4,
          stressLevel: 2,
          overwhelmLevel: 3,
          socialConnection: 4,
          overallMood: 5,
          compositeScore: 18,
          supportMessageDismissedAt: null,
        },
      ],
      dismissSupportMessage: vi.fn().mockResolvedValue(undefined),
      error: null,
      hasCurrentWeekCheckIn: false,
      isDismissingSupportMessage: false,
      isLoading: false,
      isPrimaryCarer: true,
      isSubmitting: false,
      supportTrigger: null,
      submitCheckIn: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders the private weekly check-in form and history', () => {
    render(<WellbeingCheckInSection />);

    expect(screen.getByText('Weekly wellbeing check-in')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: '1' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/week of 25 may 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/score 18\/25/i)).toBeInTheDocument();
  });

  it('validates that all five questions are answered before submit', async () => {
    const user = userEvent.setup();
    render(<WellbeingCheckInSection />);

    await user.click(screen.getByRole('button', { name: /submit weekly check-in/i }));

    expect(screen.getByText(/answer all five wellbeing questions/i)).toBeInTheDocument();
    expect(useWellbeingCheckInsMock.mock.results[0]?.value.submitCheckIn).not.toHaveBeenCalled();
  });

  it('submits a completed five-question check-in', async () => {
    const user = userEvent.setup();
    const submitCheckIn = vi.fn().mockResolvedValue(undefined);
    useWellbeingCheckInsMock.mockReturnValue({
      canSubmitCheckIn: true,
      checkIns: [],
      dismissSupportMessage: vi.fn().mockResolvedValue(undefined),
      error: null,
      hasCurrentWeekCheckIn: false,
      isDismissingSupportMessage: false,
      isLoading: false,
      isPrimaryCarer: true,
      isSubmitting: false,
      supportTrigger: null,
      submitCheckIn,
    });

    render(<WellbeingCheckInSection />);

    for (const label of [
      'How well have you been sleeping this week?',
      'How stressed have you felt this week?',
      'How overwhelmed have you felt by caring responsibilities?',
      'How connected have you felt to your support network?',
      'How would you rate your overall mood this week?',
    ]) {
      const fieldset = screen.getByText(label).closest('fieldset');
      const option = fieldset?.querySelector('input[value="4"]') as HTMLInputElement | null;
      if (!option) throw new Error(`Missing option for ${label}`);
      await user.click(option.nextElementSibling as HTMLElement);
    }

    await user.click(screen.getByRole('button', { name: /submit weekly check-in/i }));

    await waitFor(() => {
      expect(submitCheckIn).toHaveBeenCalledWith({
        sleepQuality: 4,
        stressLevel: 4,
        overwhelmLevel: 4,
        socialConnection: 4,
        overallMood: 4,
      });
    });
  });

  it('shows a read-only message for non-primary carers', () => {
    useWellbeingCheckInsMock.mockReturnValue({
      canSubmitCheckIn: false,
      checkIns: [],
      dismissSupportMessage: vi.fn(),
      error: null,
      hasCurrentWeekCheckIn: false,
      isDismissingSupportMessage: false,
      isLoading: false,
      isPrimaryCarer: false,
      isSubmitting: false,
      supportTrigger: null,
      submitCheckIn: vi.fn(),
    });

    render(<WellbeingCheckInSection />);

    expect(screen.getByText(/available to primary carers only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit weekly check-in/i })).not.toBeInTheDocument();
  });

  it('shows a supportive alert after two consecutive low-score weeks and allows dismissal', async () => {
    const user = userEvent.setup();
    const dismissSupportMessage = vi.fn().mockResolvedValue(undefined);

    useWellbeingCheckInsMock.mockReturnValue({
      canSubmitCheckIn: false,
      checkIns: [],
      dismissSupportMessage,
      error: null,
      hasCurrentWeekCheckIn: true,
      isDismissingSupportMessage: false,
      isLoading: false,
      isPrimaryCarer: true,
      isSubmitting: false,
      supportTrigger: {
        checkInId: 'check-in-2',
        triggerWeekStart: '2026-05-25',
        compositeScore: 12,
        averageScore: 2.4,
      },
      submitCheckIn: vi.fn(),
    });

    render(<WellbeingCheckInSection />);

    expect(screen.getByText(/last two weeks have been especially heavy/i)).toBeInTheDocument();
    expect(screen.getByText(/redistributing some upcoming shifts/i)).toBeInTheDocument();
    expect(screen.getByText(/carers' support organisations/i)).toBeInTheDocument();
    expect(screen.getByText(/booking your own gp appointment/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() => {
      expect(dismissSupportMessage).toHaveBeenCalledTimes(1);
    });
  });
});