import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.hoisted(() => vi.fn());
const isCurrentUserPrimaryCarerMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../components/wellbeing/WellbeingCheckInSection', () => ({
  default: () => <div>Weekly wellbeing check-in section</div>,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../api/wellbeing/wellbeing.service', () => ({
  isCurrentUserPrimaryCarer: isCurrentUserPrimaryCarerMock,
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

import SettingsPage from './SettingsPage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { FontSizeProvider } from '../contexts/FontSizeContext';

function renderPage() {
  return render(
    <FontSizeProvider>
      <ThemeProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    </FontSizeProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { preferences: null }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    localStorage.clear();
    localStorage.setItem('carecircle:theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-1' } } });
    isCurrentUserPrimaryCarerMock.mockResolvedValue(true);
    fromMock.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select,
          update,
        };
      }

      throw new Error(`Unexpected table ${tableName}`);
    });
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

  it('renders font size controls with standard selected by default', () => {
    renderPage();

    expect(screen.getByText('Text size')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^standard$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^large$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^extra-large$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to large font size and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^large$/i }));

    expect(screen.getByRole('button', { name: /^large$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^standard$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('large');
    expect(localStorage.getItem('carecircle:font-size')).toBe('large');
  });

  it('removes data-font-size attribute when switching back to standard', async () => {
    const user = userEvent.setup();
    localStorage.setItem('carecircle:font-size', 'large');
    document.documentElement.setAttribute('data-font-size', 'large');
    renderPage();

    await user.click(screen.getByRole('button', { name: /^standard$/i }));

    expect(document.documentElement.hasAttribute('data-font-size')).toBe(false);
  });

  it('loads font size from DB preferences and applies it', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { preferences: { accessibility: { fontSize: 'extra-large' } } },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });

    fromMock.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({ eq }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      throw new Error(`Unexpected table ${tableName}`);
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^extra-large$/i })).toHaveAttribute('aria-pressed', 'true');
      expect(document.documentElement.getAttribute('data-font-size')).toBe('extra-large');
    });
  });

  it('saves font size to DB when changed', async () => {
    const user = userEvent.setup();
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    fromMock.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { preferences: null }, error: null }),
            }),
          }),
          update,
        };
      }
      throw new Error(`Unexpected table ${tableName}`);
    });

    renderPage();
    await screen.findByRole('button', { name: /^large$/i });

    await user.click(screen.getByRole('button', { name: /^large$/i }));

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            accessibility: { fontSize: 'large' },
          }),
        }),
      );
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('loads and updates the weekly wellbeing reminder preference for primary carers', async () => {
    const user = userEvent.setup();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        preferences: { notifications: { weeklyWellbeingReminderEnabled: true } },
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    fromMock.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({ eq }),
          update,
        };
      }

      throw new Error(`Unexpected table ${tableName}`);
    });

    renderPage();

    const checkbox = await screen.findByRole('checkbox', {
      name: /weekly wellbeing check-in reminder/i,
    });

    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(update).toHaveBeenCalledWith({
      preferences: {
        notifications: {
          weeklyWellbeingReminderEnabled: false,
        },
      },
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
  });
});
