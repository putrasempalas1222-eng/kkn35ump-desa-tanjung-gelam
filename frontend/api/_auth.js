import admin from 'firebase-admin';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const config = {
  maxDuration: 30,
};

const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';
const OTP_TTL_MS = 10 * 60 * 1000;
const databaseURL =
  process.env.DATABASE_URL ||
  process.env.FB_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  'https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com';

const normalizePrivateKey = (privateKey) => {
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  let normalized = String(privateKey || '').trim().replace(/\\n/g, '\n');

  if (normalized && !normalized.includes('\n') && normalized.startsWith(header) && normalized.endsWith(footer)) {
    const body = normalized
      .slice(header.length, -footer.length)
      .replace(/\s+/g, '')
      .match(/.{1,64}/g)
      ?.join('\n');
    if (body) normalized = `${header}\n${body}\n${footer}`;
  }

  return normalized && !normalized.endsWith('\n') ? `${normalized}\n` : normalized;
};

const parseServiceAccount = () => {
  const raw =
    process.env.FB_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (raw) {
    try {
      let json = raw.trim();
      if (!json.startsWith('{')) json = Buffer.from(json, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(json);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
      }
      return serviceAccount;
    } catch {
      return null;
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  return null;
};

const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin.app();

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
};

const json = (res, status, payload) => res.status(status).json(payload);

const getAuthenticatedUser = async (req, res) => {
  const app = getFirebaseAdmin();
  if (!app) {
    json(res, 503, {
      error: 'Firebase Admin is not configured.',
      message: 'Set FB_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables, then redeploy.',
    });
    return null;
  }

  const authHeader = String(req.headers.authorization || '');
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    json(res, 401, { error: 'Unauthorized', message: 'Token login tidak ditemukan.' });
    return null;
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const accountEmail = String(decodedToken.email || '').trim().toLowerCase();
  if (!accountEmail) {
    json(res, 400, { error: 'Missing email', message: 'Email akun tidak ditemukan.' });
    return null;
  }

  return { decodedToken, accountEmail };
};

const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');
const otpRef = (uid) => admin.database().ref(`loginOtps/${uid}`);
const totpRef = (uid) => admin.database().ref(`loginTotpSecrets/${uid}`);
const totpSetupRef = (uid) => admin.database().ref(`loginTotpSetups/${uid}`);

const getTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.SMTP_SERVER_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.SMTP_ACCOUNT_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.SMTP_ACCOUNT_PASSWORD;
  const mode = String(process.env.SMTP_SECURITY_MODE || process.env.SMTP_SECURE || '').toLowerCase();

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || mode === 'ssl',
    requireTLS: mode === 'tls' || port === 587,
    auth: { user, pass },
  });
};

const sendOtpEmail = async ({ email, name, code }) => {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP belum dikonfigurasi di Vercel Environment Variables.');
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_SENDER_ADDRESS || process.env.SMTP_USER,
    to: email,
    subject: 'Kode OTP Login KKN Kelompok 35',
    text: `Halo ${name || 'akun divisi'},\n\nKode OTP login kamu: ${code}\n\nKode berlaku 10 menit.`,
    html: `<div style="font-family:Arial,sans-serif;padding:24px"><p>Halo ${name || 'akun divisi'},</p><p>Kode OTP login kamu:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px">${code}</div><p>Kode berlaku 10 menit.</p></div>`,
  });
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
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
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

const requireMethod = (req, res, method) => {
  if (req.method === method) return true;
  json(res, 405, { error: 'Method not allowed.' });
  return false;
};

export const requestOtp = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, skipped: true });

    const code = String(crypto.randomInt(100000, 1000000));
    await otpRef(decodedToken.uid).set({
      hash: hashOtp(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      email: accountEmail,
      createdAt: Date.now(),
    });
    await sendOtpEmail({ email: accountEmail, name: decodedToken.name, code });
    return json(res, 200, { ok: true, email: accountEmail, expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) });
  } catch (error) {
    return json(res, 500, { error: 'OTP request failed', message: error?.message || 'Kode OTP belum berhasil dikirim.' });
  }
};

export const verifyOtp = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, skipped: true });

    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (code.length !== 6) return json(res, 400, { error: 'Invalid OTP', message: 'Kode OTP harus 6 digit.' });

    const snapshot = await otpRef(decodedToken.uid).get();
    const record = snapshot.val();
    if (!record || record.expiresAt < Date.now()) {
      await otpRef(decodedToken.uid).remove();
      return json(res, 400, { error: 'Expired OTP', message: 'Kode OTP sudah kedaluwarsa. Kirim ulang kode.' });
    }
    if (record.attempts >= 5) {
      await otpRef(decodedToken.uid).remove();
      return json(res, 429, { error: 'Too many attempts', message: 'OTP terlalu sering salah. Kirim ulang kode.' });
    }
    if (record.hash !== hashOtp(code)) {
      await otpRef(decodedToken.uid).update({ attempts: Number(record.attempts || 0) + 1 });
      return json(res, 400, { error: 'Wrong OTP', message: 'Kode OTP belum cocok.' });
    }

    await otpRef(decodedToken.uid).remove();
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: 'OTP verify failed', message: error?.message || 'Kode OTP belum berhasil diverifikasi.' });
  }
};

export const resetOtp = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    await otpRef(authContext.decodedToken.uid).remove();
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: 'OTP reset failed', message: error?.message || 'OTP lama belum berhasil direset.' });
  }
};

export const totpStatus = async (req, res) => {
  if (!requireMethod(req, res, 'GET')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    if (authContext.accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, enabled: false, skipped: true });
    const snapshot = await totpRef(authContext.decodedToken.uid).get();
    return json(res, 200, { ok: true, enabled: Boolean(snapshot.val()?.secret) });
  } catch (error) {
    return json(res, 500, { error: 'TOTP status failed', message: error?.message || 'Status Authenticator belum bisa dicek.' });
  }
};

export const totpStart = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    const { decodedToken, accountEmail } = authContext;
    if (accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, enabled: false, skipped: true });

    const existing = (await totpRef(decodedToken.uid).get()).val();
    if (existing?.secret) return json(res, 200, { ok: true, enabled: true });

    const secret = generateBase32Secret();
    const issuer = encodeURIComponent('KKN Kelompok 35');
    const label = encodeURIComponent(`${issuer}:${accountEmail}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    await totpSetupRef(decodedToken.uid).set({ secret, email: accountEmail, createdAt: Date.now() });
    return json(res, 200, { ok: true, enabled: false, secret, otpauthUrl });
  } catch (error) {
    return json(res, 500, { error: 'TOTP start failed', message: error?.message || 'Setup Authenticator belum bisa dimulai.' });
  }
};

export const totpConfirm = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    if (authContext.accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, skipped: true });

    const code = String(req.body?.code || '').replace(/\D/g, '');
    const setup = (await totpSetupRef(authContext.decodedToken.uid).get()).val();
    if (!setup?.secret) return json(res, 400, { error: 'Missing setup', message: 'Setup Authenticator belum dimulai.' });
    if (!verifyTotpCode(setup.secret, code)) return json(res, 400, { error: 'Wrong TOTP', message: 'Kode Google Authenticator belum cocok.' });

    await totpRef(authContext.decodedToken.uid).set({
      secret: setup.secret,
      email: authContext.accountEmail,
      enabledAt: Date.now(),
    });
    await totpSetupRef(authContext.decodedToken.uid).remove();
    return json(res, 200, { ok: true, enabled: true });
  } catch (error) {
    return json(res, 500, { error: 'TOTP confirm failed', message: error?.message || 'Key Authenticator belum berhasil disimpan.' });
  }
};

export const totpVerify = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const authContext = await getAuthenticatedUser(req, res);
    if (!authContext) return;
    if (authContext.accountEmail === ADMIN_EMAIL) return json(res, 200, { ok: true, skipped: true });

    const code = String(req.body?.code || '').replace(/\D/g, '');
    const record = (await totpRef(authContext.decodedToken.uid).get()).val();
    if (!record?.secret) return json(res, 400, { error: 'TOTP disabled', message: 'Google Authenticator belum aktif.' });
    if (!verifyTotpCode(record.secret, code)) return json(res, 400, { error: 'Wrong TOTP', message: 'Kode Google Authenticator belum cocok.' });
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: 'TOTP verify failed', message: error?.message || 'Kode Authenticator belum berhasil diverifikasi.' });
  }
};
