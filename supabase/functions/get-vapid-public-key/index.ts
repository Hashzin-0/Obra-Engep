import { corsHeaders, isAllowedOrigin, json } from '../_shared/cors.ts';
import { publicVapidKey } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return json({ error: 'Origem não autorizada.' }, 403, req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'GET') return json({ error: 'Método não permitido.' }, 405, req);

  try {
    const publicKey = await publicVapidKey();
    return new Response(JSON.stringify({ publicKey }), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return json({ error: 'Falha ao obter a chave pública de notificações.' }, 503, req);
  }
});
