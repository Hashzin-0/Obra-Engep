import { getSupabaseSession, isSupabaseConfigured, supabase } from '../lib/supabase';
import { recordPrivacyConsent } from './privacy';
import {
  deletePushSubscription,
  savePushSubscription,
} from './remoteRepository';

const functionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1`;

function base64UrlToBytes(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function authHeaders(accessToken?: string): HeadersInit {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function pushSupported(): boolean {
  return (
    isSupabaseConfigured &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(`${functionsUrl}/get-vapid-public-key`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao obter chave VAPID.');
  return data.publicKey;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<{ message: string }> {
  if (!pushSupported()) {
    throw new Error('Este navegador não suporta Web Push ou o Supabase não está configurado.');
  }

  const session = await getSupabaseSession();

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação não concedida.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await getVapidPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey) as BufferSource,
    });
  }

  try {
    await savePushSubscription(session.user.id, subscription.toJSON(), navigator.userAgent);

    if (supabase) {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: session.userId, enabled: true, reminders_enabled: true, updates_enabled: true },
          { onConflict: 'user_id' }
        );
      if (error) throw new Error(error.message);
    }

    await recordPrivacyConsent(session.userId, 'granted');
  } catch (error) {
    await deletePushSubscription(session.userId, subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe().catch(() => false);
    if (supabase) {
      try {
        await supabase.from('notification_preferences')
          .upsert({ user_id: session.userId, enabled: false }, { onConflict: 'user_id' });
      } catch {
        // The subscription has already been removed locally and remote cleanup was attempted.
      }
    }
    throw error;
  }

  return { message: 'Notificações ativadas neste dispositivo.' };
}

export async function disablePushNotifications(): Promise<{ message: string }> {
  const session = await getSupabaseSession();
  const subscription = await currentSubscription();

  if (subscription) {
    if (session) await deletePushSubscription(session.user.id, subscription.endpoint);
    await subscription.unsubscribe();
  }

  if (supabase && session) {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: session.userId, enabled: false }, { onConflict: 'user_id' });
    if (error) throw new Error('Notificações desativadas, mas não foi possível atualizar a preferência na conta.');
    try {
      await recordPrivacyConsent(session.userId, 'revoked');
    } catch {
      return { message: 'Notificações desativadas. O histórico da revogação não pôde ser sincronizado; tente novamente quando estiver online.' };
    }
  }

  return { message: 'Notificações desativadas neste dispositivo.' };
}

export async function sendTestPush(): Promise<{ sent: number; failed: number }> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const session = await getSupabaseSession();
  const token = session.access_token;

  const response = await fetch(`${functionsUrl}/send-test`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      title: 'Teste OBra ENGEP',
      body: 'Push recebido. Os lembretes de prazo usarão este mesmo canal.',
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Falha no envio de teste.');
  return { sent: result.sent ?? 0, failed: result.failed ?? 0 };
}

export async function subscriptionState(): Promise<boolean> {
  const subscription = await currentSubscription();
  return Boolean(subscription);
}
