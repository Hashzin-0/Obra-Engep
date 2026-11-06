import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';
import { createClient } from '@supabase/supabase-js';

type AuthenticatedRequest = IncomingMessage & { body?: unknown };

export const config = { maxDuration: 30 };

function respond(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function hasSameOrigin(req: AuthenticatedRequest): boolean {
  const origin = req.headers.origin;
  const host = typeof req.headers.host === 'string' ? req.headers.host.toLowerCase() : '';
  if (typeof origin !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.host.toLowerCase() === host
      && (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'));
  } catch {
    return false;
  }
}

async function hasValidSession(req: AuthenticatedRequest): Promise<boolean> {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const accessToken = authorization.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/i)?.[1];
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!accessToken || accessToken.split('.').length !== 3 || !supabaseUrl || !supabaseKey) return false;

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: 'Bearer ' + accessToken } },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  return !error &...[truncated]