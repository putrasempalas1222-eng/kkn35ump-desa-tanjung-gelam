import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

export const config = {
  maxDuration: 120,
};

const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';
const databaseURL =
  process.env.DATABASE_URL ||
  process.env.FB_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  'https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

const getServiceAccount = () => {
  const raw =
    process.env.FB_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (raw) {
    try {
      let json = raw.trim();
      if (!json.startsWith('{')) json = Buffer.from(json, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(json);
      if (serviceAccount.private_key) serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
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
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.SMTP_SERVER_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.SMTP_ACCOUNT_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.SMTP_ACCOUNT_PASSWORD;
  const mode = String(process.env.SMTP_SECURITY_MODE || process.env.SMTP_SECURE || '').toLowerCase();

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    pool: true,
    host,
    port,
    secure: port === 465 || mode === 'ssl',
    requireTLS: mode === 'tls' || port === 587,
    maxConnections: 1,
    maxMessages: 100,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    auth: { user, pass },
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

const getAuthenticatedUser = async (req, res) => {
  const app = getFirebaseAdmin();
  if (!app) {
    res.status(503).json({
      error: 'Firebase Admin is not configured.',
      message: 'Set FB_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables, then redeploy.',
    });
    return null;
  }

  const authHeader = String(req.headers.authorization || '');
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token login tidak ditemukan.' });
    return null;
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const accountEmail = String(decodedToken.email || '').trim().toLowerCase();
  if (!accountEmail) {
    res.status(400).json({ error: 'Missing email', message: 'Email akun tidak ditemukan.' });
    return null;
  }
  return { decodedToken, accountEmail };
};

const sendMoneyEmail = async ({ transporter, to, name, collection, appUrl }) => {
  const publicBaseUrl = (process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://kkn35ump-desa-gelam.vercel.app').replace(/\/$/, '');
  const logoUrl = `${publicBaseUrl}/report-assets/logokknv1.png`;
  const safeName = escapeHtml(name || 'Divisi KKN 35');
  const title = escapeHtml(collection.title || 'Pengumpulan Uang KKN 35');
  const amount = escapeHtml(collection.amount || '-');
  const paymentMethod = escapeHtml(collection.paymentMethod || '-');
  const paymentAccount = escapeHtml(collection.paymentAccount || '-');
  const dueDate = escapeHtml(collection.dueDate || '-');
  const description = escapeHtml(collection.description || '-');
  const safeAppUrl = escapeHtml(appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin');

  return withTimeout(
    transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_SENDER_ADDRESS || process.env.SMTP_USER,
      to,
      subject: `Pengumpulan Uang KKN 35 - ${collection.title || 'Informasi Resmi'}`,
      text:
        `Pengumpulan Uang KKN 35\n\n` +
        `Halo ${name || 'Divisi KKN 35'},\n\n` +
        `Bendahara membuat informasi pengumpulan uang baru pada dashboard KKN 35 UMP.\n\n` +
        `Nama Pengumpulan: ${collection.title || '-'}\n` +
        `Jumlah: ${collection.amount || '-'}\n` +
        `Metode Pembayaran: ${collection.paymentMethod || '-'}\n` +
        `Nomor Rekening/E-Wallet: ${collection.paymentAccount || '-'}\n` +
        `Deadline: ${collection.dueDate || '-'}\n` +
        `Keterangan: ${collection.description || '-'}\n\n` +
        `Buka dashboard untuk upload bukti pembayaran: ${appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin'}`,
      html: `
      <div style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#001b44">
        <div style="max-width:720px;margin:0 auto;padding:14px 16px 0">
          <div style="background:#ffffff;border-radius:6px;padding:30px 34px 22px">
            <img src="${logoUrl}" alt="Logo KKN 35" width="86" style="display:block;width:86px;max-width:86px;height:auto;margin:0 0 28px;border-radius:50%" />

            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.2;font-weight:800;color:#000000">
              Pengumpulan Uang KKN 35
            </h1>

            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#001b44">
              Halo <strong>${safeName}</strong>,
            </p>
            <p style="margin:0;font-size:14px;line-height:1.65;color:#001b44">
              Bendahara membuat informasi pengumpulan uang baru pada
              <strong>dashboard KKN 35 UMP</strong>. Silakan lihat detail dan upload bukti pembayaran.
            </p>

            <div style="margin:34px 0 28px;padding:22px 18px;border-radius:8px;background:#fff8f0;border:1px solid #fed7aa">
              <div style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#ff7300">
                Informasi Pengumpulan
              </div>
              <h2 style="margin:0 0 16px;font-size:22px;line-height:1.25;font-weight:800;color:#000000">${title}</h2>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#001b44"><strong>Jumlah:</strong> ${amount}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#001b44"><strong>Metode:</strong> ${paymentMethod}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#001b44"><strong>Nomor:</strong> ${paymentAccount}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#001b44"><strong>Deadline:</strong> ${dueDate}</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#001b44"><strong>Keterangan:</strong> ${description}</p>
            </div>

            <a href="${safeAppUrl}" style="display:block;border-radius:8px;background:#ff7300;color:#ffffff;text-decoration:none;text-align:center;padding:14px 18px;font-size:14px;font-weight:800">
              Buka Dashboard & Upload Bukti
            </a>

            <p style="margin:24px 0 0;font-size:11px;line-height:1.65;color:#7f8ba7">
              Email ini dikirim otomatis oleh sistem KKN 35 UMP sebagai pemberitahuan resmi dari bendahara.
            </p>
          </div>

          <div style="margin-top:14px;padding:16px 6px 0;border-top:1px solid #8b95aa">
            <p style="margin:0;font-size:10px;line-height:1.45;color:#001b44">
              Informasi: Abaikan email ini jika Anda bukan bagian dari akun divisi KKN 35 UMP.
            </p>
          </div>
        </div>
      </div>
    `,
    }),
    25000,
    `SMTP timeout saat mengirim ke ${to}.`
  );
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

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
    const profilesSnapshot = await admin.database().ref('userProfiles').get().catch(() => null);
    profilesSnapshot?.forEach((child) => {
      const profile = child.val();
      const email = String(profile?.email || '').trim().toLowerCase();
      if (!email || email === ADMIN_EMAIL) return;
      databaseRecipients.push({
        uid: profile?.uid || child.key,
        name: profile?.name || profile?.division || email.split('@')[0],
        email,
        division: profile?.division || '',
      });
    });

    const authRecipients = [];
    try {
      let pageToken;
      do {
        const page = await admin.auth().listUsers(1000, pageToken);
        page.users.forEach((userRecord) => {
          const email = String(userRecord.email || '').trim().toLowerCase();
          if (!email || email === ADMIN_EMAIL) return;
          authRecipients.push({
            uid: userRecord.uid,
            name: userRecord.displayName || email.split('@')[0],
            email,
          });
        });
        pageToken = page.pageToken;
      } while (pageToken);
    } catch {
      // Database recipients and frontend payload are enough when Auth listUsers is not allowed.
    }

    const uniqueRecipients = [...databaseRecipients, ...authRecipients, ...recipients, sender]
      .filter((item) => {
        const email = String(item?.email || '').trim().toLowerCase();
        return email && email !== ADMIN_EMAIL;
      })
      .reduce((map, item) => {
        map.set(String(item.email).toLowerCase(), item);
        return map;
      }, new Map());

    if (uniqueRecipients.size === 0) {
      return res.status(400).json({ error: 'No recipients', message: 'Tidak ada email akun divisi yang ditemukan.' });
    }

    const transporter = getTransporter();
    if (!transporter) {
      return res.status(503).json({
        error: 'SMTP is not configured.',
        message: 'SMTP belum dikonfigurasi di Vercel Environment Variables. Isi SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, dan SMTP_FROM.',
      });
    }

    const recipientList = [...uniqueRecipients.values()].map((recipient) => {
      const email = String(recipient.email || '').trim().toLowerCase();
      return {
        ...recipient,
        email,
        name: recipient.name || recipient.division || email.split('@')[0] || 'Divisi KKN 35',
      };
    });

    const emailResults = [];
    for (let index = 0; index < recipientList.length; index += 1) {
      const recipient = recipientList[index];
      const email = String(recipient.email || '').trim().toLowerCase();
      try {
        await sendMoneyEmail({
          transporter,
          to: email,
          name: recipient.name,
          collection,
          appUrl,
        });
        emailResults.push({ ok: true, email });
      } catch (error) {
        await sleep(600);
        try {
          await sendMoneyEmail({
            transporter,
            to: email,
            name: recipient.name,
            collection,
            appUrl,
          });
          emailResults.push({ ok: true, email, retry: true });
        } catch (retryError) {
          emailResults.push({
            ok: false,
            email,
            error: retryError?.message || error?.message || 'SMTP gagal mengirim email.',
          });
        }
      }

      if (index < recipientList.length - 1) {
        await sleep(350);
      }
    }

    transporter.close?.();

    const sentCount = emailResults.filter((result) => result.ok).length;
    const failedResults = emailResults.filter((result) => !result.ok);
    if (sentCount === 0) {
      return res.status(502).json({
        error: 'Email send failed',
        message: `Notifikasi email belum terkirim. ${failedResults[0]?.error || 'SMTP gagal mengirim email.'}`,
        sent: 0,
        failed: failedResults.length,
        recipients: uniqueRecipients.size,
        failedEmails: failedResults.map((result) => ({ email: result.email, error: result.error })),
      });
    }

    const messageRef = admin.database().ref('divisionChats/public').push();
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
    await messageRef.set(message).catch(() => undefined);

    return res.status(200).json({
      ok: true,
      sent: sentCount,
      failed: failedResults.length,
      recipients: uniqueRecipients.size,
      sentEmails: emailResults.filter((result) => result.ok).map((result) => result.email),
      failedEmails: failedResults.map((result) => ({ email: result.email, error: result.error })),
      message,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Money collection notify failed',
      message: error?.message || 'Informasi resmi pengumpulan uang belum berhasil dikirim.',
    });
  }
}
