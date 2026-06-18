import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

export const config = {
  maxDuration: 120,
};

const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';
const BLOCKED_EMAIL_DOMAINS = new Set([
  'kknump.plg',
  'localhost',
  'local',
  'example.com',
  'example.org',
  'test.com',
]);
const BLOCKED_EMAILS = new Set([
  ADMIN_EMAIL,
  'mputraramadhaniid1@gmail.com',
]);
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

const getEmailBlockReason = (email) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return 'Email kosong.';
  if (BLOCKED_EMAILS.has(cleanEmail)) return 'Email sistem/dummy tidak dikirim.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return 'Format email tidak valid.';

  const domain = cleanEmail.split('@').pop();
  if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) return `Domain ${domain || '-'} tidak menerima email publik.`;
  if (!domain.includes('.') || domain.endsWith('.local')) return `Domain ${domain} tidak valid untuk pengiriman email.`;

  return '';
};

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
  const displayName = name || 'Divisi KKN 35';
  const safeName = escapeHtml(displayName);
  const titleText = collection.title || 'Pengumpulan Uang KKN 35';
  const amountText = collection.amount || '-';
  const paymentMethodText = collection.paymentMethod || '-';
  const paymentAccountText = collection.paymentAccount || '-';
  const dueDateText = collection.dueDate || '-';
  const descriptionText = collection.description || '-';
  const headline = 'Pengumpulan Uang KKN 35';
  const introText = 'Bendahara membuat informasi pengumpulan uang baru pada dashboard KKN 35 UMP. Silakan lihat detail dan upload bukti pembayaran melalui tombol di bawah.';
  const cautionText =
    'Informasi: Email ini dikirim otomatis oleh sistem KKN 35 UMP sebagai pemberitahuan resmi dari bendahara. ' +
    'Silakan login ke dashboard divisi untuk melihat detail dan mengunggah bukti pembayaran. ' +
    'Abaikan email ini jika Anda bukan bagian dari akun divisi KKN 35 UMP.';

  return withTimeout(
    transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_SENDER_ADDRESS || process.env.SMTP_USER,
      to,
      subject: `[TAGIHAN] Pengumpulan Uang KKN 35: ${titleText}`,
      text:
        `Halo ${displayName},\n\n` +
        `${introText}\n\n` +
        `=========================================\n` +
        `DETAIL TAGIHAN PEMBAYARAN\n` +
        `=========================================\n` +
        `Nama Kegiatan : ${titleText}\n` +
        `Jumlah Tagihan: ${amountText}\n` +
        `Metode Bayar  : ${paymentMethodText}\n` +
        `No. Rek/E-Wallet: ${paymentAccountText}\n` +
        `Batas Waktu   : ${dueDateText}\n` +
        `Keterangan    : ${descriptionText}\n` +
        `=========================================\n\n` +
        `Buka dashboard divisi untuk melihat detail dan upload bukti pembayaran:\n${appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin'}\n\n` +
        `---\n${cautionText}`,
      html: `
        <!--[if !mso]><!-->
        <div style="display:none;max-height:0px;overflow:hidden;">
          Halo ${safeName}, ${escapeHtml(introText)}
        </div>
        <!--<![endif]-->
        <div style="margin:0;padding:40px 16px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
          <div style="max-width:580px;margin:0 auto;">
            <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid #10b981;border-radius:12px;padding:44px 36px 36px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);">
              <div style="text-align:center;margin-bottom:28px;">
                <img src="${logoUrl}" alt="Logo KKN 35" width="80" height="80" style="display:inline-block;width:80px;height:80px;border-radius:50%;border:2px solid #f1f5f9;background-color:#ffffff;padding:4px;object-fit:contain;" />
              </div>

              <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:800;color:#0f172a;text-align:center;">
                ${headline}
              </h1>

              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
              Halo <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                ${escapeHtml(introText)}
              </p>

              <div style="margin:32px 0;padding:24px;border-radius:8px;background-color:#f0fdf4;border:1px solid #d1fae5;">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#047857;margin-bottom:16px;font-family:sans-serif;">
                  INFORMASI PEMBAYARAN
                </div>

                <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a;">
                  ${escapeHtml(titleText)}
                </h3>

                <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
                  <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                    <td style="padding:10px 0;font-weight:600;color:#64748b;width:40%;">Jumlah Tagihan</td>
                    <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(amountText)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                    <td style="padding:10px 0;font-weight:600;color:#64748b;">Metode Pembayaran</td>
                    <td style="padding:10px 0;color:#0f172a;text-align:right;">${escapeHtml(paymentMethodText)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                    <td style="padding:10px 0;font-weight:600;color:#64748b;">No. Rekening / E-Wallet</td>
                    <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:right;font-family:monospace;">${escapeHtml(paymentAccountText)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                    <td style="padding:10px 0;font-weight:600;color:#64748b;">Batas Waktu (Deadline)</td>
                    <td style="padding:10px 0;font-weight:700;color:#ef4444;text-align:right;">${escapeHtml(dueDateText)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 0;font-weight:600;color:#64748b;vertical-align:top;">Keterangan</td>
                    <td style="padding:10px 0 0;color:#475569;text-align:right;font-size:13px;line-height:1.4;">${escapeHtml(descriptionText)}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align:center;margin:32px 0 24px;">
                <a href="${escapeHtml(appUrl || 'https://kkn35ump-desa-gelam.vercel.app/#admin')}" style="display:inline-block;padding:14px 32px;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  Upload Bukti Pembayaran
                </a>
              </div>

              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
                Jika Anda sudah membayar dan mengunggah bukti, silakan abaikan email ini atau hubungi Bendahara untuk verifikasi manual.
              </p>
            </div>

            <div style="margin-top:24px;padding:0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                ${escapeHtml(cautionText)}
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
    const skippedEmails = [];

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
      const blockReason = getEmailBlockReason(email);
      if (blockReason) {
        if (email) skippedEmails.push({ email, reason: blockReason, source: 'userProfiles' });
        return;
      }
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
          const blockReason = getEmailBlockReason(email);
          if (blockReason) {
            if (email) skippedEmails.push({ email, reason: blockReason, source: 'firebaseAuth' });
            return;
          }
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
        const blockReason = getEmailBlockReason(email);
        if (blockReason) {
          if (email) skippedEmails.push({ email, reason: blockReason, source: 'payload' });
          return false;
        }
        return true;
      })
      .reduce((map, item) => {
        map.set(String(item.email).toLowerCase(), item);
        return map;
      }, new Map());

    if (uniqueRecipients.size === 0) {
      return res.status(400).json({
        error: 'No recipients',
        message: 'Tidak ada email akun divisi valid yang bisa dikirimi notifikasi.',
        skippedEmails,
      });
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
        skippedEmails,
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
      skippedEmails,
      message,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Money collection notify failed',
      message: error?.message || 'Informasi resmi pengumpulan uang belum berhasil dikirim.',
    });
  }
}
