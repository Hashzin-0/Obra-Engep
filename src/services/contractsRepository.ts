import type { GeneratedContract } from '../types';
import { supabase } from '../lib/supabase';

function client() {
  if (!supabase) throw new Error('Sincronização indisponível: configure o Supabase para salvar documentos na conta.');
  return supabase;
}

interface ContractRow {
  id: string;
  model_id: string;
  title: string;
  content: string;
  fields: unknown;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ContractRow): GeneratedContract {
  const fields = row.fields && typeof row.fields === 'object' && !Array.isArray(row.fields)
    ? row.fields as Record<string, string>
    : {};
  return {
    id: row.id, modelId: row.model_id, title: row.title, content: row.content,
    fields, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listContracts(): Promise<GeneratedContract[]> {
  const db = client();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const sessionUser = sessionData.session?.user;
  if (!sessionUser || sessionUser.is_anonymous) return [];
  const userId = sessionUser.id;
  const { data, error } = await db.from('legal_contracts').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function saveContract(contract: GeneratedContract): Promise<void> {
  const db = client();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const sessionUser = sessionData.session?.user;
  if (!sessionUser || sessionUser.is_anonymous) throw new Error('Entre com sua conta Google para salvar documentos jurídicos com segurança.');
  const userId = sessionUser.id;
  const { error } = await db.from('legal_contracts').upsert({
    id: contract.id, user_id: userId, model_id: contract.modelId, title: contract.title,
    content: contract.content, fields: contract.fields, created_at: contract.createdAt, updated_at: contract.updatedAt,
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteContract(id: string): Promise<void> {
  const db = client();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const sessionUser = sessionData.session?.user;
  if (!sessionUser || sessionUser.is_anonymous) throw new Error('Entre com sua conta Google para excluir documentos salvos.');
  const userId = sessionUser.id;
  const { error } = await db.from('legal_contracts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}
