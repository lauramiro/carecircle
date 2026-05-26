import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/wellbeing/WellbeingCheckInSection', () => ({
  default: () => <div>Weekly wellbeing check-in section</div>,
}));

import SettingsPage from './SettingsPage';
import { ThemeProvider } from '../contexts/ThemeContext';

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('carecircle:theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('renders appearance controls', () => {
    renderPage();

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Weekly wellbeing check-in section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /light mode/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /dark mode/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to dark mode from settings', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /dark mode/i }));

    expect(screen.getByRole('button', { name: /dark mode/i })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('carecircle:theme')).toBe('dark');
  });
});
