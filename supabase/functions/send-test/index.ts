import { corsHeaders, isAllowedOrigin, json, readJsonLimited } from '../_shared/cors.ts';
import { adminClient, requireUser, userClient } from '../_shared/supabase.ts';
import { sendPush, type StoredSubscription } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return json({ error: 'Origem não autorizada.' }, 403, req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, req);
  if (req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type inválido.' }, 415, req);
  }

  try {
    const user = await requireUser(req);
    const { data: allowed, error: limitError } = await userClient(req).rpc('consume_user_action_rate_limit', {
      p_action: 'push_test',
    });
    if (limitError) return json({ error: 'Não foi possível validar o limite de notificações.' }, 503, req);
    if (allowed !== true) return json({ error: 'Limite de testes atingido. Tente novamente em um minuto.' }, 429, req);

    const parsed = await readJsonLimited(req, 4 * 1024);
    if (!parsed.ok) return json({ error: parsed.status === 413 ? 'Corpo da requisição excede 4 KB.' : 'JSON inválido.' }, parsed.status, req);

    const titleValue = parsed.value.title;
    const bodyValue = parsed.value.body;
    if (titleValue !== undefined && (typeof titleValue !== 'string' || titleValue.trim().length > 100)) {
      return json({ error: 'Título inválido.' }, 400, req);
    }
    if (bodyValue !== undefined && (typeof bodyValue !== 'string' || bodyValue.trim().length > 300)) {
      return json({ error: 'Mensagem inválida.' }, 400, req);
    }

    const admin = adminClient();
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', user.id)
      .limit(20);

    if (error) return json({ error: 'Não foi possível consultar os dispositivos.' }, 503, req);
    if (!subscriptions?.length) {
      return json({ error: 'Nenhum dispositivo inscrito. Ative as notificações primeiro.' }, 404, req);
    }

    const payload = {
      title: (typeof titleValue === 'string' && titleValue.trim()) ? titleValue.trim() : 'OBra ENGEP',
      body: (typeof bodyValue === 'string' && bodyValue.trim())
        ? bodyValue.trim()
        : 'Notificações configuradas com sucesso neste dispositivo.',
      url: '/',
      tag: 'obra-engep-test',
    };

    let sent = 0;
    let failed = 0;
    const gone: string[] = [];
    for (const subscription of subscriptions as StoredSubscription[]) {
      const result = await sendPush(subscription, payload);
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.gone) gone.push(subscription.id);
      }
    }

    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

    return json({
      sent,
      failed,
      removed: gone.length,
      truncated: subscriptions.length === 20,
    }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Sessão inválida') ? 401 : 500;
    return json({ error: status === 401 ? 'Sessão inválida.' : 'Falha no envio de teste.' }, status, req);
  }
});
