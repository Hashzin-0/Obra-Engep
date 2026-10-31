import { Buffer } from 'node:buffer';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';
import { createClient, type User } from '@supabase/supabase-js';

type AdminRequest = IncomingMessage & { body?: unknown; query?: Record<string, string | string[] | undefined> };
export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

const COOKIE_NAME = '__Host-obra-admin';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 32 * 1024;
type FeedbackStatus = 'aberto' | 'em_analise' | 'resolvido';

function json(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function getCookie(req: AdminRequest): string | null {
  const header = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const item = header.split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith(`${COOKIE_NAME}=`));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(COOKIE_NAME.length + 1)); } catch { return null; }
}

function sameOrigin(req: AdminRequest): boolean {
  const origin = req.headers.origin;
  const host = typeof req.headers.host === 'string' ? req.headers.host.split(',')[0].trim().toLowerCase() : '';
  if (typeof origin !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.host.toLowerCase() === host;
  } catch { return false; }
}

function getClient(token: string) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyAdmin(req: AdminRequest): Promise<{ client: ReturnType<typeof getClient>; user: User } | null> {
  const token = getCookie(req);
  if (!token || token.length > 4096 || token.split('.').length !== 3) return null;
  const client = getClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.app_metadata?.is_admin !== true) return null;
  return { client, user: data.user };
}

async function consumeLimit(client: ReturnType<typeof getClient>, action: 'read' | 'write') {
  const { data, error } = await client.rpc('admin_consume_rate_limit', { p_action: action });
  if (error) throw new Error('Rate limit service unavailable.');
  return data === true;
}

function readBody(req: AdminRequest): Record<string, unknown> | null {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const serialized = JSON.stringify(body);
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) return null;
  return body as Record<string, unknown>;
}

function cleanText(value: unknown, max: number, required = false): string | null {
  if (value === undefined || value === null) return required ? null : '';
  if (typeof value !== 'string') return null;
  const result = value.trim();
  if ((required && !result) || result.length > max) return null;
  return result;
}

function safeHttpsUrl(value: unknown): string | null {
  if (value === null || value === '' || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '127.0.0.1' || host === '::1') return null;
    return url.toString();
  } catch { return null; }
}

function cleanStringArray(value: unknown, itemMax: number, maxItems: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items: string[] = [];
  for (const item of value) {
    const clean = cleanText(item, itemMax);
    if (clean === null) return null;
    if (clean) items.push(clean);
  }
  return items;
}

function validDate(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function productPayload(body: Record<string, unknown>) {
  const name = cleanText(body.name, 180, true);
  const categoryValue = cleanText(body.category, 80);
  const category = categoryValue || 'Geral';
  const manufacturer = cleanText(body.manufacturer, 120);
  const ph = body.ph_type;
  const dilutionRatio = cleanText(body.dilution_ratio, 120);
  const actionTime = cleanText(body.action_time_minutes, 120);
  const yieldInfo = cleanText(body.yield_info, 500);
  const instructions = cleanText(body.instructions, 10000);
  const cautions = cleanStringArray(body.cautions, 500, 30);
  const surfaces = cleanStringArray(body.target_surfaces, 100, 30);
  const sourceLabel = cleanText(body.source_label, 240);
  const sourceUrl = safeHttpsUrl(body.source_url);
  const imageUrl = safeHttpsUrl(body.image_url);
  const verifiedDate = body.verified_date === null || body.verified_date === '' ? null : validDate(body.verified_date);
  const dilutionNumber = Number(body.dilution_number);
  const sortOrder = Number(body.sort_order ?? 0);
  if (!name || categoryValue === null || manufacturer === null || typeof ph !== 'string' || !['Neutro', 'Ácido', 'Alcalino', 'Não informado'].includes(ph)) return null;
  if (dilutionRatio === null || actionTime === null || yieldInfo === null || instructions === null || !cautions || !surfaces || sourceLabel === null) return null;
  if (body.source_url !== undefined && body.source_url !== null && body.source_url !== '' && !sourceUrl) return null;
  if (body.image_url !== undefined && body.image_url !== null && body.image_url !== '' && !imageUrl) return null;
  if (body.verified_date && !verifiedDate) return null;
  if (!Number.isFinite(dilutionNumber) || dilutionNumber < 0.0001 || dilutionNumber > 1000000) return null;
  if (!Number.isInteger(sortOrder) || sortOrder < -10000 || sortOrder > 10000) return null;
  if (typeof body.is_published !== 'boolean') return null;

  return {
    name, category, manufacturer, ph_type: ph, target_surfaces: surfaces,
    dilution_ratio: dilutionRatio, dilution_number: dilutionNumber,
    action_time_minutes: actionTime, yield_info: yieldInfo, instructions,
    cautions, source_label: sourceLabel, source_url: sourceUrl, image_url: imageUrl,
    verified_date: verifiedDate, is_published: body.is_published,
    sort_order: sortOrder, updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: AdminRequest, res: ServerResponse) {
  const method = req.method ?? '';
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', 'GET, POST');

  if (!['GET', 'POST'].includes(method)) return json(res, 405, { error: 'Método não permitido.' });
  if (method === 'POST' && !sameOrigin(req)) return json(res, 403, { error: 'Origem não autorizada.' });
  if (method === 'POST' && !String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, { error: 'Tipo de conteúdo não permitido.' });
  if (method === 'POST') {
    const lengthHeader = req.headers['content-length'];
    const length = typeof lengthHeader === 'string' ? Number(lengthHeader) : 0;
    if (length > MAX_BODY_BYTES) return json(res, 413, { error: 'Requisição muito grande.' });
  }

  try {
    const verified = await verifyAdmin(req);
    if (!verified) return json(res, 401, { error: 'Sessão administrativa ausente, inválida ou expirada.' });

    if (!(await consumeLimit(verified.client, method === 'GET' ? 'read' : 'write'))) {
      return json(res, 429, { error: 'Limite de requisições atingido. Aguarde um minuto.' });
    }

    if (method === 'GET') {
      const resource = typeof req.query?.resource === 'string' ? req.query.resource : '';
      if (resource === 'stats') {
        const { data, error } = await verified.client.rpc('admin_dashboard_stats');
        if (error) throw error;
        return json(res, 200, { data: data ?? {} });
      }
      if (resource === 'feedback') {
        const { data, error } = await verified.client.from('feedback')
          .select('id,user_id,message,contact_email,page,status,created_at')
          .order('created_at', { ascending: false }).limit(250);
        if (error) throw error;
        return json(res, 200, { data: data ?? [] });
      }
      if (resource === 'products') {
        const { data, error } = await verified.client.from('automotive_catalog').select('*')
          .order('sort_order', { ascending: true }).order('name', { ascending: true }).limit(500);
        if (error) throw error;
        return json(res, 200, { data: data ?? [] });
      }
      if (resource === 'users') {
        const { data, error } = await verified.client.from('profiles')
          .select('id,display_name,profession,company,created_at')
          .order('created_at', { ascending: false }).limit(12);
        if (error) throw error;
        return json(res, 200, { data: data ?? [] });
      }
      return json(res, 400, { error: 'Recurso inválido.' });
    }

    const body = readBody(req);
    if (!body || typeof body.action !== 'string') return json(res, 400, { error: 'Dados inválidos ou acima do limite.' });

    if (body.action === 'update_feedback') {
      if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id) || typeof body.status !== 'string' || !['aberto', 'em_analise', 'resolvido'].includes(body.status)) {
        return json(res, 400, { error: 'Dados do feedback inválidos.' });
      }
      const { data, error } = await verified.client.from('feedback')
        .update({ status: body.status as FeedbackStatus }).eq('id', body.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return json(res, 404, { error: 'Feedback não encontrado.' });
      return json(res, 200, { ok: true });
    }

    if (body.action === 'delete_feedback' || body.action === 'delete_product') {
      if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id)) return json(res, 400, { error: 'Identificador inválido.' });
      const table = body.action === 'delete_feedback' ? 'feedback' : 'automotive_catalog';
      const { data, error } = await verified.client.from(table).delete().eq('id', body.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return json(res, 404, { error: 'Registro não encontrado.' });
      return json(res, 200, { ok: true });
    }

    if (body.action === 'save_product') {
      const product = body.product;
      if (!product || typeof product !== 'object' || Array.isArray(product)) return json(res, 400, { error: 'Ficha de produto inválida.' });
      const productData = product as Record<string, unknown>;
      const payload = productPayload(productData);
      if (!payload) return json(res, 400, { error: 'Ficha de produto inválida. Revise os campos e URLs HTTPS.' });
      const id = productData.id;
      if (id !== undefined && (typeof id !== 'string' || !UUID_PATTERN.test(id))) return json(res, 400, { error: 'Identificador do produto inválido.' });
      const query = id
        ? verified.client.from('automotive_catalog').update(payload).eq('id', id).select('id').maybeSingle()
        : verified.client.from('automotive_catalog').insert({ ...payload, created_by: verified.user.id }).select('id').single();
      const { data, error } = await query;
      if (error) throw error;
      if (!data) return json(res, 404, { error: 'Produto não encontrado.' });
      return json(res, 200, { ok: true, id: data.id });
    }

    if (body.action === 'toggle_published') {
      if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id) || typeof body.is_published !== 'boolean') {
        return json(res, 400, { error: 'Dados de publicação inválidos.' });
      }
      const { data, error } = await verified.client.from('automotive_catalog')
        .update({ is_published: body.is_published, updated_at: new Date().toISOString() })
        .eq('id', body.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return json(res, 404, { error: 'Produto não encontrado.' });
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: 'Ação inválida.' });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : 'unknown';
    console.error('Admin data endpoint failed:', code);
    return json(res, 500, { error: 'Não foi possível concluir a operação administrativa.' });
  }
}
