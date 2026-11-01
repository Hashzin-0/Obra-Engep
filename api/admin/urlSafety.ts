import { isIP } from 'node:net';

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.test',
  '.invalid',
  '.example',
  '.home',
  '.lan',
  '.onion',
];

export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 8 || value.length > 2048) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isBlockedHostname = hostname === 'localhost'
      || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

    if (
      url.protocol !== 'https:'
      || !hostname
      || isIP(hostname) !== 0
      || isBlockedHostname
      || url.username
      || url.password
      || url.port
      || url.hash
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
