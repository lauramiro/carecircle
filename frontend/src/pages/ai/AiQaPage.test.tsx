import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AiQaPage from './AiQaPage';

vi.mock('@components/ai', () => ({
  AiQaInterface: () => <div data-testid="ai-qa-interface">AI interface</div>,
}));

describe('AiQaPage', () => {
  it('renders AI assistant when groupId is present', () => {
    render(
      <MemoryRouter initialEntries={['/groups/group-1/ai-assistant']}>
        <Routes>
          <Route path="/groups/:groupId/ai-assistant" element={<AiQaPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('AI assistant')).toBeInTheDocument();
    expect(screen.getByTestId('ai-qa-interface')).toBeInTheDocument();
  });

  it('shows error when groupId is missing', () => {
    render(
      <MemoryRouter initialEntries={['/ai-assistant']}>
        <Routes>
          <Route path="/ai-assistant" element={<AiQaPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/No care circle selected/i),
    ).toBeInTheDocument();
  });
});
