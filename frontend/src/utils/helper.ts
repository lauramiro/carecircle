export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return '';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  const visiblePrefix = localPart.slice(0, 2);
  const visibleSuffix = localPart.length > 4 ? localPart.slice(-2) : '';

  return `${visiblePrefix}******${visibleSuffix}@${domain}`;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException
    ? e.name === 'AbortError'
    : e instanceof Error && e.name === 'AbortError';
}

/**
 * Safely parses JSON from a fetch Response, returning an empty object if the body is empty.
 * Prevents "Unexpected end of JSON input" errors when APIs return 200/204 with no body.
 */
export async function parseResponseJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }
  return JSON.parse(text) as T;
}
