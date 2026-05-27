import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiInsightWidget from './AiInsightWidget';
import type { AiInsight } from '../../api/insights/insights.types';

const hookMock = vi.hoisted(() => ({
  value: {
    insight: null as AiInsight | null,
    loading: false,
    error: null as string | null,
    dismiss: vi.fn(),
  },
}));

vi.mock('@hooks/dashboard/useLatestInsight', () => ({
  useLatestInsight: () => hookMock.value,
}));

const BASE_INSIGHT: AiInsight = {
  id: 'insight-1',
  insightType: 'medication_adherence',
  observation: 'Medication adherence was 85% over the last 7 days.',
  suggestedAction: 'Check any missed doses and update the care team.',
  severity: 'medium',
  generatedAt: '2026-05-27T00:00:00.000Z',
};

function renderWidget() {
  return render(
    <MemoryRouter>
      <AiInsightWidget patientId="p1" groupId="g1" groupName="Dad Care Circle" />
    </MemoryRouter>,
  );
}

describe('AiInsightWidget', () => {
  beforeEach(() => {
    hookMock.value = { insight: null, loading: false, error: null, dismiss: vi.fn() };
  });

  it('shows the widget title and group name', () => {
    renderWidget();
    expect(screen.getByText('AI Insight')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    hookMock.value = { ...hookMock.value, loading: true };
    renderWidget();
    expect(screen.getByText('Loading insight…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    hookMock.value = { ...hookMock.value, error: 'Failed to load insight.' };
    renderWidget();
    expect(screen.getByText('Failed to load insight.')).toBeInTheDocument();
  });

  it('shows empty state when no insights exist', () => {
    renderWidget();
    expect(screen.getByText('No AI insights yet.')).toBeInTheDocument();
  });

  it('shows insight observation and suggested action', () => {
    hookMock.value = { ...hookMock.value, insight: BASE_INSIGHT };
    renderWidget();
    expect(screen.getByText('Medication adherence was 85% over the last 7 days.')).toBeInTheDocument();
    expect(screen.getByText('Check any missed doses and update the care team.')).toBeInTheDocument();
  });

  it('renders a link to the AI assistant page', () => {
    hookMock.value = { ...hookMock.value, insight: BASE_INSIGHT };
    renderWidget();
    const link = screen.getByRole('link', { name: /view all ai insights/i });
    expect(link).toHaveAttribute('href', '/groups/g1/ai-assistant');
  });

  it('calls dismiss with the insight id when dismiss button is clicked', async () => {
    const dismissFn = vi.fn();
    hookMock.value = { ...hookMock.value, insight: BASE_INSIGHT, dismiss: dismissFn };
    renderWidget();
    const dismissButton = screen.getByRole('button', { name: /dismiss this insight/i });
    await userEvent.click(dismissButton);
    expect(dismissFn).toHaveBeenCalledWith('insight-1');
  });

  it('shows empty state when the insight is null (previously dismissed)', () => {
    hookMock.value = { ...hookMock.value, insight: null };
    renderWidget();
    expect(screen.getByText('No AI insights yet.')).toBeInTheDocument();
  });
});
