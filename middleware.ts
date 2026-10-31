import { rewrite } from '@vercel/functions';
import { matchesAdminEntryPath } from './api/admin/sessionSecurity';

export const config = { runtime: 'nodejs' };

const ADMIN_DOCUMENT_PATH = '/bd710978848ee759c9b7f24858aac90607361e767bda6c33.html';
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

export default function middleware(request: Request): Response {
  const pathname = new URL(request.url).pathname;

  // The internal HTML document is never a public entry point.
  if (pathname === ADMIN_DOCUMENT_PATH) return notFound();

  const configuredPath = process.env.ADMIN_ENTRY_PATH_V2 ?? '';
  if (!matchesAdminEntryPath(pathname, configuredPath)) return notFound();

  return rewrite(new URL(ADMIN_DOCUMENT_PATH, request.url));
}
