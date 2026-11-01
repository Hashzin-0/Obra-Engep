import { createHmac } from 'node:crypto';
import { env } from 'node:process';
import { ipAddress, next, rewrite } from '@vercel/functions';
import { matchesAdminEntryPath } from './api/admin/sessionSecurity';

export const config = { runtime: 'nodejs' };

const ADMIN_DOCUMENT_PATH = '/bd710978848ee759c9b7f24858aac90607361e767bda6c33.html';
const RATE_LIMIT_WINDOW_SECONDS = 30;

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store, private, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

function rateLimitResponse(status: 429 | 503, message: string): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store, private, max-age=0',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  if (status === 429) headers.set('Retry-After', '60');
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

async function enforceApiRateLimit(request: Request, pathname: string): Promise<Response | null> {
  const secret = env.API_RATE_LIMIT_HMAC_SECRET ?? '';
  const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
  const publishableKey = env.VITE_SUPABASE_ANON_KEY ?? '';
  const clientIp = ipAddress(request);

  if (Buffer.byteLength(secret, 'utf8') < 32 || !clientIp || !publishableKey) {
    return rateLimitResponse(503, 'Proteção temporariamente indisponível.');
  }

  let rpcUrl: URL;
  try {
    const baseUrl = new URL(supabaseUrl);
    if (baseUrl.protocol !== 'https:' || !baseUrl.hostname.endsWith('.supabase.co')) {
      return rateLimitResponse(503, 'Proteção temporariamente indisponível.');
    }
    rpcUrl = new URL('/rest/v1/rpc/consume_edge_api_rate_limit', baseUrl);
  } catch {
    return rateLimitResponse(503, 'Proteção temporariamente indisponível.');
  }

  const method = request.method.toUpperCase();
  const epoch = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  const payload = `${clientIp}\n${method}\n${pathname}\n${epoch}`;
  const signature = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_client_ip: clientIp,
        p_method: method,
        p_path: pathname,
        p_epoch: epoch,
        p_signature: signature,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      return rateLimitResponse(503, 'Proteção temporariamente indisponível.');
    }

    const allowed: unknown = await response.json();
    return allowed === true ? null : rateLimitResponse(429, 'Limite de requisições atingido. Aguarde um minuto.');
  } catch {
    return rateLimitResponse(503, 'Proteção temporariamente indisponível.');
  }
}

export default async function middleware(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  // The internal HTML document is never a public entry point.
  if (pathname === ADMIN_DOCUMENT_PATH) return notFound();

  const configuredPath = env.ADMIN_ENTRY_PATH_V2 ?? '';
  if (matchesAdminEntryPath(pathname, configuredPath)) {
    return rewrite(new URL(ADMIN_DOCUMENT_PATH, request.url));
  }

  // Every Vercel API route is rate-limited before its handler executes.
  if (pathname.startsWith('/api/')) {
    const rejected = await enforceApiRateLimit(request, pathname);
    if (rejected) return rejected;
    return next();
  }

  return notFound();
}
