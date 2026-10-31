import {
  ApplicationServer,
  exportApplicationServerKey,
  importVapidKeys,
  PushMessageError,
  Urgency,
  type ExportedVapidKeys,
} from 'jsr:@negrel/webpush@^0.5.0';
import { isAllowedPushEndpoint, isValidSubscriptionKey } from './pushValidation.ts';

export interface StoredSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

let cachedServer: ApplicationServer | null = null;

function readKeys(): ExportedVapidKeys {
  const raw = Deno.env.get('VAPID_KEYS');
  if (!raw) throw new Error('VAPID_KEYS não configurado nas Edge Functions.');
  try {
    return JSON.parse(raw) as ExportedVapidKeys;
  } catch {
    throw new Error('VAPID_KEYS deve ser o JSON exportado por exportVapidKeys().');
  }
}

export async function applicationServer(): Promise<ApplicationServer> {
  if (cachedServer) return cachedServer;
  cachedServer = await ApplicationServer.new({
    vapidKeys: await importVapidKeys(readKeys()),
    contactInformation: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@example.com',
  });
  return cachedServer;
}

export async function publicVapidKey(): Promise<string> {
  const server = await applicationServer();
  return exportApplicationServerKey(server.vapidKeys);
}

export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> {
  if (
    !isAllowedPushEndpoint(subscription.endpoint)
    || !isValidSubscriptionKey(subscription.p256dh, 40, 200)
    || !isValidSubscriptionKey(subscription.auth, 16, 100)
  ) {
    return { ok: false, gone: false, error: 'Invalid push subscription.' };
  }

  try {
    const server = await applicationServer();
    const subscriber = server.subscribe({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    });
    await subscriber.pushTextMessage(JSON.stringify(payload), {
      ttl: 86400,
      urgency: Urgency.High,
      topic: payload.tag?.slice(0, 32) ?? 'obra-engep',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof PushMessageError) {
      return { ok: false, gone: error.isGone(), error: 'Push delivery failed.' };
    }
    return {
      ok: false,
      gone: false,
      error: 'Push delivery failed.',
    };
  }
}
