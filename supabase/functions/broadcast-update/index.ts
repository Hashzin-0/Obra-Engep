import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { sendPush, type StoredSubscription } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const adminSecret = Deno.env.get('ADMIN_SECRET');
  if (!adminSecret || req.headers.get('x-admin-secret') !== adminSecret) {
    return json({ error: 'Não autorizado.' }, 401);
  }

  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.body === 'string' ? body.body.trim() : '';
    if (!title || !message) return json({ error: 'Informe title e body.' }, 400);

    const admin = adminClient();
    const version = typeof body.version === 'string' ? body.version : null;

    const { data: update, error: insertError } = await admin
      .from('app_updates')
      .insert({ title, body: message, version, created_by: user.id })
      .select('id, published_at')
      .single();

    if (insertError) return json({ error: insertError.message }, 500);

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth');

    let sent = 0;
    const gone: string[] = [];
    const failures: string[] = [];

    for (const subscription of (subscriptions ?? []) as StoredSubscription[]) {
      const result = await sendPush(subscription, {
        title,
        body: message,
        url: '/',
        tag: `update-${update.id}`,
      });
      if (result.ok) sent += 1;
      else {
        failures.push(result.error);
        if (result.gone) gone.push(subscription.id);
      }
    }

    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

    return json({ updateId: update.id, sent, removed: gone.length, failures });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Falha ao publicar atualização.' },
      400
    );
  }
});
