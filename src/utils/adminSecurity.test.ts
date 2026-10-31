import test from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import {
  getAdminSessionId,
  getTrustedClientIp,
  matchesAdminEntryPath,
} from '../../api/admin/sessionSecurity';
import {
  isAllowedPushEndpoint,
  isValidSubscriptionKey,
} from '../../supabase/functions/_shared/pushValidation';

const SESSION_ID = '123e4567-e89b-42d3-a456-426614174000';

function tokenWithSessionId(sessionId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url');
  return header + '.' + payload + '.signature';
}

test('extracts only a UUID-shaped session_id from a JWT payload', () => {
  assert.equal(getAdminSessionId(tokenWithSessionId(SESSION_ID)), SESSION_ID);
  assert.equal(getAdminSessionId(tokenWithSessionId('not-a-session')), null);
  assert.equal(getAdminSessionId('not-a-jwt'), null);
});

test('matches only the exact 512-bit hexadecimal admin path', () => {
  const secret = 'a'.repeat(128);
  assert.equal(matchesAdminEntryPath('/' + secret, secret), true);
  assert.equal(matchesAdminEntryPath('/' + secret + '/', secret), false);
  assert.equal(matchesAdminEntryPath('/x' + secret, secret), false);
  assert.equal(matchesAdminEntryPath('/' + secret, 'a'.repeat(64)), false);
  assert.equal(matchesAdminEntryPath('/' + secret, ''), false);
});

test('uses the trusted Vercel client IP and the first forwarded address', () => {
  const req = {
    headers: {
      'x-vercel-forwarded-for': '203.0.113.10, 10.0.0.1',
      'x-forwarded-for': '198.51.100.5',
    },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage;
  assert.equal(getTrustedClientIp(req), '203.0.113.10');
});

test('falls back to a valid socket IP and rejects an unavailable client IP', () => {
  const fallback = {
    headers: { 'x-vercel-forwarded-for': 'not-an-ip' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage;
  assert.equal(getTrustedClientIp(fallback), '127.0.0.1');

  const missing = {
    headers: {},
    socket: { remoteAddress: undefined },
  } as unknown as IncomingMessage;
  assert.throws(() => getTrustedClientIp(missing), /Client IP unavailable/);
});

test('allows only HTTPS Web Push provider hosts', () => {
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/example'), true);
  assert.equal(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/example'), true);
  assert.equal(isAllowedPushEndpoint('https://web.push.apple.com/example'), true);
  assert.equal(isAllowedPushEndpoint('https://wns2.notify.windows.com/w/?token=example'), true);

  assert.equal(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/example'), false);
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com.attacker.invalid/send/example'), false);
  assert.equal(isAllowedPushEndpoint('https://127.0.0.1/latest/meta-data'), false);
  assert.equal(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isAllowedPushEndpoint('https://user@fcm.googleapis.com/fcm/send/example'), false);
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/fcm/send/example'), false);
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com:443/fcm/send/example'), false);
});

test('validates bounded Web Push key encodings', () => {
  assert.equal(isValidSubscriptionKey('A'.repeat(87), 40, 200), true);
  assert.equal(isValidSubscriptionKey('A'.repeat(22), 16, 100), true);
  assert.equal(isValidSubscriptionKey('short', 40, 200), false);
  assert.equal(isValidSubscriptionKey('A'.repeat(201), 40, 200), false);
  assert.equal(isValidSubscriptionKey('A'.repeat(87) + '<', 40, 200), false);
});
