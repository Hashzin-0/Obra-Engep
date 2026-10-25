import { corsHeaders, json } from '../_shared/cors.ts';
import { publicVapidKey } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    return json({ publicKey: await publicVapidKey() });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Falha ao obter chave VAPID.' },
      503
    );
  }
});
