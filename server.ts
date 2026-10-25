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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const port = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

const apiKey = process.env.GEMINI_API_KEY || '';
const chatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

console.log('[Server] Inicializando OBra ENGEP.');
if (!apiKey) {
  console.warn('[Server] GEMINI_API_KEY ausente: recursos de IA responderão indisponíveis.');
}

const SYSTEM_INSTRUCTION = `Você é o Assistente Técnico do OBra ENGEP (obras, instalações prediais, segurança e estética automotiva).
Diretrizes:
1. Responda em português do Brasil, com rigor técnico e linguagem de campo.
2. Cite as normas aplicáveis (NBR 5410, NBR 5626, NBR 6118, NBR 15575, NR-06, NR-10, NR-12, NR-18, NR-33, NR-35) sem reproduzir textos protegidos.
3. Mostre premissas, fórmula e limitações do cálculo.
4. Em risco elétrico, trabalho em altura ou espaço confinado, reforce desenergização, LOTO, AR/PT, EPI/EPC e resgate.
5. Não invente valores de norma, laudos, produtos ou contatos. Quando faltar dado, declare a lacuna.`;

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(apiKey),
    chatModel,
    liveModel,
  });
});

app.post('/api/gemini/realtime-chat', async (req, res) => {
  const { prompt } = req.body as { prompt?: unknown };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Prompt é obrigatório.' })}\n\n`);
    res.end();
    return;
  }

  if (!ai) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: 'GEMINI_API_KEY não configurada no servidor. O assistente está indisponível.',
      })}\n\n`
    );
    res.end();
    return;
  }

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
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if ((part as any).thought) {
          res.write(`data: ${JSON.stringify({ type: 'thought', text: part.text || '' })}\n\n`);
        } else if (part.text) {
          res.write(`data: ${JSON.stringify({ type: 'text', text: part.text })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro no processamento da IA.';
    console.error('[Server] Gemini chat error:', message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    res.end();
  }
});

const wss = new WebSocketServer({ server, path: '/api/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  if (!ai) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        error: 'GEMINI_API_KEY não configurada. O modo de voz está indisponível.',
      })
    );
    clientWs.close(1011, 'Gemini não configurado');
    return;
  }

  let liveSession: any = null;

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
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              clientWs.send(
                JSON.stringify({
                  type: 'audio',
                  audio: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                })
              );
            }
            if (part.thought) {
              clientWs.send(JSON.stringify({ type: 'thought', text: part.text || '' }));
            }
            if (part.text && !part.thought) {
              clientWs.send(JSON.stringify({ type: 'text', text: part.text }));
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
        },
        onerror: (error: any) => {
          console.error('[WebSocket] Gemini Live error:', error);
          clientWs.send(
            JSON.stringify({ type: 'error', error: error?.message || 'Erro na sessão de voz.' })
          );
        },
        onclose: () => {
          console.log('[WebSocket] Gemini Live session closed');
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready', message: 'Conectado ao Gemini Live.' }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao abrir sessão de voz.';
    console.warn('[WebSocket] Live session setup error:', message);
    clientWs.send(JSON.stringify({ type: 'error', error: message }));
    clientWs.close(1011, 'Falha no Gemini Live');
    return;
  }

  clientWs.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      if (data.type === 'audio' && data.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: data.audio, mimeType: data.mimeType || 'audio/pcm;rate=16000' },
        });
      } else if (data.type === 'text' && data.text && liveSession) {
        liveSession.send({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: data.text }] }],
            turnComplete: true,
          },
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error handling client message:', error);
    }
  });

  clientWs.on('close', () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch {
        // ignore
      }
    }
  });
});

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware attached in development mode.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static assets from dist.');
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] OBra ENGEP running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});
