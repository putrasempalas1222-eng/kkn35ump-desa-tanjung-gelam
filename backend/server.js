
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
import admin from 'firebase-admin';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const app = express();
app.use((req, _res, next) => {
  if (process.env.VERCEL && req.url.startsWith('/api/')) {
    req.url = req.url.slice('/api'.length) || '/';
  }
  next();
});
app.use((req, res, next) => {
  const origin = req.get('origin') || '';
  if (/^http:\/\/(localhost|127\.0\.0\.1):5173$/i.test(origin) || /^https:\/\/kkn35ump-desa-gelam\.vercel\.app$/i.test(origin)) {
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

const firebaseRuntimeConfig = (() => {
  try {
    return process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
  } catch {
    return {};
  }
})();
const GOOGLE_CLOUD_LOCATION = process?.env?.GOOGLE_CLOUD_LOCATION;
const GOOGLE_CLOUD_PROJECT = process?.env?.GOOGLE_CLOUD_PROJECT || process?.env?.GCLOUD_PROJECT || process?.env?.GCP_PROJECT;
if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION) {
  console.warn("Warning: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are not set. Vertex proxy routes may not work.");
}
const PROXY_HEADER = process?.env?.PROXY_HEADER;
if (!PROXY_HEADER) {
  console.warn("Warning: PROXY_HEADER is not set. Vertex proxy routes may not work.");
}
const PUTRA_AI_V1_API_URL = process?.env?.PUTRA_AI_V1_API_URL || "https://us-central1-project-3dfa8c97-bc93-4195-a5a.cloudfunctions.net/api";
const PUTRA_AI_CHAT_API_URL = process?.env?.PUTRA_AI_CHAT_API_URL || `${PUTRA_AI_V1_API_URL.replace(/\/$/, '')}/api/chat`;
const PUTRA_MODEL = process?.env?.PUTRA_MODEL || "PutraAi-V1";
const FIREBASE_PROJECT_ID = process?.env?.FB_PROJECT_ID || process?.env?.FIREBASE_PROJECT_ID || firebaseRuntimeConfig.projectId || process?.env?.GCLOUD_PROJECT;
const FIREBASE_DATABASE_URL = process?.env?.FB_DATABASE_URL || process?.env?.FIREBASE_DATABASE_URL || firebaseRuntimeConfig.databaseURL;
const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';
const OTP_TTL_MS = 10 * 60 * 1000;
const SMTP_TIMEOUT_MS = 10000;
let smtpTransporter = null;
const memoryOtpStore = new Map();
const memoryTotpStore = new Map();
const memoryTotpSetupStore = new Map();
const shouldUseFirebaseOtpStore = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.VERCEL ||
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE
);
if (!shouldUseFirebaseOtpStore) {
  console.warn('[Auth OTP] FIREBASE_SERVICE_ACCOUNT_JSON tidak ada. OTP lokal disimpan di memori backend.');
}

const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');
const getOtpRef = (uid) => firebaseDatabase.ref(`loginOtps/${uid}`);
const getTotpRef = (uid) => firebaseDatabase.ref(`loginTotpSecrets/${uid}`);
const getTotpSetupRef = (uid) => firebaseDatabase.ref(`loginTotpSetups/${uid}`);
const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

const saveOtpRecord = async (uid, record) => {
  if (!shouldUseFirebaseOtpStore) {
    memoryOtpStore.set(uid, record);
    return 'memory';
  }

  await withTimeout(
    getOtpRef(uid).set(record),
    8000,
    'Simpan OTP ke Firebase terlalu lama. Cek FIREBASE_SERVICE_ACCOUNT_JSON dan DATABASE_URL.'
  );
  return 'firebase';
};

const readOtpRecord = async (uid) => {
  const memoryRecord = memoryOtpStore.get(uid);
  if (memoryRecord) return { record: memoryRecord, source: 'memory' };

  if (!shouldUseFirebaseOtpStore) return { record: null, source: 'memory' };

  const recordSnapshot = await withTimeout(
    getOtpRef(uid).get(),
    8000,
    'Ambil OTP dari Firebase terlalu lama. Kirim ulang kode OTP.'
  );
  return { record: recordSnapshot.val(), source: 'firebase' };
};

const removeOtpRecord = async (uid, source) => {
  memoryOtpStore.delete(uid);
  if (source === 'firebase' || shouldUseFirebaseOtpStore) {
    await withTimeout(getOtpRef(uid).remove(), 8000, 'Reset OTP terlalu lama. Cek koneksi Firebase.');
  }
};

const updateOtpRecord = async (uid, source, updates) => {
  const currentMemoryRecord = memoryOtpStore.get(uid);
  if (source === 'memory' || currentMemoryRecord) {
    memoryOtpStore.set(uid, { ...(currentMemoryRecord || {}), ...updates });
    return;
  }

  await getOtpRef(uid).update(updates);
};

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const generateBase32Secret = (length = 20) => {
  const bytes = crypto.randomBytes(length);
  let bits = '';
  let secret = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += base32Alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
};

const decodeBase32Secret = (secret) => {
  const cleanSecret = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of cleanSecret) {
    const value = base32Alphabet.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const generateTotpCode = (secret, step = Math.floor(Date.now() / 30000)) => {
  const key = decodeBase32Secret(secret);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  counter.writeUInt32BE(step >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
};

const verifyTotpCode = (secret, code) => {
  const cleanCode = String(code || '').replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;
  const currentStep = Math.floor(Date.now() / 30000);
  for (let offset = -1; offset <= 1; offset += 1) {
    if (generateTotpCode(secret, currentStep + offset) === cleanCode) return true;
  }
  return false;
};

const saveTotpSetupRecord = async (uid, record) => {
  if (!shouldUseFirebaseOtpStore) {
    memoryTotpSetupStore.set(uid, record);
    return;
  }
  await withTimeout(getTotpSetupRef(uid).set(record), 8000, 'Simpan setup Authenticator terlalu lama.');
};

const readTotpSetupRecord = async (uid) => {
  const memoryRecord = memoryTotpSetupStore.get(uid);
  if (memoryRecord) return { record: memoryRecord, source: 'memory' };
  if (!shouldUseFirebaseOtpStore) return { record: null, source: 'memory' };
  const snapshot = await withTimeout(getTotpSetupRef(uid).get(), 8000, 'Ambil setup Authenticator terlalu lama.');
  return { record: snapshot.val(), source: 'firebase' };
};

const removeTotpSetupRecord = async (uid, source) => {
  memoryTotpSetupStore.delete(uid);
  if (source === 'firebase' || shouldUseFirebaseOtpStore) {
    await withTimeout(getTotpSetupRef(uid).remove(), 8000, 'Hapus setup Authenticator terlalu lama.');
  }
};

const saveTotpRecord = async (uid, record) => {
  if (!shouldUseFirebaseOtpStore) {
    memoryTotpStore.set(uid, record);
    return;
  }
  await withTimeout(getTotpRef(uid).set(record), 8000, 'Simpan kunci Authenticator terlalu lama.');
};

const readTotpRecord = async (uid) => {
  const memoryRecord = memoryTotpStore.get(uid);
  if (memoryRecord) return { record: memoryRecord, source: 'memory' };
  if (!shouldUseFirebaseOtpStore) return { record: null, source: 'memory' };
  const snapshot = await withTimeout(getTotpRef(uid).get(), 8000, 'Ambil kunci Authenticator terlalu lama.');
  return { record: snapshot.val(), source: 'firebase' };
};

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
  const publicBaseUrl = (process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://kkn35ump-desa-gelam.vercel.app').replace(/\/$/, '');
  const logoUrl = `${publicBaseUrl}/report-assets/logokknv1.png`;
  const cautionText =
    'Informasi: Email ini dikirim otomatis oleh sistem KKN 35 UMP untuk proses keamanan akun. ' +
    'Kode OTP bersifat rahasia, hanya ditujukan untuk pemilik akun yang tertera, dan tidak boleh dibagikan kepada siapa pun. ' +
    'Jika Anda tidak sedang melakukan proses login, abaikan email ini dan segera ubah password akun Anda.';

  const info = await Promise.race([
    transporter.sendMail({
      from,
      to: email,
      subject: `Verifikasi OTP Login KKN 35 - ${code}`,
      text: `Verifikasi OTP Login KKN 35\n\nHalo ${displayName},\n\nAnda menerima email ini karena sedang melakukan proses verifikasi login pada dashboard KKN 35 UMP. Gunakan kode berikut untuk menyelesaikan proses verifikasi:\n\n${code}\n\nKode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.\n\n${cautionText}`,
      html: `
        <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
          <div style="max-width:720px;margin:0 auto;padding:32px 16px">
            <div style="background:#ffffff;border-radius:10px;padding:36px 36px 30px;box-shadow:0 8px 28px rgba(15,23,42,0.08)">
              <img src="${logoUrl}" alt="Logo KKN 35" width="96" style="display:block;width:96px;max-width:96px;height:auto;margin:0 0 34px" />

              <h1 style="margin:0 0 22px;font-size:31px;line-height:1.18;font-weight:800;color:#020617">
                Verifikasi OTP Login KKN 35
              </h1>

              <p style="margin:0 0 8px;font-size:20px;line-height:1.6;color:#334155">
                Halo <strong style="color:#1e293b">${displayName}</strong>,
              </p>
              <p style="margin:0;font-size:20px;line-height:1.6;color:#334155">
                Anda menerima email ini karena sedang melakukan proses verifikasi pada
                <strong style="color:#1e293b">dashboard KKN 35 UMP</strong>. Gunakan kode di bawah ini untuk
                menyelesaikan proses verifikasi. Kode ini berlaku selama <strong style="color:#1e293b">10 menit</strong>.
              </p>

              <div style="margin:56px 0 48px;padding:32px 18px;border-radius:14px;background:#fff7ed;text-align:center">
                <div style="font-size:40px;line-height:1;font-weight:700;letter-spacing:18px;color:#f97316">
                  ${code.split('').join(' ')}
                </div>
              </div>

              <p style="margin:0;font-size:16px;line-height:1.7;color:#94a3b8">
                Jika Anda tidak meminta kode ini, silakan abaikan email ini. Terima kasih atas perhatian Anda.
              </p>
            </div>

            <div style="margin-top:20px;padding:22px 8px 0;border-top:1px solid #9ca3af">
              <p style="margin:0;font-size:15px;line-height:1.55;color:#111827">
                ${cautionText}
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

const getJakartaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDaysToIsoDate = (isoDate, days) => {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
};

const getMoneyCollectionPayments = (collection) => {
  const payments = collection?.payments || {};
  if (Array.isArray(payments)) return payments.filter(Boolean);
  return Object.entries(payments)
    .map(([id, payment]) => ({ id, ...(payment || {}) }))
    .filter((payment) => payment && typeof payment === 'object');
};

const sendMoneyCollectionEmail = async ({ to, bcc, name, collection, appUrl, reminder = false, daysUntilDue = 3 }) => {
  const transporter = getSmtpTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_SENDER_ADDRESS || process.env.SMTP_USER;
  const startedAt = Date.now();
  const displayName = name || 'Divisi KKN 35';
  const publicBaseUrl = (process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://kkn35ump-desa-gelam.vercel.app').replace(/\/$/, '');
  const logoUrl = `${publicBaseUrl}/report-assets/logokknv1.png`;
  const dueDateText = collection.dueDate || '-';
  const descriptionText = collection.description || '-';
  const paymentMethodText = collection.paymentMethod || '-';
  const paymentAccountText = collection.paymentAccount || '-';
  const headline = reminder ? 'Pengingat Tagihan KKN 35' : 'Pengumpulan Uang KKN 35';
  const introText = reminder
    ? `Sistem mendeteksi divisi Anda belum mengunggah bukti pembayaran untuk pengumpulan uang berikut. Deadline tersisa ${daysUntilDue} hari.`
    : 'Bendahara membuat informasi pengumpulan uang baru pada dashboard KKN 35 UMP. Silakan lihat detail dan upload bukti pembayaran melalui tombol di bawah.';
  const subject = reminder
    ? `Pengingat Tagihan KKN 35 H-${daysUntilDue} - ${collection.title}`
    : `Pengumpulan Uang KKN 35 - ${collection.title}`;
  const cautionText =
    'Informasi: Email ini dikirim otomatis oleh sistem KKN 35 UMP sebagai pemberitahuan resmi dari bendahara. ' +
    'Silakan login ke dashboard divisi untuk melihat detail dan mengunggah bukti pembayaran. ' +
    'Abaikan email ini jika Anda bukan bagian dari akun divisi KKN 35 UMP.';

  const info = await Promise.race([
    transporter.sendMail({
      from,
      to,
      bcc,
      subject,
      text:
        `${headline}\n\n` +
        `Halo ${displayName},\n\n` +
        `${introText}\n\n` +
        `Nama Pengumpulan: ${collection.title}\n` +
        `Jumlah: ${collection.amount}\n` +
        `Metode Pembayaran: ${paymentMethodText}\n` +
        `Nomor Rekening/E-Wallet: ${paymentAccountText}\n` +
        `Deadline: ${dueDateText}\n` +
        `Keterangan: ${descriptionText}\n\n` +
        `Buka dashboard divisi untuk melihat detail dan upload bukti pembayaran: ${appUrl}\n\n${cautionText}`,
      html: `
        <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
          <div style="max-width:720px;margin:0 auto;padding:32px 16px">
            <div style="background:#ffffff;border-radius:10px;padding:36px 36px 30px;box-shadow:0 8px 28px rgba(15,23,42,0.08)">
              <img src="${logoUrl}" alt="Logo KKN 35" width="96" style="display:block;width:96px;max-width:96px;height:auto;margin:0 0 34px" />

              <h1 style="margin:0 0 22px;font-size:31px;line-height:1.18;font-weight:800;color:#020617">
                ${headline}
              </h1>

              <p style="margin:0 0 8px;font-size:20px;line-height:1.6;color:#334155">
                Halo <strong style="color:#1e293b">${displayName}</strong>,
              </p>
              <p style="margin:0;font-size:20px;line-height:1.6;color:#334155">
                ${introText}
              </p>

              <div style="margin:44px 0 32px;padding:28px 24px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa">
                <p style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#f97316">
                  ${reminder ? 'Pengingat Pembayaran' : 'Informasi Pengumpulan'}
                </p>
                <h2 style="margin:0 0 18px;font-size:28px;line-height:1.25;font-weight:800;color:#0f172a">
                  ${collection.title}
                </h2>
                <p style="margin:0 0 10px;font-size:18px;line-height:1.5;color:#334155"><strong>Jumlah:</strong> ${collection.amount}</p>
                <p style="margin:0 0 10px;font-size:18px;line-height:1.5;color:#334155"><strong>Metode:</strong> ${paymentMethodText}</p>
                <p style="margin:0 0 10px;font-size:18px;line-height:1.5;color:#334155"><strong>Nomor:</strong> ${paymentAccountText}</p>
                <p style="margin:0 0 10px;font-size:18px;line-height:1.5;color:#334155"><strong>Deadline:</strong> ${dueDateText}</p>
                <p style="margin:0;font-size:18px;line-height:1.5;color:#334155"><strong>Keterangan:</strong> ${descriptionText}</p>
              </div>

              <a href="${appUrl}" style="display:block;border-radius:999px;background:#1a73e8;color:#ffffff;text-decoration:none;text-align:center;padding:16px 20px;font-size:16px;font-weight:800">
                Lihat Pengumpulan & Upload Bukti
              </a>

              <p style="margin:26px 0 0;font-size:16px;line-height:1.7;color:#94a3b8">
                Jika sudah melakukan pembayaran, buka menu Pengumpulan Uang lalu pilih riwayat yang sesuai untuk mengunggah bukti.
              </p>
            </div>

            <div style="margin-top:20px;padding:22px 8px 0;border-top:1px solid #9ca3af">
              <p style="margin:0;font-size:15px;line-height:1.55;color:#111827">
                ${cautionText}
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

  console.log(`[Money Collection Email] Email terkirim ke ${Array.isArray(bcc) ? `${bcc.length} penerima BCC` : to} dalam ${Date.now() - startedAt}ms. messageId=${info?.messageId || '-'}`);
  return info;
};

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: process.env.DATABASE_URL || process.env.FB_DATABASE_URL,
  });
}

const firebaseAuth = admin.auth();
const firebaseDatabase = admin.database();
const firebaseMessaging = admin.messaging();

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
    const otpStore = await saveOtpRecord(decodedToken.uid, {
      hash: hashOtp(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      email: accountEmail,
      createdAt: Date.now(),
    });

    await sendOtpEmail({ email: accountEmail, name: decodedToken.name, code });

    console.log(`[Auth OTP Request] OTP baru dibuat di ${otpStore} dan email dikirim ke ${accountEmail}.`);

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

app.post('/auth/reset-otp', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    await removeOtpRecord(authContext.decodedToken.uid);

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Auth OTP Reset] Failed:', error);
    return res.status(500).json({
      error: 'OTP reset failed',
      message: error?.message || 'OTP lama belum berhasil direset.',
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

    const { record, source } = await readOtpRecord(decodedToken.uid);
    if (!record || record.expiresAt < Date.now()) {
      await removeOtpRecord(decodedToken.uid, source);
      return res.status(400).json({ error: 'Expired OTP', message: 'Kode OTP sudah kedaluwarsa. Kirim ulang kode.' });
    }

    if (record.attempts >= 5) {
      await removeOtpRecord(decodedToken.uid, source);
      return res.status(429).json({ error: 'Too many attempts', message: 'OTP terlalu sering salah. Kirim ulang kode.' });
    }

    if (record.hash !== hashOtp(code)) {
      record.attempts += 1;
      await updateOtpRecord(decodedToken.uid, source, { attempts: record.attempts });
      return res.status(400).json({ error: 'Wrong OTP', message: 'Kode OTP belum cocok.' });
    }

    await removeOtpRecord(decodedToken.uid, source);
    return res.json({ ok: true });
  } catch (error) {
    console.error('[Auth OTP Verify] Failed:', error);
    return res.status(500).json({
      error: 'OTP verify failed',
      message: error?.message || 'Kode OTP belum berhasil diverifikasi.',
    });
  }
});

app.get('/auth/totp/status', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, enabled: true, skipped: true });
    }

    const { record } = await readTotpRecord(decodedToken.uid);
    return res.json({ ok: true, enabled: Boolean(record?.secret) });
  } catch (error) {
    console.error('[Auth TOTP Status] Failed:', error);
    return res.status(500).json({
      error: 'TOTP status failed',
      message: error?.message || 'Status Google Authenticator belum bisa dicek.',
    });
  }
});

app.post('/auth/totp/start', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, skipped: true });
    }

    const existing = await readTotpRecord(decodedToken.uid);
    if (existing.record?.secret) {
      return res.json({ ok: true, enabled: true });
    }

    const secret = generateBase32Secret();
    const label = encodeURIComponent(`KKN 35:${accountEmail}`);
    const issuer = encodeURIComponent('KKN 35 UMP');
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    await saveTotpSetupRecord(decodedToken.uid, {
      secret,
      email: accountEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return res.json({ ok: true, enabled: false, secret, otpauthUrl });
  } catch (error) {
    console.error('[Auth TOTP Start] Failed:', error);
    return res.status(500).json({
      error: 'TOTP start failed',
      message: error?.message || 'Setup Google Authenticator belum bisa dimulai.',
    });
  }
});

app.post('/auth/totp/confirm', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, skipped: true });
    }

    const code = String(req.body?.code || '').replace(/\D/g, '');
    const { record, source } = await readTotpSetupRecord(decodedToken.uid);
    if (!record?.secret || record.expiresAt < Date.now()) {
      await removeTotpSetupRecord(decodedToken.uid, source);
      return res.status(400).json({ error: 'Expired setup', message: 'Setup Google Authenticator kedaluwarsa. Buat kunci baru.' });
    }

    if (!verifyTotpCode(record.secret, code)) {
      return res.status(400).json({ error: 'Wrong TOTP', message: 'Kode Google Authenticator belum cocok.' });
    }

    await saveTotpRecord(decodedToken.uid, {
      secret: record.secret,
      email: accountEmail,
      enabledAt: Date.now(),
    });
    await removeTotpSetupRecord(decodedToken.uid, source);

    return res.json({ ok: true, enabled: true });
  } catch (error) {
    console.error('[Auth TOTP Confirm] Failed:', error);
    return res.status(500).json({
      error: 'TOTP confirm failed',
      message: error?.message || 'Google Authenticator belum berhasil dikonfirmasi.',
    });
  }
});

app.post('/auth/totp/verify', otpLimiter, async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) {
      return res.json({ ok: true, skipped: true });
    }

    const code = String(req.body?.code || '').replace(/\D/g, '');
    const { record } = await readTotpRecord(decodedToken.uid);
    if (!record?.secret) {
      return res.status(400).json({ error: 'TOTP not configured', message: 'Google Authenticator belum dibuat. Setup dulu atau pakai OTP email.' });
    }

    if (!verifyTotpCode(record.secret, code)) {
      return res.status(400).json({ error: 'Wrong TOTP', message: 'Kode Google Authenticator belum cocok.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Auth TOTP Verify] Failed:', error);
    return res.status(500).json({
      error: 'TOTP verify failed',
      message: error?.message || 'Kode Google Authenticator belum berhasil diverifikasi.',
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

app.post('/money-collections/notify', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;

    const sender = req.body?.sender || {};
    const collection = req.body?.collection || {};
    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    const senderDivision = String(sender.division || '').toLowerCase();

    if (!senderDivision.startsWith('bendahara') && authContext.accountEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden', message: 'Hanya bendahara yang boleh mengirim informasi pengumpulan uang.' });
    }

    if (!collection?.title || !collection?.amount) {
      return res.status(400).json({ error: 'Bad Request', message: 'Data pengumpulan uang belum lengkap.' });
    }

    const appUrl = req.body?.appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin';
    const databaseRecipients = [];
    try {
      const profilesSnapshot = await withTimeout(firebaseDatabase.ref('userProfiles').get(), 8000, 'Baca userProfiles terlalu lama.');
      profilesSnapshot.forEach((child) => {
        const profile = child.val();
        const email = String(profile?.email || '').trim().toLowerCase();
        if (email && email !== ADMIN_EMAIL) {
          databaseRecipients.push({
            uid: profile?.uid || child.key,
            name: profile?.name || email.split('@')[0] || 'Divisi KKN 35',
            email,
            division: profile?.division || '',
            role: profile?.role || 'division',
          });
        }
      });
    } catch (profileReadError) {
      console.warn('[Money Collection Notify] userProfiles backend read skipped:', profileReadError?.message || profileReadError);
    }
    const authRecipients = [];
    try {
      let pageToken;
      do {
        const page = await withTimeout(firebaseAuth.listUsers(1000, pageToken), 8000, 'Baca users Auth terlalu lama.');
        page.users.forEach((userRecord) => {
          const email = String(userRecord.email || '').trim().toLowerCase();
          if (!email || email === ADMIN_EMAIL) return;
          authRecipients.push({
            uid: userRecord.uid,
            name: userRecord.displayName || email.split('@')[0] || 'Divisi KKN 35',
            email,
            role: 'division',
          });
        });
        pageToken = page.pageToken;
      } while (pageToken);
    } catch (authListError) {
      console.warn('[Money Collection Notify] Firebase Auth users fallback skipped:', authListError?.message || authListError);
    }

    const uniqueRecipients = [...databaseRecipients, ...authRecipients, ...recipients, sender]
      .filter((item) => {
        const email = String(item?.email || '').trim().toLowerCase();
        return email && email !== ADMIN_EMAIL;
      })
      .reduce((acc, item) => {
        acc.set(String(item.email).toLowerCase(), item);
        return acc;
      }, new Map());

    if (uniqueRecipients.size === 0) {
      return res.status(400).json({
        error: 'No recipients',
        message: 'Tidak ada email akun divisi/Auth yang ditemukan untuk dikirimi notifikasi.',
      });
    }

    const recipientList = [...uniqueRecipients.values()].map((item) => ({
      ...item,
      email: String(item.email || '').trim().toLowerCase(),
      name: item.name || item.division || String(item.email || '').split('@')[0] || 'Divisi KKN 35',
    }));
    const recipientEmails = recipientList.map((item) => item.email);
    console.log('[Money Collection Notify] Recipients:', {
      userProfiles: databaseRecipients.length,
      authUsers: authRecipients.length,
      frontendRecipients: recipients.length,
      unique: recipientEmails.length,
      emails: recipientEmails,
    });

    const emailResults = [];
    for (const recipient of recipientList) {
      try {
        await sendMoneyCollectionEmail({
          to: recipient.email,
          name: recipient.name,
          collection,
          appUrl,
        });
        emailResults.push({ ok: true, email: recipient.email });
      } catch (emailError) {
        emailResults.push({
          ok: false,
          email: recipient.email,
          error: emailError?.message || 'SMTP gagal mengirim email.',
        });
      }
    }

    const sentCount = emailResults.filter((result) => result.ok).length;
    const failedResults = emailResults.filter((result) => !result.ok);
    if (failedResults.length) {
      console.warn('[Money Collection Notify] Some emails failed:', failedResults);
    }
    if (sentCount === 0) {
      const firstError = failedResults[0]?.error || 'SMTP gagal mengirim email.';
      return res.status(502).json({
        error: 'Email send failed',
        message: `Notifikasi email belum terkirim. ${firstError}`,
        sent: 0,
        failed: failedResults.length,
        recipients: uniqueRecipients.size,
        profileRecipients: databaseRecipients.length,
        authRecipients: authRecipients.length,
      });
    }

    const messageRef = firebaseDatabase.ref('divisionChats/public').push();
    const message = {
      id: messageRef.key || `money_${Date.now()}`,
      chatType: 'public',
      senderUid: sender.uid || authContext.decodedToken.uid,
      senderName: sender.name || 'Bendahara',
      senderEmail: authContext.accountEmail,
      senderDivision: sender.division || 'bendahara',
      text: `INFORMASI RESMI PENGUMPULAN UANG\n${collection.title}\nJumlah: ${collection.amount}${collection.dueDate ? `\nDeadline: ${collection.dueDate}` : ''}\n${collection.description || ''}\nSilakan buka menu Pengumpulan Uang untuk upload bukti pembayaran.`,
      date: new Date().toLocaleString('id-ID'),
      createdAtMs: Date.now(),
      createdAt: Date.now(),
      systemType: 'moneyCollection',
      collectionId: collection.id || '',
    };

    await withTimeout(messageRef.set(message), 8000, 'Pesan resmi belum berhasil disimpan ke chat publik.').catch((error) => {
      console.warn('[Money Collection Notify] Chat public write skipped:', error?.message || error);
      return null;
    });

    return res.json({
      ok: true,
      sent: sentCount,
      failed: failedResults.length,
      recipients: uniqueRecipients.size,
      profileRecipients: databaseRecipients.length,
      authRecipients: authRecipients.length,
      message,
    });
  } catch (error) {
    console.error('[Money Collection Notify] Failed:', error);
    return res.status(500).json({
      error: 'Money collection notify failed',
      message: error?.message || 'Informasi resmi pengumpulan uang belum berhasil dikirim.',
    });
  }
});

const isMoneyReminderCronAllowed = (req) => {
  const cronSecret = process.env.CRON_SECRET || process.env.MONEY_COLLECTION_CRON_SECRET || '';
  const authHeader = req.get('authorization') || '';
  const querySecret = String(req.query?.secret || '');

  if (!process.env.VERCEL) return true;
  if (req.get('x-vercel-cron')) return true;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (cronSecret && querySecret === cronSecret) return true;
  return false;
};

const runMoneyCollectionDueReminders = async ({ appUrl, dryRun = false } = {}) => {
  const todayIso = getJakartaDateString();
  const targetDueDate = addDaysToIsoDate(todayIso, 3);
  const publicAppUrl = appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin';

  const [profilesSnapshot, collectionsSnapshot, remindersSnapshot] = await Promise.all([
    firebaseDatabase.ref('userProfiles').get(),
    firebaseDatabase.ref('moneyCollections').get(),
    firebaseDatabase.ref('moneyCollectionReminders').get(),
  ]);

  const profiles = [];
  profilesSnapshot.forEach((child) => {
    const profile = child.val();
    if (profile?.role === 'division' && profile?.email) {
      profiles.push({ ...profile, uid: profile.uid || child.key });
    }
  });

  const reminders = remindersSnapshot.val() || {};
  const candidates = [];
  collectionsSnapshot.forEach((child) => {
    const collection = { id: child.key, ...(child.val() || {}) };
    if (collection.dueDate !== targetDueDate) return;

    const paidUids = new Set(
      getMoneyCollectionPayments(collection)
        .map((payment) => payment.payerUid)
        .filter(Boolean)
    );

    profiles.forEach((profile) => {
      if (paidUids.has(profile.uid)) return;
      const reminderKey = reminders?.[collection.id]?.[profile.uid]?.h3;
      if (reminderKey) return;
      candidates.push({ profile, collection });
    });
  });

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      today: todayIso,
      targetDueDate,
      candidates: candidates.length,
    };
  }

  const results = await Promise.allSettled(
    candidates.map(({ profile, collection }) =>
      sendMoneyCollectionEmail({
        to: profile.email,
        name: profile.name,
        collection,
        appUrl: publicAppUrl,
        reminder: true,
        daysUntilDue: 3,
      })
    )
  );

  const reminderUpdates = {};
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const { profile, collection } = candidates[index];
    reminderUpdates[`moneyCollectionReminders/${collection.id}/${profile.uid}/h3`] = {
      sentAt: Date.now(),
      sentAtText: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      email: profile.email,
      dueDate: collection.dueDate,
    };
  });

  if (Object.keys(reminderUpdates).length > 0) {
    await firebaseDatabase.ref().update(reminderUpdates);
  }

  return {
    ok: true,
    today: todayIso,
    targetDueDate,
    checkedProfiles: profiles.length,
    candidates: candidates.length,
    sent: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
};

app.get('/money-collections/remind-due', async (req, res) => {
  try {
    if (!isMoneyReminderCronAllowed(req)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Cron secret tidak valid.' });
    }

    const result = await runMoneyCollectionDueReminders({
      appUrl: req.query?.appUrl ? String(req.query.appUrl) : undefined,
      dryRun: String(req.query?.dryRun || '') === '1',
    });
    return res.json(result);
  } catch (error) {
    console.error('[Money Collection Reminder] Failed:', error);
    return res.status(500).json({
      error: 'Money collection reminder failed',
      message: error?.message || 'Pengingat pengumpulan uang belum berhasil dikirim.',
    });
  }
});

app.post('/money-collections/remind-due', async (req, res) => {
  try {
    if (!isMoneyReminderCronAllowed(req)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Cron secret tidak valid.' });
    }

    const result = await runMoneyCollectionDueReminders({
      appUrl: req.body?.appUrl,
      dryRun: Boolean(req.body?.dryRun),
    });
    return res.json(result);
  } catch (error) {
    console.error('[Money Collection Reminder] Failed:', error);
    return res.status(500).json({
      error: 'Money collection reminder failed',
      message: error?.message || 'Pengingat pengumpulan uang belum berhasil dikirim.',
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

const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.FUNCTION_TARGET || process.env.K_SERVICE);
const server = isServerlessRuntime
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
