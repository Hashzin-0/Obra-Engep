import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  resolveGeminiLiveModel,
  toGeminiLiveModelResource,
} from '../../../../src/utils/geminiLiveConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIVE_WS_BASE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;

  try {
    const parsed = new URL(origin);
    const requestHost = host.split(',')[0].trim().toLowerCase();
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.host.toLowerCase() === requestHost
      && (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'));
  } catch {
    return false;
  }
}

async function hasValidSession(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!accessToken || accessToken.split('.').length !== 3 || !supabaseUrl || !supabaseKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  return !error && Boolean(data.user);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  }

  if (!(await hasValidSession(request))) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada. Entre novamente.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'O serviço Gemini Live não está configurado no servidor.' },
      { status: 503 }
    );
  }

  const model = resolveGeminiLiveModel(process.env.GEMINI_LIVE_MODEL);
  const now = Date.now();
  const expiresAt = new Date(now + 30 * 60_000).toISOString();

  try {
    // Use the same official SDK token flow as the known-good N-simple implementation.
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1beta' },
    });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: expiresAt,
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
      },
    });

    if (!token.name) {
      throw new Error('Google returned an empty Gemini Live ephemeral token.');
    }

    console.info('[Gemini Live] Ephemeral token provisioned.', { model });
    return NextResponse.json(
      {
        token: token.name,
        expiresAt,
        model: toGeminiLiveModelResource(model),
        wsBaseUrl: LIVE_WS_BASE_URL,
        voice: 'Puck',
      },
      { headers: { 'Cache-Control': 'no-store, private, max-age=0' } }
    );
  } catch (error) {
    console.error(
      '[Gemini Live] Ephemeral token provisioning failed:',
      error instanceof Error ? error.name : 'unknown'
    );
    return NextResponse.json(
      { error: 'Não foi possível preparar a sessão Gemini Live. Verifique o acesso ao modelo e tente novamente.' },
      { status: 502, headers: { 'Cache-Control': 'no-store, private, max-age=0' } }
    );
  }
}
