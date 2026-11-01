const allowedOrigins = new Set([
  'https://obra-engep.vercel.app',
  'https://obra-engep-aymatsu00-2333s-projects.vercel.app',
  'http://localhost:3000',
]);

function isApprovedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  return /^https:\/\/obra-engep-[a-z0-9-]+-aymatsu00-2333s-projects\.vercel\.app$/.test(origin);
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || isApprovedOrigin(origin);
}

export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && isApprovedOrigin(origin)
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

export type LimitedJsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 };

export async function readJsonLimited(req: Request, maxBytes: number): Promise<LimitedJsonResult> {
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413 };
  }

  const reader = req.body?.getReader();
  if (!reader) return { ok: true, value: {} };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400 };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400 };
  }
}
