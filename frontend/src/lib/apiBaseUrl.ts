const DEFAULT_DEV_API_BASE_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  if (configured) return configured;
  if (import.meta.env.DEV) return DEFAULT_DEV_API_BASE_URL;
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}
