import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import InsightsPage from './InsightsPage';

vi.mock('@contexts/AuthContext.tsx', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1' } },
  }),
}));

vi.mock('@api/insights.service.ts', () => ({
  getLatestInsights: vi.fn().mockResolvedValue({ digest: null, cards: [] }),
  getArchivedDigests: vi.fn().mockResolvedValue([]),
  dismissInsight: vi.fn(),
  triggerInsightGeneration: vi.fn(),
}));

describe('InsightsPage', () => {
  it('renders weekly insights heading and disclaimer', async () => {
    render(
      <MemoryRouter initialEntries={['/groups/group-1/insights']}>
        <Routes>
          <Route path="/groups/:groupId/insights" element={<InsightsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Weekly Insights')).toBeInTheDocument();
    expect(
      screen.getByText(/AI output is for coordination only/i),
    ).toBeInTheDocument();
  });
});
