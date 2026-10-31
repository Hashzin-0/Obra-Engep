import { rewrite } from '@vercel/functions';
import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const config = { runtime: 'nodejs' };

const ADMIN_DOCUMENT_PATH = '/bd710978848ee759c9b7f24858aac90607361e767bda6c33.html';
const ROUTE_PATTERN = /^[a-f0-9]{128}$/;

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

function matchesSecretPath(pathname: string, configuredPath: string): boolean {
  if (!ROUTE_PATTERN.test(configuredPath)) return false;
  const expected = Buffer.from('/' + configuredPath, 'utf8');
  const received = Buffer.from(pathname, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export default function middleware(request: Request): Response {
  const pathname = new URL(request.url).pathname;

  // The internal HTML document is never a public entry point.
  if (pathname === ADMIN_DOCUMENT_PATH) return notFound();

  const configuredPath = process.env.ADMIN_ENTRY_PATH ?? '';
  if (!matchesSecretPath(pathname, configuredPath)) return notFound();

  return rewrite(new URL(ADMIN_DOCUMENT_PATH, request.url));
}
