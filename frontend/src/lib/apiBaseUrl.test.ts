import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl, getApiBaseUrl } from './apiBaseUrl';

describe('apiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_API_BASE_URL when configured', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://carecircle-backend-v3j7.onrender.com/');
    vi.stubEnv('DEV', false);

    expect(getApiBaseUrl()).toBe('https://carecircle-backend-v3j7.onrender.com');
    expect(apiUrl('/api/insights/group-1/latest')).toBe(
      'https://carecircle-backend-v3j7.onrender.com/api/insights/group-1/latest',
    );
  });

  it('falls back to localhost in development when env is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('DEV', true);

    expect(getApiBaseUrl()).toBe('http://localhost:3000');
    expect(apiUrl('/api/insights/group-1/latest')).toBe(
      'http://localhost:3000/api/insights/group-1/latest',
    );
  });

  it('returns relative paths in production when env is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('DEV', false);

    expect(getApiBaseUrl()).toBe('');
    expect(apiUrl('/api/insights/group-1/latest')).toBe('/api/insights/group-1/latest');
  });
});
