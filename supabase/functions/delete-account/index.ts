import { corsHeaders, isAllowedOrigin, json, readJsonLimited } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

const BUCKET = 'user-media';
const PAGE_SIZE = 100;

async function collectUserStoragePaths(
  admin: ReturnType<typeof adminClient>,
  userId: string
): Promise<string[]> {
  const queue = [userId];
  const visited = new Set<string>();
  const objectPaths: string[] = [];

  while (queue.length) {
    const prefix = queue.shift()!;
    if (visited.has(prefix)) continue;
    visited.add(prefix);

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error('Não foi possível verificar os arquivos da conta.');

      const entries = data ?? [];
      for (const entry of entries) {
        if (!entry.name) continue;
        const path = `${prefix}/${entry.name}`;
        if (entry.id) objectPaths.push(path);
        else queue.push(path);
      }
      if (entries.length < PAGE_SIZE) break;
    }

    if (visited.size > 10000 || objectPaths.length > 100000) {
      throw new Error('A conta excede o limite seguro de arquivos para exclusão automática.');
    }
  }

  return objectPaths;
}

async function removeUserStorage(
  admin: ReturnType<typeof adminClient>,
  userId: string
): Promise<number> {
  const paths = await collectUserStoragePaths(admin, userId);
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const batch = paths.slice(offset, offset + 1000);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) throw new Error('Não foi possível remover todos os arquivos privados da conta.');
  }
  return paths.length;
}

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return json({ error: 'Origem não autorizada.' }, 403, req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, req);
  if (req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type inválido.' }, 415, req);
  }

  const parsed = await readJsonLimited(req, 2048);
  if (!parsed.ok) {
    return json({ error: parsed.status === 413 ? 'Requisição excede 2 KB.' : 'JSON inválido.' }, parsed.status, req);
  }

  try {
    const user = await requireUser(req);
    if (parsed.value.confirmation !== 'DELETE_ACCOUNT' || parsed.value.userId !== user.id) {
      return json({ error: 'Confirmação de exclusão inválida.' }, 400, req);
    }

    const admin = adminClient();
    const storageObjectsRemoved = await removeUserStorage(admin, user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !authorization) {
      return json({ error: 'Configuração de autenticação indisponível.' }, 503, req);
    }

    const signOutResponse = await fetch(`${supabaseUrl}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!signOutResponse.ok) {
      return json({ error: 'Não foi possível invalidar as sessões da conta. Nenhum registro foi excluído.' }, 503, req);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      console.error('[delete-account] Auth deletion failed:', deleteError.message);
      return json({
        error: 'As sessões foram encerradas, mas a exclusão da conta não foi concluída. Entre novamente e tente de novo.',
        storageObjectsRemoved,
      }, 503, req);
    }

    return json({ success: true, storageObjectsRemoved }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Sessão inválida') ? 401 : 503;
    if (status !== 401) console.error('[delete-account] Request failed:', message);
    return json({ error: status === 401 ? 'Sessão inválida.' : (message || 'Não foi possível concluir a exclusão.') }, status, req);
  }
});
