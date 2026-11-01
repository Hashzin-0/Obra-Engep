import { corsHeaders, isAllowedOrigin, json, readJsonLimited } from '../_shared/cors.ts';
import { adminClient, requireAdmin, userClient } from '../_shared/supabase.ts';
import { sendPush, type StoredSubscription } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return json({ error: 'Origem não autorizada.' }, 403, req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, req);
  if (req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type inválido.' }, 415, req);
  }

  try {
    const user = await requireAdmin(req);
    const admin = adminClient();
    const forwardedIp = req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? null;
    const userAgent = req.headers.get('user-agent');
    if (!forwardedIp || !userAgent || userAgent.length > 512) {
      return json({ error: 'Não foi possível validar a origem da sessão.' }, 401, req);
    }

    const { data: sessionActive, error: sessionError } = await admin.rpc('admin_session_is_active', {
      p_user_id: user.id,
      p_session_id: user.sessionId,
      p_client_ip: forwardedIp,
      p_user_agent: userAgent,
    });
    if (sessionError || sessionActive !== true) {
      return json({ error: 'Sessão administrativa inválida ou revogada.' }, 401, req);
    }

    const { data: allowed, error: limitError } = await userClient(req).rpc('admin_consume_rate_limit', {
      p_action: 'broadcast',
    });
    if (limitError) return json({ error: 'Não foi possível validar o limite de publicação.' }, 503, req);
    if (allowed !== true) return json({ error: 'Limite de publicações atingido. Tente novamente em um minuto.' }, 429, req);

    const parsed = await readJsonLimited(req, 16 * 1024);
    if (!parsed.ok) return json({ error: parsed.status === 413 ? 'Corpo da requisição excede 16 KB.' : 'JSON inválido.' }, parsed.status, req);

    const title = typeof parsed.value.title === 'string' ? parsed.value.title.trim() : '';
    const message = typeof parsed.value.body === 'string' ? parsed.value.body.trim() : '';
    const versionValue = parsed.value.version;
    if (!title || title.length > 120 || !message || message.length > 1200) {
      return json({ error: 'Título (1–120) e mensagem (1–1200 caracteres) são obrigatórios.' }, 400, req);
    }
    if (versionValue !== undefined && versionValue !== null && (typeof versionValue !== 'string' || versionValue.length > 40)) {
      return json({ error: 'Versão inválida.' }, 400, req);
    }

    const { data: update, error: insertError } = await admin
      .from('app_updates')
      .insert({ title, body: message, version: versionValue ?? null, created_by: user.id })
      .select('id, published_at')
      .single();

    if (insertError || !update) return json({ error: 'Não foi possível registrar a atualização.' }, 500, req);

    const { data: subscriptions, error: subscriptionError } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .limit(1000);
    if (subscriptionError) return json({ error: 'Não foi possível carregar as inscrições de notificação.' }, 503, req);

    let sent = 0;
    let failed = 0;
    const gone: string[] = [];
    for (const subscription of (subscriptions ?? []) as StoredSubscription[]) {
      const result = await sendPush(subscription, {
        title,
        body: message,
        url: '/',
        tag: `update-${update.id}`,
      });
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.gone) gone.push(subscription.id);
      }
    }

    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

    return json({
      updateId: update.id,
      sent,
      failed,
      removed: gone.length,
      truncated: (subscriptions?.length ?? 0) === 1000,
    }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Sessão inválida') ? 401 : message.includes('administrativo') ? 403 : 500;
    return json({
      error: status === 401 ? 'Sessão inválida.' : status === 403 ? 'Acesso administrativo necessário.' : 'Falha ao publicar atualização.',
    }, status, req);
  }
});
