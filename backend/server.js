
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import { applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const app = express();
app.use((req, res, next) => {
  const origin = req.get('origin') || '';
  if (/^http:\/\/(localhost|127\.0\.0\.1):5173$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({limit: process?.env?.API_PAYLOAD_MAX_SIZE || "7mb"}));

const PORT = process?.env?.API_BACKEND_PORT || 5000;
const API_BACKEND_HOST = process?.env?.API_BACKEND_HOST || "127.0.0.1";

const GOOGLE_CLOUD_LOCATION = process?.env?.GOOGLE_CLOUD_LOCATION;
const GOOGLE_CLOUD_PROJECT = process?.env?.GOOGLE_CLOUD_PROJECT;
if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION) {
  console.warn("Warning: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are not set. Vertex proxy routes may not work.");
}
const PROXY_HEADER = process?.env?.PROXY_HEADER;
if (!PROXY_HEADER) {
  console.warn("Warning: PROXY_HEADER is not set. Vertex proxy routes may not work.");
}
const PUTRA_AI_V1_API_URL = process?.env?.PUTRA_AI_V1_API_URL || "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api";
const PUTRA_AI_CHAT_API_URL = process?.env?.PUTRA_AI_CHAT_API_URL || `${PUTRA_AI_V1_API_URL.replace(/\/$/, '')}/api/chat`;
const PUTRA_MODEL = process?.env?.PUTRA_MODEL || "PutraAi-V1";
const FIREBASE_PROJECT_ID = process?.env?.FIREBASE_PROJECT_ID;
const FIREBASE_DATABASE_URL = process?.env?.FIREBASE_DATABASE_URL;
const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';
const OTP_TTL_MS = 10 * 60 * 1000;
const SMTP_TIMEOUT_MS = 10000;
let smtpTransporter = null;

const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');
const getOtpRef = (uid) => firebaseDatabase.ref(`loginOtps/${uid}`);

const getSmtpTransport = () => {
  const host = process.env.SMTP_HOST || process.env.SMTP_SERVER_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.SMTP_ACCOUNT_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.SMTP_ACCOUNT_PASSWORD;
  const mode = String(process.env.SMTP_SECURITY_MODE || '').toLowerCase();

  if (!host || !user || !pass) {
    throw new Error('SMTP belum dikonfigurasi. Isi SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, dan SMTP_FROM di backend/.env.local atau environment server.');
  }

  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    pool: true,
    host,
    port,
    secure: port === 465 || mode === 'ssl',
    requireTLS: mode === 'tls' || port === 587,
    family: 4,
    maxConnections: 1,
    maxMessages: 50,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    tls: {
      servername: host,
    },
    auth: { user, pass },
  });
  return smtpTransporter;
};

const sendOtpEmail = async ({ email, name, code }) => {
  const transporter = getSmtpTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_SENDER_ADDRESS || process.env.SMTP_USER;
  const startedAt = Date.now();
  const displayName = name || 'Divisi KKN 35';

  const info = await Promise.race([
    transporter.sendMail({
      from,
      to: email,
      subject: 'Kode OTP Login KKN 35',
      text: `Halo ${displayName},\n\nKode OTP login kamu adalah: ${code}\n\nKode ini berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.\n\nKKN 35 UMP`,
      html: `
        <div style="margin:0;padding:28px 0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;color:#111827">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5edf7;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08)">
            <div style="padding:28px 30px;background:linear-gradient(135deg,#e8f0fe 0%,#ffffff 70%);border-bottom:1px solid #eef2f7">
              <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#1a73e8;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase">
                KKN 35 UMP
              </div>
              <h1 style="margin:16px 0 6px;font-size:26px;line-height:1.2;font-weight:900;color:#0f172a">
                Verifikasi Login
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#475569">
                Gunakan kode OTP berikut untuk masuk ke dashboard divisi.
              </p>
            </div>

            <div style="padding:30px">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155">
                Halo <strong style="color:#0f172a">${displayName}</strong>,
              </p>

              <div style="margin:0 0 20px;padding:24px;border-radius:22px;background:#f8fafc;border:1px solid #dbe7f5;text-align:center">
                <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#64748b">
                  Kode OTP 6 Digit
                </p>
                <div style="font-size:38px;line-height:1;font-weight:900;letter-spacing:10px;color:#0f172a">
                  ${code}
                </div>
              </div>

              <div style="margin:0 0 18px;padding:14px 16px;border-radius:16px;background:#ecfdf5;border:1px solid #bbf7d0;color:#047857;font-size:14px;line-height:1.6;font-weight:700">
                Kode berlaku selama 10 menit.
              </div>

              <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b">
                Jangan bagikan kode ini kepada siapa pun. Jika kamu tidak meminta kode ini, abaikan email ini.
              </p>
            </div>

            <div style="padding:18px 30px;background:#f8fafc;border-top:1px solid #eef2f7;text-align:center">
              <p style="margin:0;font-size:12px;color:#94a3b8">
                Email otomatis dari sistem KKN 35 Universitas Muhammadiyah Palembang.
              </p>
            </div>
          </div>
        </div>
      `,
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMTP timeout. Cek koneksi internet, SMTP Gmail, dan App Password.')), SMTP_TIMEOUT_MS + 2000);
    }),
  ]);

  console.log(`[Auth OTP] Email OTP terkirim ke ${email} dalam ${Date.now() - startedAt}ms. messageId=${info?.messageId || '-'}`);
};

function getFirebaseAdminApp() {
  if (getApps().length) return getApp();

  const serviceAccountJson = process?.env?.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();

  return initializeApp({
    credential,
    projectId: FIREBASE_PROJECT_ID,
    databaseURL: FIREBASE_DATABASE_URL,
  });
}

const firebaseAdminApp = getFirebaseAdminApp();
const firebaseAuth = getAuth(firebaseAdminApp);
const firebaseDatabase = getDatabase(firebaseAdminApp);
const firebaseMessaging = getMessaging(firebaseAdminApp);

app.set('trust proxy', 1 /* number of proxies between user and server */);

// IMPORTANT: Vertex AI Studio Rate Limiting
// This rate limiting configuration protects your backend APIs from abuse.
// Removing it exposes your service to DoS attacks and unexpected costs.
const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Set ratelimit window at 15min (in ms)
    max: 100, // Limit each IP to 100 requests per window 
    standardHeaders: true, // Return rate limit info in the "RateLimit-*" headers
    legacyHeaders: false, // no "X-RateLimit-*" headers
    message: {
      error: 'Too many requests',
      message: 'You have exceed the request limit, please try again later.'
    },
});
// Apply the rate limiter to the /api-proxy route before the main proxy logic
app.use('/api-proxy', proxyLimiter);
app.use('/putra-ai-proxy', proxyLimiter);

const API_CLIENT_MAP = [
 {
    name: "VertexGenAi:generateContent",
    patternForProxy: "https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:generateContent",
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:generateContent`;
    },
    isStreaming: false,
    transformFn: null,
  },
 {
    name: "VertexGenAi:predict",
    patternForProxy: "https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:predict",
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:predict`;
    },
    isStreaming: false,
    transformFn: null,
  },
 {
    name: "VertexGenAi:streamGenerateContent",
    patternForProxy: "https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:streamGenerateContent",
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:streamGenerateContent`;
    },
    isStreaming: true,
    transformFn: (response) => {
        let normalizedResponse = response.trim();
        while (normalizedResponse.startsWith(',') || normalizedResponse.startsWith('[')) {
          normalizedResponse = normalizedResponse.substring(1).trim();
        }
        while (normalizedResponse.endsWith(',') || normalizedResponse.endsWith(']')) {
          normalizedResponse = normalizedResponse.substring(0, normalizedResponse.length - 1).trim();
        }

        if (!normalizedResponse.length) {
          return {result: null, inProgress: false};
        }

        if (!normalizedResponse.endsWith('}')) {
          return {result: normalizedResponse, inProgress: true};
        }

        try {
          const parsedResponse = JSON.parse(`${normalizedResponse}`);
          const transformedResponse = `data: ${JSON.stringify(parsedResponse)}\n\n`;
          return {result: transformedResponse, inProgress: false};
        } catch (error) {
          throw new Error(`Failed to parse response: ${error}.`);
        }
    },
  },
].map((client) => ({ ...client, patternInfo: parsePattern(client.patternForProxy) }));

// IMPORTANT: Vertex AI Studio SSRF Protection
// The set below is the exhaustive allow-list of upstream hostnames this
// proxy may forward authenticated requests to. It is sourced at code
// generation time from the RestApiClient.getAllowedUpstreamHosts() of every
// client embedded in API_CLIENT_MAP. Removing, weakening, or widening this
// check (for example, by adding wildcards or computing entries from request
// data) re-introduces the SSRF vulnerability that allows the deployed
// service account's OAuth access token to be exfiltrated to an
// attacker-controlled host.
const ALLOWED_UPSTREAM_HOSTS = new Set([
  "aiplatform.clients6.google.com",
]);

// Uses Google Application Default Credentials (ADC).
// Users need to run "gcloud auth application-default login" in order to use the proxy.
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePattern(pattern) {
  const paramRegex = /\{\{(.*?)\}\}/g;
  const params = [];
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = paramRegex.exec(pattern)) !== null) {
    params.push(match[1]);
    const literalPart = pattern.substring(lastIndex, match.index);
    parts.push(escapeRegex(literalPart));
    parts.push(`(?<${match[1]}>[^/]+)`);
    lastIndex = paramRegex.lastIndex;
  }
  parts.push(escapeRegex(pattern.substring(lastIndex)));
  const regexString = parts.join('');

  return {regex: new RegExp(`^${regexString}$`), params};
}

function extractParams(patternInfo, url) {
  const match = url.match(patternInfo.regex);
  if (!match) return null;
  const params = {};
  patternInfo.params.forEach((paramName, index) => {
    params[paramName] = match[index + 1];
  });
  return params;
}

async function getAccessToken(res) {
  try {
    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('[Node Proxy] Authentication error:', error);
    if (!res) return null;
    if (error.code === 'ERR_GCLOUD_NOT_LOGGED_IN' || (error.message && error.message.includes('Could not load the default credentials'))) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'Google Cloud Application Default Credentials not found or invalid. Please run "gcloud auth application-default login" and try again.',
      });
    } else {
      res.status(500).json({ error: `Authentication failed: ${error.message}` });
    }
    return null;
  }
}

function getRequestHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'X-Goog-User-Project': GOOGLE_CLOUD_PROJECT,
    'Content-Type': 'application/json',
  };
}

// --- Proxy Endpoint ---
app.post('/api-proxy', async (req, res) => {

  // Check for the custom header added by the shim
  if (req.headers['x-app-proxy'] !== PROXY_HEADER) {
    return res.status(403).send('Forbidden: Request must originate from the Vertex App shim.');
  }

  const { originalUrl, method, headers, body } = req.body;
  if (!originalUrl) {
    return res.status(400).send('Bad Request: originalUrl is required.');
  }

  // 1. Find the matching API client
  const apiClient = API_CLIENT_MAP.find(p => {
    // We store extractedParams on req for use later if needed, though getVertexUrl takes it as arg.
    req.extractedParams = extractParams(p.patternInfo, originalUrl);
    return req.extractedParams !== null;
  });

  if (!apiClient) {
    console.error(`[Node Proxy] No API client handler found for URL: ${originalUrl}`);
    return res.status(404).json({ error: `No proxy handler found for URL: ${originalUrl}` });
  }

  const extractedParams = req.extractedParams;
  console.log(`[Node Proxy] Matched API client: ${apiClient.name}`);
  try {
    // 2. Get authenticated access token
    const accessToken = await getAccessToken(res);
    if (!accessToken) return;

    // 3. Construct the full API URL using env-set GOOGLE_CLOUD_PROJECT/LOCATION and extracted params
    const context = {projectId: GOOGLE_CLOUD_PROJECT, region: GOOGLE_CLOUD_LOCATION};
    const apiUrl = apiClient.getApiEndpoint(context, extractedParams);

    // IMPORTANT: Vertex AI Studio SSRF Protection
    // Parse the constructed apiUrl with the standard URL parser (not a
    // regex) and require the resulting hostname to be in the hardcoded
    // ALLOWED_UPSTREAM_HOSTS set. This neutralizes attacks that smuggle a
    // URL-grammar delimiter (e.g. '#') into a pattern parameter to redirect
    // the authenticated upstream request to an attacker-controlled host.
    let parsedApiUrl;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch (e) {
      console.error(`[Node Proxy] Invalid API URL: ${apiUrl}`);
      return res.status(400).json({ error: 'Invalid API URL.' });
    }
    if (!ALLOWED_UPSTREAM_HOSTS.has(parsedApiUrl.hostname.toLowerCase())) {
      console.error(`[Node Proxy] Upstream host not allowed: ${parsedApiUrl.hostname}`);
      return res.status(400).json({ error: 'Upstream host not allowed.' });
    }
    console.log(`[Node Proxy] Forwarding to Vertex API: ${apiUrl}`);

    // 4. Prepare headers for the API call
    const apiHeaders = getRequestHeaders(accessToken);

    const apiFetchOptions = {
      method: method || 'POST',
      headers: {...apiHeaders, ...headers},
      body: body ? body : undefined,
    };

    // 5. Make the call to the API
    const apiResponse = await fetch(apiUrl, apiFetchOptions);

    // 6. Respond to the client based on stream type
    if (apiClient.isStreaming) {
      console.log(`[Node Proxy] Sending STREAMING response for ${apiClient.name}`);
      // Set headers for a streaming JSON response
      res.writeHead(apiResponse.status, {
        'Content-Type': 'text/event-stream',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
      });
      // Immediately send headers
      res.flushHeaders();

      if (!apiResponse.body) {
        console.error('[Node Proxy] Streaming response has no body.');
        return res.end(JSON.stringify({ error: 'Streaming response body is null' }));
      }

      const decoder = new TextDecoder();
      let deltaChunk = '';
      apiResponse.body.on('data', (encodedChunk) => {
        if (res.writableEnded) return; // Prevent writing after res.end()

        try {
          if (!apiClient.transformFn) {
            res.write(encodedChunk);
          } else {
            const decodedChunk = decoder.decode(encodedChunk, { stream: true });
            deltaChunk = deltaChunk + decodedChunk;

            const {result, inProgress} = apiClient.transformFn(deltaChunk);
            if (result && !inProgress) {
              deltaChunk = '';
              res.write(new TextEncoder().encode(result));
            }
          }
        } catch (error) {
          console.error(`[Node Proxy] Error processing streaming response for ${apiClient.name}`);
          console.error(error);
        }
      });

      apiResponse.body.on('end', () => {
        deltaChunk = '';
        console.log(`[Node Proxy] Vertex stream finished and all data processed for ${apiClient.name}`);
        res.end();
      });

      apiResponse.body.on('error', (streamError) => {
        console.error('[Node Proxy] Error from Vertex stream:', streamError);
        if (!res.writableEnded) {
          res.end(JSON.stringify({ proxyError: 'Stream error from Vertex AI', details: streamError.message }));
        }
      });

      res.on('error', (resError) => {
        console.error('[Node Proxy] Error writing to client response:', resError);
        // The source stream might need to be destroyed if an error occurs here.
        if (apiResponse.body && typeof apiResponse.body.destroy === 'function') {
             apiResponse.body.destroy(resError);
        }
      });
    } else {
      // Non-streaming response handling
      console.log(`[Node Proxy] Sending JSON response for ${apiClient.name}`);
      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    }
  } catch (error) {
    console.error(`[Node Proxy] Error proxying request for ${apiClient.name}`);
    console.error(error)
    res.status(500).json({ error: error });
  }
});

app.post('/putra-ai-proxy', async (req, res) => {
  let targetUrl;
  try {
    targetUrl = new URL(PUTRA_AI_CHAT_API_URL);
  } catch (error) {
    console.error('[PUTRA AI Proxy] Invalid PUTRA_AI_V1_API_URL:', error);
    return res.status(500).json({ error: 'PUTRA_AI_V1_API_URL is invalid.' });
  }

  if (targetUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'PUTRA_AI_V1_API_URL must use https.' });
  }

  try {
    const upstreamResponse = await fetch(targetUrl.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'model': req.body?.model || PUTRA_MODEL,
        ...(req.get('authorization') ? { Authorization: req.get('authorization') } : {}),
      },
      body: JSON.stringify({
        ...(req.body || {}),
        model: req.body?.model || PUTRA_MODEL,
      }),
    });

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
    res.status(upstreamResponse.status).type(contentType).send(responseText);
  } catch (error) {
    console.error('[PUTRA AI Proxy] Error forwarding request:', error);
    res.status(502).json({
      error: 'PUTRA AI proxy failed',
      message: error?.message || 'Unable to reach PUTRA AI proxy target.',
    });
  }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many OTP requests',
    message: 'Terlalu banyak percobaan OTP. Coba lagi beberapa menit.',
  },
});

const getBearerToken = (req) => {
  const authorization = req.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
};

const getAuthenticatedUser = async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token login tidak ditemukan.' });
    return null;
  }

  const decodedToken = await firebaseAuth.verifyIdToken(token);
  const accountEmail = String(decodedToken.email || '').trim().toLowerCase();
  if (!accountEmail) {
    res.status(400).json({ error: 'Missing email', message: 'Email akun tidak ditemukan.' });
    return null;
  }

  return { decodedToken, accountEmail };
};

app.post('/auth/request-otp', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, skipped: true });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await getOtpRef(decodedToken.uid).set({
      hash: hashOtp(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      email: accountEmail,
    });

    await sendOtpEmail({ email: accountEmail, name: decodedToken.name, code });

    return res.json({
      ok: true,
      email: accountEmail,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('[Auth OTP Request] Failed:', error);
    return res.status(500).json({
      error: 'OTP request failed',
      message: error?.message || 'Kode OTP belum berhasil dikirim.',
    });
  }
});

app.post('/auth/verify-otp', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, skipped: true });
    }

    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (code.length !== 6) {
      return res.status(400).json({ error: 'Invalid OTP', message: 'Kode OTP harus 6 digit.' });
    }

    const recordSnapshot = await getOtpRef(decodedToken.uid).get();
    const record = recordSnapshot.val();
    if (!record || record.expiresAt < Date.now()) {
      await getOtpRef(decodedToken.uid).remove();
      return res.status(400).json({ error: 'Expired OTP', message: 'Kode OTP sudah kedaluwarsa. Kirim ulang kode.' });
    }

    if (record.attempts >= 5) {
      await getOtpRef(decodedToken.uid).remove();
      return res.status(429).json({ error: 'Too many attempts', message: 'OTP terlalu sering salah. Kirim ulang kode.' });
    }

    if (record.hash !== hashOtp(code)) {
      record.attempts += 1;
      await getOtpRef(decodedToken.uid).update({ attempts: record.attempts });
      return res.status(400).json({ error: 'Wrong OTP', message: 'Kode OTP belum cocok.' });
    }

    await getOtpRef(decodedToken.uid).remove();
    return res.json({ ok: true });
  } catch (error) {
    console.error('[Auth OTP Verify] Failed:', error);
    return res.status(500).json({
      error: 'OTP verify failed',
      message: error?.message || 'Kode OTP belum berhasil diverifikasi.',
    });
  }
});

const formatDivisionLabel = (value = '') =>
  String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (/\d+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join(' ');

const getTokenValues = (snapshot) => {
  const value = snapshot.val() || {};
  return Object.values(value)
    .map((item) => item?.token)
    .filter((token) => typeof token === 'string' && token.length > 20);
};

const sendChatPushNotifications = async ({ message, tokens }) => {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean);
  if (!uniqueTokens.length) return { successCount: 0, failureCount: 0 };

  const title = message.chatType === 'private'
    ? `Chat pribadi dari ${message.senderName}`
    : `Chat publik dari ${formatDivisionLabel(message.senderDivision)}`;

  const response = await firebaseMessaging.sendEachForMulticast({
    tokens: uniqueTokens,
    data: {
      type: 'division-chat',
      chatType: message.chatType,
      messageId: message.id,
      title,
      body: message.text,
      senderName: message.senderName,
      senderDivision: formatDivisionLabel(message.senderDivision),
      url: '/#admin',
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      fcmOptions: {
        link: '/#admin',
      },
    },
  });

  return response;
};

app.post('/division-chat/send', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken } = authContext;
    const senderSnapshot = await firebaseDatabase.ref(`userProfiles/${decodedToken.uid}`).get();
    const sender = senderSnapshot.val();
    if (!sender || sender.role !== 'division') {
      return res.status(403).json({ error: 'Forbidden', message: 'Hanya akun divisi yang bisa mengirim chat.' });
    }

    const cleanText = String(req.body?.text || '').trim().replace(/\s+/g, ' ');
    const recipientUid = String(req.body?.recipientUid || '').trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'Bad Request', message: 'Pesan tidak boleh kosong.' });
    }
    if (cleanText.length > 800) {
      return res.status(400).json({ error: 'Bad Request', message: 'Pesan terlalu panjang. Maksimal 800 karakter.' });
    }

    let recipient = null;
    if (recipientUid) {
      const recipientSnapshot = await firebaseDatabase.ref(`userProfiles/${recipientUid}`).get();
      recipient = recipientSnapshot.val();
      if (!recipient || recipient.role !== 'division') {
        return res.status(404).json({ error: 'Not Found', message: 'Divisi tujuan belum ditemukan.' });
      }
      if (recipient.uid === sender.uid) {
        return res.status(400).json({ error: 'Bad Request', message: 'Tidak bisa mengirim chat pribadi ke akun sendiri.' });
      }
    }

    const isPrivate = Boolean(recipient);
    const path = isPrivate ? `divisionChats/privateByUser/${sender.uid}` : 'divisionChats/public';
    const messageRef = firebaseDatabase.ref(path).push();
    const createdAtMs = Date.now();
    const baseMessage = {
      id: messageRef.key || `chat_${createdAtMs}`,
      chatType: isPrivate ? 'private' : 'public',
      senderUid: sender.uid,
      senderName: sender.name,
      senderEmail: sender.email,
      senderDivision: sender.division,
      text: cleanText,
      date: new Date(createdAtMs).toLocaleString('id-ID'),
      createdAtMs,
      createdAt: createdAtMs,
    };
    const message = isPrivate
      ? {
        ...baseMessage,
        conversationId: [sender.uid, recipient.uid].sort().join('__'),
        recipientUid: recipient.uid,
        recipientName: recipient.name,
        recipientDivision: recipient.division,
      }
      : baseMessage;

    if (isPrivate) {
      await firebaseDatabase.ref().update({
        [`divisionChats/privateByUser/${sender.uid}/${message.id}`]: message,
        [`divisionChats/privateByUser/${recipient.uid}/${message.id}`]: message,
      });
    } else {
      await messageRef.set(message);
    }

    let pushTokens = [];

    if (isPrivate) {
      const recipientTokensSnapshot = await firebaseDatabase.ref(`notificationTokens/${recipient.uid}`).get();
      pushTokens = getTokenValues(recipientTokensSnapshot);
    } else {
      const allTokensSnapshot = await firebaseDatabase.ref('notificationTokens').get();
      allTokensSnapshot.forEach((child) => {
        if (child.key !== sender.uid) pushTokens.push(...getTokenValues(child));
      });
    }

    let pushResult = { successCount: 0, failureCount: 0 };
    try {
      pushResult = await sendChatPushNotifications({ message, tokens: pushTokens });
    } catch (pushError) {
      console.error('[Division Chat Push] Failed:', pushError);
    }

    return res.json({ ok: true, message, push: pushResult });
  } catch (error) {
    console.error('[Division Chat Send] Failed:', error);
    return res.status(500).json({
      error: 'Division chat send failed',
      message: error?.message || 'Pesan belum berhasil dikirim.',
    });
  }
});

app.post('/admin/delete-user', async (req, res) => {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  const targetUid = String(req.body?.uid || '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token admin tidak ditemukan.' });
  }

  if (!targetUid) {
    return res.status(400).json({ error: 'Bad Request', message: 'UID akun wajib dikirim.' });
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const requesterProfileSnapshot = await firebaseDatabase.ref(`userProfiles/${decodedToken.uid}`).get();
    const requesterProfile = requesterProfileSnapshot.val();
    const isAdmin =
      decodedToken.email === ADMIN_EMAIL ||
      requesterProfile?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden', message: 'Hanya admin yang boleh menghapus akun Auth.' });
    }

    if (targetUid === decodedToken.uid) {
      return res.status(400).json({ error: 'Bad Request', message: 'Admin tidak boleh menghapus akunnya sendiri dari dashboard ini.' });
    }

    const targetProfileSnapshot = await firebaseDatabase.ref(`userProfiles/${targetUid}`).get();
    const targetProfile = targetProfileSnapshot.val();

    if (targetProfile?.role === 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Akun admin tidak boleh dihapus lewat daftar divisi.' });
    }

    try {
      await firebaseAuth.deleteUser(targetUid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    const financialReportsSnapshot = await firebaseDatabase
      .ref('financialReports')
      .orderByChild('userId')
      .equalTo(targetUid)
      .get();
    const updates = {
      [`userProfiles/${targetUid}`]: null,
      [`weeklyReports/${targetUid}`]: null,
      [`divisionNotes/${targetUid}`]: null,
      [`liveLocations/${targetUid}`]: null,
    };

    financialReportsSnapshot.forEach((child) => {
      updates[`financialReports/${child.key}`] = null;
    });

    await firebaseDatabase.ref().update(updates);

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Admin Delete User] Failed:', error);
    return res.status(500).json({
      error: 'Delete user failed',
      message: error?.message || 'Akun belum berhasil dihapus dari Firebase Auth.',
    });
  }
});

const isVercelServerless = Boolean(process.env.VERCEL);
const server = isVercelServerless
  ? null
  : app.listen(PORT, API_BACKEND_HOST, () => {
    console.log(`Vertex AI Backend listening at http://localhost:${PORT}`);
  });

const wss = server ? new WebSocketServer({ noServer: true }) : null;

server?.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/ws-proxy') {
    
    let targetUrl = url.searchParams.get('target');
    if (!targetUrl) {
      console.log('[Node Proxy] Missing target URL');
      socket.destroy();
      return;
    }

    if (targetUrl === 'wss://aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent') {
      const location = GOOGLE_CLOUD_LOCATION === 'global' ? 'us-central1' : GOOGLE_CLOUD_LOCATION;
      targetUrl = `wss://${location}-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
    } else {
      console.log('[Node Proxy] Invalid target URL');
      socket.destroy();
      return;
    }

    let accessToken;

    try {
      accessToken = await getAccessToken();
      if (!accessToken) throw new Error('No token');
    } catch (err) {
      console.log('[Node Proxy] Authentication failed');
      socket.destroy();
      return;
    }

    console.log(`[Node Proxy] Initiating upstream connection to: ${targetUrl}`);

    let upstreamWs;

    try {
      upstreamWs = new WebSocket(targetUrl, {
        headers: getRequestHeaders(accessToken)
      });
    } catch (e) {
      console.error('[Node Proxy] Invalid Upstream URL');
      socket.destroy();
      return;
    }

    const initialErrorHandler = (error) => {
      console.error('[Node Proxy] Upstream connection failed:', error);
      upstreamWs.removeEventListener('open', onUpstreamOpen);

      if (socket.writable) {
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
      }
    };

    upstreamWs.once('error', initialErrorHandler);

    // 5. Handle Successful Upstream Connection
    const onUpstreamOpen = () => {
      // Remove the "bootstrapping" error handler
      upstreamWs.removeListener('error', initialErrorHandler);

      // Perform the HTTP -> WebSocket upgrade for the Client
      wss?.handleUpgrade(request, socket, head, (ws) => {

        upstreamWs.on('message', (data, isBinary) => {
          const logMsg = isBinary ? '<Binary Data>' : data.toString();
          console.log(`[Upstream -> Client] [${new Date().toISOString()}]: ${logMsg}`);

          if (ws.readyState === WebSocket.OPEN) {
            if (data === undefined || data === null) {
              console.warn('[Node Proxy] Attempted to send undefined/null data to client');
              return;
            }
            ws.send(data, { binary: isBinary });
          }
        });

        ws.on('message', (data, isBinary) => {
          const logMsg = isBinary ? '<Binary Data>' : data.toString();

          let dataJson = {};
          try {
            dataJson = JSON.parse(data.toString());
          } catch (error) {
            console.error('[Node Proxy] Failed to parse message from client:', error);
            ws.close(1011, 'Failed to parse message');
          }

          if (dataJson['setup']) {
            dataJson['setup']['model'] = `projects/${GOOGLE_CLOUD_PROJECT}/locations/${GOOGLE_CLOUD_LOCATION}/${dataJson['setup']['model']}`;
          }

          if (upstreamWs.readyState === WebSocket.OPEN) {
            upstreamWs.send(JSON.stringify(dataJson), { binary: false });
          }
        });

        upstreamWs.on('error', (error) => {
          console.error('[Node Proxy] Upstream error:', error);
          ws.close(1011, error.message);
        });

        upstreamWs.on('close', (code, reason) => {
          console.log(`[Node Proxy] Upstream closed: ${code} ${reason}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(code, reason);
          }
        });

        ws.on('error', (error) => {
          console.error('[Node Proxy] Client error:', error);
          upstreamWs.close(1011, error.message);
        });

        ws.on('close', (code, reason) => {
          console.log(`[Node Proxy] Client closed: ${code} ${reason}`);
          if (upstreamWs.readyState === WebSocket.OPEN) {
            upstreamWs.close(1000, reason);
          }
        });

        wss?.emit('connection', ws, request);
      });
    };

    upstreamWs.once('open', onUpstreamOpen);

  } else {
    // Path did not match
    socket.destroy();
  }
});

export default app;
