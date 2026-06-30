import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AiQaInterface from './AiQaInterfaceProps';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

describe('AiQaInterface', () => {
  it('does not force the root section to a fixed viewport height', () => {
    // Regression test for CC-173: `h-screen` on the root <section> forced a
    // fixed 100vh height regardless of actual content, even though this
    // component is nested inside DashboardLayout's <main> and a wrapper div
    // (not the page root). That produced dead/excess space on the AI
    // Assistant page. The section must size to its parent container instead.
    const { container } = render(<AiQaInterface groupId="group-care-001" />);

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root?.className).not.toMatch(/\bh-screen\b/);
    expect(root?.className).toMatch(/\bh-full\b/);
  });

  it('renders the chat header and empty state', () => {
    render(<AiQaInterface groupId="group-care-001" />);

    expect(screen.getByText('Care Assistant')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });
});
