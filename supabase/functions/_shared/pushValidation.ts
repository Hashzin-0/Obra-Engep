const ALLOWED_PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
]);

export function isAllowedPushEndpoint(value: string): boolean {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const authority = value.slice(value.indexOf('://') + 3).split(/[/?#]/, 1)[0].toLowerCase();
    const trustedHost = ALLOWED_PUSH_HOSTS.has(host)
      || host.endsWith('.push.services.mozilla.com')
      || host.endsWith('.notify.windows.com');
    return url.protocol === 'https:'
      && trustedHost
      && authority === host
      && !url.username
      && !url.password
      && !url.port
      && !url.hash;
  } catch {
    return false;
  }
}

export function isValidSubscriptionKey(value: string, minLength: number, maxLength: number): boolean {
  return typeof value === 'string'
    && value.length >= minLength
    && value.length <= maxLength
    && /^[A-Za-z0-9+/_=-]+$/.test(value);
}
