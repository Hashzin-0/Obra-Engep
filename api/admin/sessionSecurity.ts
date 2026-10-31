import { createHmac } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import { env } from 'node:process';
import type { IncomingMessage } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAdminSessionId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.session_id === 'string' && UUID_PATTERN.test(payload.session_id)
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}

export function getTrustedClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-vercel-forwarded-for'] ?? req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate = typeof forwardedValue === 'string'
    ? forwardedValue.split(',')[0].trim()
    : '';
  if (candidate && isIP(candidate)) return candidate;

  const socketIp = req.socket?.remoteAddress ?? '';
  if (socketIp && isIP(socketIp)) return socketIp;
  throw new Error('Client IP unavailable.');
}

function fingerprints(req: IncomingMessage): { ip: string; userAgent: string } {
  const secret = env.ADMIN_SESSION_FINGERPRINT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Admin session fingerprint secret is not configured.');
  }

  const userAgent = typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent'].trim()
    : '';
  if (!userAgent || userAgent.length > 512) {
    throw new Error('Client user-agent is unavailable or invalid.');
  }

  const ip = getTrustedClientIp(req);
  const hash = (value: string) => createHmac('sha256', secret).update(value, 'utf8').digest('hex');
  return {
    ip: hash('ip:' + ip),
    userAgent: hash('ua:' + userAgent),
  };
}

export async function validateAdminSession(
  client: SupabaseClient,
  sessionId: string,
  req: IncomingMessage
): Promise<boolean> {
  const value = fingerprints(req);
  const { data, error } = await client.rpc('admin_validate_session', {
    p_session_id: sessionId,
    p_ip_fingerprint: value.ip,
    p_user_agent_fingerprint: value.userAgent,
  });
  if (error) throw new Error('Admin session validation failed.');
  return data === true;
}

export async function revokeAdminSession(
  client: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await client.rpc('admin_revoke_session', {
    p_session_id: sessionId,
  });
  if (error) throw new Error('Admin session revocation failed.');
}
