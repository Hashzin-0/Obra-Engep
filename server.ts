/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Server-side entry point for OBra ENGEP.
 * Gemini is used only when GEMINI_API_KEY is present; there is no fabricated fallback.
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
import { env, exit } from 'node:process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable('x-powered-by');

const port = Number(env.PORT) || 3000;
const server = http.createServer(app);
const apiKey = env.GEMINI_API_KEY || '';
const chatModel = env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const liveModel = env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_INSTRUCTION = \`Você é o Assistente Técnico do OBra ENGEP (obras, instalações prediais, segurança e estética automotiva).
Diretrizes:
1. Responda em português do Brasil, com rigor técnico e linguagem de campo.
2. Cite as normas aplicáveis (NBR 5410, NBR 5626, NBR 6118, NBR 15575, NR-06, NR-10, NR-12, NR-18, NR-33, NR-35) sem reproduzir textos protegidos.
3. Mostre premissas, fórmula e limitações do cálculo.
4. Em risco elétrico, trabalho em altura ou espaço confinado, reforce desenergização, LOTO, AR/PT, EPI/EPC e resgate.
5. Não invente valores de norma, laudos, produtos ou contatos. Quando faltar dado, declare a lacuna.\`;

type RateBucket = { count: number; resetAt: number };
const requestBuckets = new Map<string, RateBucket>();
const liveConnectionsByIp = new Map<string, number>();
const MAX_ACTIVE_GEMINI_STREAMS = 8;
const activeGeminiByIp = new Map<string, number>();
let activeGeminiStreams = 0;

function clientIp(req: any): string {
  return req.socket?.remoteAddress || 'unknown';
}

function allowRate(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  let bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    requestBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (requestBuckets.size > 10_000) {
    for (const [bucketKey, value] of requestBuckets) {
      if (value.resetAt <= now) requestBuckets.delete(bucketKey);
    }
  }
  return bucket.count <= max;
}

function rateLimit(max: number, label: string) {
  return (req: any, res: any, next: any) => {
    if (!allowRate(\`\${label}:\${clientIp(req)}\`, max)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto.' });
    }
    next();
  };
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api/health', rateLimit(30, 'health'));
app.use('/api/gemini/realtime-chat', rateLimit(12, 'gemini-chat'));
app.use(express.json({ limit: '256kb', strict: true, type: 'application/json' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/gemini/realtime-chat', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie JSON válido.' });
  const { prompt } = req.body as { prompt?: unknown };
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Prompt é obrigatório.' });
  if (Buffer.byteLength(prompt, 'utf8') > 96 * 1024 || prompt.length > 24_000) {
    return res.status(413).json({ error: 'O texto enviado excede o limite permitido.' });
  }
  if (!ai) return res.status(503).json({ error: 'O assistente está indisponível no momento.' });

  const ip = clientIp(req);
  const perIp = activeGeminiByIp.get(ip) ?? 0;
  if (activeGeminiStreams >= MAX_ACTIVE_GEMINI_STREAMS || perIp >= 2) {
    return res.status(429).json({ error: 'Limite de sessões simultâneas atingido.' });
  }

  activeGeminiStreams += 1;
  activeGeminiByIp.set(ip, perIp + 1);
  let disconnected = false;
  const timeout = setTimeout(() => {
    disconnected = true;
    if (!res.writableEnded) {
      res.write(\`data: \${JSON.stringify({ type: 'error', error: 'Tempo máximo de resposta excedido.' })}\\n\\n\`);
      res.end();
    }
  }, 120_000);
  res.on('close', () => { disconnected = true; });
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const responseStream = await ai.models.generateContentStream({
      model: chatModel,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 2048 },
      } as any,
    });

    for await (const chunk of responseStream) {
      if (disconnected || res.writableEnded) break;
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (disconnected || res.writableEnded) break;
        if ((part as any).thought) {
          res.write(\`data: \${JSON.stringify({ type: 'thought', text: part.text || '' })}\\n\\n\`);
        } else if (part.text) {
          res.write(\`data: \${JSON.stringify({ type: 'text', text: part.text })}\\n\\n\`);
        }
      }
    }

    if (!disconnected && !res.writableEnded) {
      res.write(\`data: \${JSON.stringify({ type: 'done' })}\\n\\n\`);
      res.end();
    }
  } catch (error) {
    console.error('[Server] Gemini chat failed:', error instanceof Error ? error.name : 'unknown');
    if (!disconnected && !res.writableEnded) {
      res.write(\`data: \${JSON.stringify({ type: 'error', error: 'Falha temporária no processamento da IA.' })}\\n\\n\`);
      res.end();
    }
  } finally {
    clearTimeout(timeout);
    activeGeminiStreams = Math.max(0, activeGeminiStreams - 1);
    const remaining = Math.max(0, (activeGeminiByIp.get(ip) ?? 1) - 1);
    if (remaining) activeGeminiByIp.set(ip, remaining);
    else activeGeminiByIp.delete(ip);
  }
});

function sameOrigin(info: any): boolean {
  if (typeof info.origin !== 'string') return false;
  try {
    const origin = new URL(info.origin);
    const host = String(info.req.headers.host || '').toLowerCase();
    const local = origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';
    return origin.host.toLowerCase() === host
      && (origin.protocol === 'https:' || (local && origin.protocol === 'http:'));
  } catch {
    return false;
  }
}

const wss = new WebSocketServer({
  server,
  path: '/api/live',
  maxPayload: 512 * 1024,
  perMessageDeflate: false,
  verifyClient: (info, done) => {
    const ip = info.req.socket.remoteAddress || 'unknown';
    if (!sameOrigin(info)) return done(false, 403, 'Origin not allowed');
    if (!allowRate(\`live-handshake:\${ip}\`, 10)) return done(false, 429, 'Rate limit exceeded');
    if ((liveConnectionsByIp.get(ip) ?? 0) >= 2) return done(false, 429, 'Too many live connections');
    done(true);
  },
});

wss.on('connection', async (clientWs: WebSocket, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  liveConnectionsByIp.set(ip, (liveConnectionsByIp.get(ip) ?? 0) + 1);

  const releaseConnection = () => {
    const remaining = Math.max(0, (liveConnectionsByIp.get(ip) ?? 1) - 1);
    if (remaining) liveConnectionsByIp.set(ip, remaining);
    else liveConnectionsByIp.delete(ip);
  };

  if (!ai) {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'error', error: 'O modo de voz está indisponível.' }));
    clientWs.close(1011, 'Serviço indisponível');
    releaseConnection();
    return;
  }

  let liveSession: any = null;
  let messageCount = 0;
  let messageWindow = Date.now();

  try {
    liveSession = await ai.live.connect({
      model: liveModel,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onmessage: (message: any) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({
                type: 'audio',
                audio: part.inlineData.data,
                mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
              }));
            }
            if (part.thought) clientWs.send(JSON.stringify({ type: 'thought', text: part.text || '' }));
            if (part.text && !part.thought) clientWs.send(JSON.stringify({ type: 'text', text: part.text }));
          }
          if (message.serverContent?.interrupted) clientWs.send(JSON.stringify({ type: 'interrupted' }));
          if (message.serverContent?.turnComplete) clientWs.send(JSON.stringify({ type: 'turnComplete' }));
        },
        onerror: (error: any) => {
          console.error('[WebSocket] Gemini Live failed:', error instanceof Error ? error.name : 'unknown');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', error: 'Falha temporária na sessão de voz.' }));
          }
        },
        onclose: () => {},
      },
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'ready', message: 'Conectado ao Gemini Live.' }));
    }
  } catch (error) {
    console.warn('[WebSocket] Live setup failed:', error instanceof Error ? error.name : 'unknown');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', error: 'Não foi possível iniciar a sessão de voz.' }));
      clientWs.close(1011, 'Falha ao iniciar');
    }
    releaseConnection();
    return;
  }

  clientWs.on('message', (rawData, isBinary) => {
    const messageBuffer = Buffer.isBuffer(rawData)
      ? rawData
      : Array.isArray(rawData)
        ? Buffer.concat(rawData)
        : Buffer.from(rawData as ArrayBuffer);
    if (isBinary || messageBuffer.byteLength > 350 * 1024) {
      clientWs.close(1009, 'Mensagem muito grande ou formato inválido');
      return;
    }
    const now = Date.now();
    if (now - messageWindow >= 60_000) {
      messageWindow = now;
      messageCount = 0;
    }
    messageCount += 1;
    if (messageCount > 60) {
      clientWs.close(1008, 'Limite de mensagens excedido');
      return;
    }

    try {
      const data = JSON.parse(messageBuffer.toString('utf8'));
      if (data?.type === 'audio') {
        const mimeType = typeof data.mimeType === 'string' ? data.mimeType : 'audio/pcm;rate=16000';
        if (typeof data.audio !== 'string' || data.audio.length > 300_000
          || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.audio)
          || !/^audio\\/(pcm|webm|wav)(;|$)/i.test(mimeType)) {
          clientWs.close(1008, 'Áudio inválido');
          return;
        }
        liveSession?.sendRealtimeInput({
          audio: { data: data.audio, mimeType },
        });
      } else if (data?.type === 'text') {
        if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 4000) {
          clientWs.close(1008, 'Texto inválido');
          return;
        }
        liveSession?.send({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: data.text }] }],
            turnComplete: true,
          },
        });
      } else {
        clientWs.close(1008, 'Tipo de mensagem inválido');
      }
    } catch {
      clientWs.close(1007, 'JSON inválido');
    }
  });

  clientWs.on('error', () => {});
  clientWs.on('close', () => {
    if (liveSession) {
      try { liveSession.close(); } catch { /* ignore */ }
    }
    releaseConnection();
  });
});

app.use((error: any, _req: any, res: any, next: any) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisição excede o limite permitido.' });
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido.' });
  console.error('[Server] Request failed:', error instanceof Error ? error.name : 'unknown');
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});

const isProduction = env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(\`[Server] OBra ENGEP running on port \${port}\`);
  });
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup error:', error instanceof Error ? error.name : 'unknown');
  exit(1);
});
