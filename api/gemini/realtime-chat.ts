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
1. Responda em português do Brasil, com rigor técnico e linguagem de campo.
2. Cite as normas aplicáveis (NBR 5410, NBR 5626, NBR 6118, NBR 15575, NR-06, NR-10, NR-12, NR-18, NR-33, NR-35) sem reproduzir textos protegidos.
3. Mostre premissas, fórmula e limitações do cálculo.
4. Em risco elétrico, trabalho em altura ou espaço confinado, reforce desenergização, LOTO, AR/PT, EPI/EPC e resgate.
5. Não invente valores de norma, laudos, produtos ou contatos. Quando faltar dado, declare a lacuna.`;

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
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
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
    console.error('[Gemini API] Request failed:', error instanceof Error ? error.name : 'unknown');
    if (!disconnected && !res.writableEnded && !res.destroyed) {
      writeEvent(res, { type: 'error', error: 'Falha temporária no processamento da IA.' });
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
}
