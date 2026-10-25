import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { sendPush, type StoredSubscription } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();

    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', user.id);

    if (error) return json({ error: error.message }, 500);
    if (!subscriptions?.length) {
      return json({ error: 'Nenhum dispositivo inscrito. Ative as notificações primeiro.' }, 404);
    }

    const payload = {
      title: typeof body.title === 'string' && body.title ? body.title : 'OBra ENGEP',
      body:
        typeof body.body === 'string' && body.body
          ? body.body
          : 'Notificações configuradas com sucesso neste dispositivo.',
      url: '/',
      tag: 'obra-engep-test',
    };

    let sent = 0;
    const gone: string[] = [];
    const failures: string[] = [];

    for (const subscription of subscriptions as StoredSubscription[]) {
      const result = await sendPush(subscription, payload);
      if (result.ok) sent += 1;
      else {
        failures.push(result.error);
        if (result.gone) gone.push(subscription.id);
      }
    }

    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

    return json({ sent, failed: failures.length, removed: gone.length, failures });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Falha no envio de teste.' },
      401
    );
  }
});
