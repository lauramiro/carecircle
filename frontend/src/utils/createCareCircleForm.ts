import { compact, isEmpty, mapValues, pickBy } from 'lodash-es';

export function parseCommaSeparatedList(raw: string): string[] | undefined {
  const items = compact(raw.split(/[\n,]+/).map(s => s.trim()));
  return items.length ? items : undefined;
}

export function pickDefinedStrings(obj: Record<string, string>): Record<string, string> | undefined {
  const trimmed = mapValues(obj, (v: string) => v.trim());
  const picked = pickBy(trimmed, (v: string) => v.length > 0);
  return isEmpty(picked) ? undefined : picked;
}
