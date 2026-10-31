const allowedOrigins = new Set([
  'https://obra-engep.vercel.app',
  'http://localhost:3000',
]);

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || allowedOrigins.has(origin);
}

export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin)
      ? origin
      : 'https://obra-engep.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
