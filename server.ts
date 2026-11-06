/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Server-side entry point for OBra ENGEP.
 * Gemini is used only when GEMINI_API_KEY is present; there is no fabricated fallback.
 */

import express from 'express';
import next from 'next';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import liveTokenHandler from './api/gemini/live-token.js';
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
import { env, exit } from 'node:process';

dotenv.config();

const app = express();
app.disable('x-powered-by');

const port = Number(env.PORT) || 3000;
const server = http.createServer(app);
const apiKey = env.GEMINI_API_KEY || '';
const chatModel = env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const liveModel = env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const nextApp = next({ dev: env.NODE_ENV !== 'production', hostname: '0.0.0.0', port });
const nextHandler = nextApp.getRequestHandler();

const SYSTEM_INSTRUCTION = `Você é o Assistente Técnico do OBra ENGEP (obras, instalações prediais, segurança e estética automotiva).
Diretrizes:
1. Responda em português do Brasil, com rigor técnico e linguagem de campo.
2. Cite as normas aplicáveis (NBR 5410, NBR 5626, NBR 6118, NBR 15575, NR-06, NR-10, NR-12, NR-18, NR-33, NR-35) sem reproduzir textos protegidos.
3. Mostre premissas, fórmula e limitações do cálculo.
4. Em risco elétrico, trabalho em altura ou espaço confinado, reforce desenergização, LOTO, AR/PT, EPI/EPC e resgate.
5. Não invente valores de norma, laudos, produtos ou contatos. Quando faltar dado, declare a lacuna.`;

type RateBucket = { count: number; resetAt: number };
const requestBuckets = new Map<string, RateBucket>();
const liveConnectionsByIp = new Map<string, number>();
const MAX_ACTIVE_GEMINI_STREAMS = 8;
const MAX_ACTIVE_LIVE_CONNECTIONS = 50;
let ac...[truncated]