import crypto from 'node:crypto';

export const KEY_PREFIX = 'trk_';
// Number of chars after the prefix that are safe to display.
const VISIBLE_PREFIX_CHARS = 6;

export interface GeneratedKey {
  fullKey: string;       // returned once to the user, never persisted
  hash: string;          // sha256 hex, persisted
  prefix: string;        // 'trk_AbCdEf' (10 chars), persisted for display
}

export function generateApiKey(): GeneratedKey {
  const random = crypto.randomBytes(24).toString('base64url');
  const fullKey = `${KEY_PREFIX}${random}`;
  return {
    fullKey,
    hash: hashApiKey(fullKey),
    prefix: fullKey.slice(0, KEY_PREFIX.length + VISIBLE_PREFIX_CHARS),
  };
}

export function hashApiKey(fullKey: string): string {
  return crypto.createHash('sha256').update(fullKey).digest('hex');
}

export function isPlausibleKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length >= KEY_PREFIX.length + 16;
}
