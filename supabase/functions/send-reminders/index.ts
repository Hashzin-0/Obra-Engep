import { json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';
import { sendPush, type StoredSubscription } from '../_shared/push.ts';

interface Deadline {
  id: string;
  user_id: string;
  project_name: string | null;
  title: string;
  description: string;
  due_date: string;
  due_time: string | null;
  timezone: string;
  priority: string;
  reminder_minutes_before: number;
}

function currentMinutes(timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function toMinutes(value: string | null): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function inQuietHours(
  timezone: string,
  start: string | null,
  end: string | null
): boolean {
  const now = currentMinutes(timezone);
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (now === null || from === null || to === null || from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

Deno.serve(async (req) => {
  if (req.headers.has('origin')) return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, req);

  const secret = Deno.env.get('CRON_SECRET');
  const authorization = req.headers.get('Authorization') ?? '';
  if (!secret || authorization !== `Bearer ${secret}`) {
    return json({ error: 'Não autorizado.' }, 401, req);
  }

  try {
    const admin = adminClient();
    const { data: deadlines, error } = await admin.rpc('claim_due_deadlines');
    if (error) return json({ error: 'Falha ao consultar prazos.' }, 500, req);

    let sent = 0;
    let skipped = 0;
    const gone: string[] = [];
    let failed = 0;

    for (const deadline of (deadlines ?? []) as Deadline[]) {
      const { data: preferences } = await admin
        .from('notification_preferences')
        .select('enabled, reminders_enabled, quiet_hours_start, quiet_hours_end, timezone')
        .eq('user_id', deadline.user_id)
        .maybeSingle();

      if (
        !preferences?.enabled ||
        !preferences.reminders_enabled ||
        inQuietHours(
          preferences.timezone || deadline.timezone,
          preferences.quiet_hours_start,
          preferences.quiet_hours_end
        )
      ) {
        await admin.from('deadlines').update({ notified_at: null }).eq('id', deadline.id);
        skipped += 1;
        continue;
      }

      const { data: subscriptions } = await admin
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .eq('user_id', deadline.user_id);

      if (!subscriptions?.length) {
        await admin.from('deadlines').update({ notified_at: null }).eq('id', deadline.id);
        skipped += 1;
        continue;
      }

      const time = deadline.due_time?.slice(0, 5) ?? '09:00';
      const payload = {
        title: `Prazo: ${deadline.title}`,
        body: `${deadline.project_name ? `${deadline.project_name} · ` : ''}${deadline.due_date} às ${time}${deadline.description ? ` · ${deadline.description.slice(0, 120)}` : ''}`,
        url: '/',
        tag: `deadline-${deadline.id}`,
        requireInteraction: deadline.priority === 'alta',
      };

      let delivered = false;
      for (const subscription of subscriptions as StoredSubscription[]) {
        const result = await sendPush(subscription, payload);
        if (result.ok) {
          sent += 1;
          delivered = true;
        } else {
          failed += 1;
          if (result.gone) gone.push(subscription.id);
        }
      }

      if (!delivered) {
        await admin.from('deadlines').update({ notified_at: null }).eq('id', deadline.id);
      }
    }

    if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);

    return json({ claimed: deadlines?.length ?? 0, sent, failed, skipped, removed: gone.length }, 200, req);
  } catch (error) {
    return json(
      { error: 'Falha ao enviar lembretes.' },
      500,
      req
    );
  }
});
