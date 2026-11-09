import { Buffer } from 'node:buffer';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

type GeminiRequest = IncomingMessage & { body?: unknown };
type GeminiBody = { prompt?: unknown };

export const config = {
  maxDuration: 60,
  api: { bodyParser: { sizeLimit: '128kb' } },
};

const SYSTEM_INSTRUCTION = `Você é o Assistente Técnico do OBra ENGEP (obras, instalações prediais, segurança e estética automotiva).
Diretrizes:
1. Detecte automaticamente o idioma da mensagem atual do usuário e responda no mesmo idioma, com naturalidade e terminologia técnica adequada. Não force português: acompanhe imediatamente mudanças de idioma e não traduza, a menos que solicitado.
2. Cite as normas aplicáveis (NBR 5410, NBR 5626, NBR 6118, NBR 15575, NR-06, NR-10, NR-12, NR-18, NR-33, NR-35) sem reproduzir textos protegidos.
3. Mostre premissas, fórmula, unidades e limitações dos cálculos.
4. Em risco elétrico, trabalho em altura ou espaço confinado, reforce desenergização, LOTO, AR/PT, EPI/EPC e resgate.
5. Não invente valores de norma, laudos, produtos, contatos ou dados pessoais. Quando faltar dado ou acesso, declare a limitação claramente.`;

function json(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function sameOrigin(req: GeminiRequest): boolean {
  const origin = req.headers.origin;
  const host = typeof req.headers.host === 'string' ? req.headers.host.toLowerCase() : '';
  if (typeof origin !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.host.toLowerCase() === host && (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'));
  } catch {
    return false;
  }
}

async function authenticate(req: GeminiRequest): Promise<boolean> {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const token = authorization.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/i)?.[1];
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL);
  const key = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY);
  if (!token || token.split('.').length !== 3 || !url || !key) return false;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

function writeEvent(res: ServerResponse, payload: Record<string, unknown>) {
  if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: GeminiRequest, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'Origem não autorizada.' });
  if (!(await authenticate(req))) return json(res, 401, { error: 'Sessão inválida ou expirada. Entre novamente.' });

  const body = req.body as GeminiBody | undefined;
  const prompt = body && typeof body === 'object' && !Array.isArray(body) ? body.prompt : undefined;
  if (typeof prompt !== 'string' || !prompt.trim()) return json(res, 400, { error: 'Prompt é obrigatório.' });
  if (Buffer.byteLength(prompt, 'utf8') > 96 * 1024 || prompt.length > 24_000) {
    return json(res, 413, { error: 'O texto enviado excede o limite permitido.' });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'O assistente está indisponível no momento.' });

  const ai = new GoogleGenAI({ apiKey });
  const model = env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
  const abortController = new AbortController();
  let disconnected = false;
  const timeout = setTimeout(() => {
    disconnected = true;
    abortController.abort();
    writeEvent(res, { type: 'error', error: 'Tempo máximo de resposta excedido.' });
    if (!res.writableEnded) res.end();
  }, 55_000);

  res.on('close', () => {
    if (!res.writableEnded) {
      disconnected = true;
      abortController.abort();
    }
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 2048 },
        maxOutputTokens: 2048,
        automaticContinuation: false,
        abortSignal: abortController.signal,
      },
    });

    for await (const chunk of stream) {
      if (disconnected || res.writableEnded || res.destroyed) break;
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (disconnected || res.writableEnded || res.destroyed) break;
        if ((part as { thought?: boolean }).thought) {
          writeEvent(res, { type: 'thought', text: part.text || '' });
        } else if (part.text) {
          writeEvent(res, { type: 'text', text: part.text });
        }
      }
    }

    if (!disconnected && !res.writableEnded && !res.destroyed) {
      writeEvent(res, { type: 'done' });
      res.end();
    }
  } catch (error) {
    const apiError = error as { status?: unknown; message?: unknown };
    const status = typeof apiError?.status === 'number' ? apiError.status : undefined;
    const rawMessage = typeof apiError?.message === 'string' ? apiError.message : 'Erro não identificado do provedor.';
    const safeMessage = rawMessage.replaceAll(apiKey, '[REDACTED]').replace(/\\s+/g, ' ').slice(0, 400);
    console.error('[Gemini API] Request failed.', { status, model, message: safeMessage });

    let publicMessage = 'Falha temporária no processamento da IA. Tente novamente.';
    if (status === 400) publicMessage = 'O Gemini rejeitou a solicitação. A configuração ou o conteúdo enviado não foi aceito.';
    else if (status === 401 || status === 403) publicMessage = 'O Gemini recusou a autenticação ou a permissão desta solicitação.';
    else if (status === 404) publicMessage = 'O modelo de texto configurado não está disponível para esta chave.';
    else if (status === 429) publicMessage = 'O limite de uso do Gemini foi atingido. Aguarde e tente novamente.';
    else if (status === 500 || status === 502 || status === 503) publicMessage = 'O serviço Gemini está temporariamente indisponível. Tente novamente.';

    if (!disconnected && !res.writableEnded && !res.destroyed) {
      writeEvent(res, { type: 'error', error: publicMessage });
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
}
