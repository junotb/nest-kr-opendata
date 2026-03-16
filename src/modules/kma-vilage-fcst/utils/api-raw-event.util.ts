import { createHash } from 'crypto';

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const sortedObject = Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `"${key}":${stableSerialize((value as Record<string, unknown>)[key])}`,
    )
    .join(',');

  return `{${sortedObject}}`;
}

export function createRequestSignature(value: unknown): string {
  const normalized = stableSerialize(value);
  return createHash('sha256').update(normalized).digest('hex');
}

export function stringifyRawPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
