import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set,
  update,
  remove,
  push,
  serverTimestamp,
  get,
} from 'firebase/database';
import {
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
} from 'firebase/messaging';
import {
  DivisionName,
  EventContent,
  GalleryImage,
  LiveLocation,
  Program,
  ReviewSubmission,
  SiteContent,
  TeamMember,
  Testimonial,
  UserProfile,
  DivisionSlot,
  WeeklyReport,
  CompetitionItem,
  CompetitionRegistration,
  DivisionNote,
  DivisionChatMessage,
  MoneyCollection,
  MoneyCollectionPayment,
} from '../types';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  status: 'unread' | 'read';
  createdAt?: number | object;
}

const DEFAULT_FIREBASE_ENV: Record<string, string> = {
  VITE_FIREBASE_API_KEY: 'AIzaSyCxFcWI6vLfGNcQMnTVRsRtXsDJfzqiWEw',
  VITE_FIREBASE_AUTH_DOMAIN: 'project-3dfa8c97-bc93-4195-a5a.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'project-3dfa8c97-bc93-4195-a5a',
  VITE_FIREBASE_STORAGE_BUCKET: 'project-3dfa8c97-bc93-4195-a5a.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '275478991025',
  VITE_FIREBASE_APP_ID: '1:275478991025:web:80d97124eb119cc039d290',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-YL95DFEMDK',
  VITE_FIREBASE_VAPID_KEY: '',
};

const getFirebaseEnv = (key: string) => import.meta.env[key] || DEFAULT_FIREBASE_ENV[key] || '';
const getBackendApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_BACKEND_API_BASE_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  return '';
};

const buildBackendApiUrl = (url: string) => {
  if (!url.startsWith('/')) return url;
  const isBackendRoute = [
    '/auth/',
    '/admin/',
    '/division-chat/',
    '/money-collections/',
    '/api-proxy',
    '/putra-ai-proxy/',
  ].some((prefix) => url.startsWith(prefix));
  const baseUrl = isBackendRoute ? getBackendApiBaseUrl() : '';
  if (baseUrl) return `${baseUrl}${url}`;
  return isBackendRoute ? `/api${url}` : url;
};

const firebaseConfig = {
  apiKey: getFirebaseEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: getFirebaseEnv('VITE_FIREBASE_DATABASE_URL'),
  projectId: getFirebaseEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getFirebaseEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getFirebaseEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getFirebaseEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getFirebaseEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => undefined);
}

const COLLECTIONS = {
  site: 'siteContent',
  event: 'eventContent',
  team: 'team',
  programs: 'programs',
  gallery: 'gallery',
  testimonials: 'testimonials',
  reviewSubmissions: 'reviewSubmissions',
  messages: 'messages',
  userProfiles: 'userProfiles',
  divisionSlots: 'divisionSlots',
  weeklyReports: 'weeklyReports',
  financialReports: 'financialReports',
  divisionNotes: 'divisionNotes',
  divisionChats: 'divisionChats',
  moneyCollections: 'moneyCollections',
  liveLocations: 'liveLocations',
  competitions: 'competitions',
  competitionRegistrations: 'competitionRegistrations',
  notificationTokens: 'notificationTokens',
};

const ACCOUNT_CREATOR_APP = 'accountCreator';

const EMPTY_SITE_CONTENT: SiteContent = {
  heroBadge: '',
  heroTitle: '',
  heroHighlight: '',
  heroSubtitle: '',
  heroImage: '',
  aboutTitle: '',
  aboutHighlight: '',
  aboutDescription: '',
  aboutDetail: '',
  aboutImage: '',
  aboutHighlights: [],
  visionTitle: '',
  visionDescription: '',
  villageTitle: '',
  villageDescription: '',
  villageOverview: '',
  villageMapUrl: '',
  contactAddress: '',
  contactEmail: '',
  contactInstagram: '',
  contactWhatsapp: '',
  videoTitle: '',
  videoSubtitle: '',
  videoDescription: '',
  videoPoster: '',
  videoSrc: '',
  maintenanceEnabled: false,
  maintenanceStart: '',
  maintenanceEnd: '',
  maintenanceTitle: 'Website sedang dalam pemeliharaan',
  maintenanceMessage: 'Silakan kembali lagi sesuai jadwal yang telah ditentukan.',
};

const EMPTY_EVENT_CONTENT: EventContent = {
  title: '',
  description: '',
  image: '',
  date: '',
  location: '',
  audience: '',
};

const mapRecordToArray = <T extends { id: string }>(value: unknown): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as T[];

  return Object.entries(value as Record<string, Omit<T, 'id'> & { id?: string }>).map(([id, item]) => ({
    ...item,
    id: item.id || id,
  })) as T[];
};

const subscribeValue = <T,>(path: string, fallback: T, callback: (data: T) => void) => {
  return onValue(
    ref(database, path),
    (snapshot) => {
      const value = snapshot.val();
      callback(value && typeof value === 'object' ? ({ ...fallback, ...value } as T) : fallback);
    },
    () => callback(fallback)
  );
};

const subscribeList = <T extends { id: string }>(path: string, callback: (data: T[]) => void) => {
  return onValue(
    ref(database, path),
    (snapshot) => {
      const data = mapRecordToArray<T>(snapshot.val());
      callback(data);
    },
    () => callback([])
  );
};

const saveList = async <T extends { id: string }>(path: string, data: T[]) => {
  const record = data.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
  await set(ref(database, path), record);
};

const upsertItem = async <T extends { id: string }>(path: string, item: T) => {
  const id = item.id || push(ref(database, path)).key || `${path}_${Date.now()}`;
  await set(ref(database, `${path}/${id}`), { ...item, id });
  return id;
};

const getAccountCreatorAuth = () => {
  const secondaryApp =
    getApps().find((firebaseApp) => firebaseApp.name === ACCOUNT_CREATOR_APP) ||
    initializeApp(firebaseConfig, ACCOUNT_CREATOR_APP);
  return getAuth(secondaryApp);
};

const PROFANE_WORDS = [
  'anjing',
  'bangsat',
  'bajingan',
  'kontol',
  'memek',
  'ngentot',
  'goblok',
  'tolol',
  'bodoh',
  'idiot',
  'kampret',
  'tai',
  'asu',
  'jancok',
  'fuck',
  'shit',
  'bitch',
];

const formatDivisionLabelLocal = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (/\d+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join(' ');

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const validatePublicReview = (review: Pick<ReviewSubmission, 'name' | 'role' | 'quote'>) => {
  const combined = normalizeText(`${review.name} ${review.role} ${review.quote}`);
  const words = combined.split(' ').filter(Boolean);
  const wordCounts = words.reduce<Record<string, number>>((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  if (review.name.trim().length < 3 || review.quote.trim().length < 20) {
    return 'Nama minimal 3 karakter dan ulasan minimal 20 karakter.';
  }

  if (PROFANE_WORDS.some((word) => combined.includes(word))) {
    return 'Ulasan mengandung kata yang tidak pantas. Silakan gunakan bahasa yang lebih sopan.';
  }

  if (/https?:\/\/|www\.|bit\.ly|t\.me|wa\.me/i.test(review.quote)) {
    return 'Ulasan tidak boleh berisi link atau promosi.';
  }

  if (/(.)\1{5,}/i.test(review.quote)) {
    return 'Ulasan terdeteksi seperti spam karena memakai karakter berulang terlalu banyak.';
  }

  if (Object.values(wordCounts).some((count) => count >= 6)) {
    return 'Ulasan terdeteksi seperti spam karena kata yang sama diulang terlalu sering.';
  }

  if (review.quote.length > 500) {
    return 'Ulasan terlalu panjang. Maksimal 500 karakter.';
  }

  return '';
};

const validateCompetitionRegistration = (reg: Pick<CompetitionRegistration, 'name' | 'phone' | 'age' | 'address' | 'notes'>) => {
  const name = reg.name.trim();
  const phone = reg.phone.trim();
  const age = reg.age.trim();

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]{3,80}$/.test(name)) {
    return 'Nama lengkap hanya boleh berisi huruf dan minimal 3 karakter.';
  }

  if (!/^(08|628)\d{8,12}$/.test(phone)) {
    return 'Nomor HP harus angka saja, diawali 08 atau 628, minimal 10 digit dan maksimal 14 digit.';
  }

  if (age && (!/^\d{1,3}$/.test(age) || Number(age) < 1 || Number(age) > 100)) {
    return 'Usia harus berada di antara 1 sampai 100.';
  }

  if (reg.address.length > 120 || reg.notes.length > 160) {
    return 'Alamat maksimal 120 karakter dan catatan maksimal 160 karakter.';
  }

  if (/[<>]/.test(`${reg.address}${reg.notes}`)) {
    return 'Alamat dan catatan tidak boleh memakai karakter < atau >.';
  }

  return '';
};

const fetchJsonWithTimeout = async (url: string, options: RequestInit, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const requestUrl = buildBackendApiUrl(url);

  try {
    const response = await fetch(requestUrl, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (
      response.status === 502 &&
      (url.startsWith('/auth/') || url.startsWith('/money-collections/')) &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      const fallbackResponse = await fetch(`http://127.0.0.1:5000${url}`, { ...options, signal: controller.signal });
      const fallbackPayload = await fallbackResponse.json().catch(() => ({}));
      return { response: fallbackResponse, payload: fallbackPayload };
    }
    return { response, payload };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      if (url.startsWith('/money-collections/')) {
        throw new Error('Notifikasi email terlalu lama. Cek backend/Vercel env SMTP Gmail, lalu coba kirim ulang.');
      }
      throw new Error('Kirim OTP terlalu lama. Cek backend/Vercel env SMTP dan Firebase, lalu tekan Kirim ulang OTP.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const getMessagingTokenKey = (token: string) => token.replace(/[.#$/[\]]/g, '_');

const getServiceWorkerRegistration = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  return navigator.serviceWorker.ready.catch(() => undefined);
};

export const storage = {
  defaults: {
    siteContent: EMPTY_SITE_CONTENT,
    eventContent: EMPTY_EVENT_CONTENT,
  },

  init: async () => undefined,

  onAuthChange: (callback: (user: FirebaseUser | null) => void) => onAuthStateChanged(auth, callback),
  login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
  requestLoginOtp: async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout(
      '/auth/request-otp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      60000
    );
    if (!response.ok) throw new Error(payload?.message || 'Kode OTP belum berhasil dikirim.');
    return payload as { ok: boolean; skipped?: boolean; email?: string; expiresInSeconds?: number };
  },
  verifyLoginOtp: async (code: string) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error(payload?.message || 'Kode OTP belum cocok.');
    return payload as { ok: boolean; skipped?: boolean };
  },
  getLoginTotpStatus: async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/auth/totp/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(payload?.message || 'Status Google Authenticator belum bisa dicek.');
    return payload as { ok: boolean; enabled: boolean; skipped?: boolean };
  },
  startLoginTotpSetup: async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/auth/totp/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(payload?.message || 'Setup Google Authenticator belum bisa dimulai.');
    return payload as { ok: boolean; enabled?: boolean; skipped?: boolean; secret?: string; otpauthUrl?: string };
  },
  confirmLoginTotpSetup: async (code: string) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/auth/totp/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error(payload?.message || 'Kode Google Authenticator belum cocok.');
    return payload as { ok: boolean; enabled?: boolean; skipped?: boolean };
  },
  verifyLoginTotp: async (code: string) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/auth/totp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error(payload?.message || 'Kode Google Authenticator belum cocok.');
    return payload as { ok: boolean; skipped?: boolean };
  },
  sendPasswordReset: (email: string) =>
    sendPasswordResetEmail(auth, email.trim(), {
      url: `${window.location.origin}/#admin`,
      handleCodeInApp: false,
    }),
  logout: () => signOut(auth),

  subscribeUserProfile: (uid: string, callback: (data: UserProfile | null) => void) => {
    if (!uid) {
      callback(null);
      return () => undefined;
    }

    return onValue(
      ref(database, `${COLLECTIONS.userProfiles}/${uid}`),
      (snapshot) => callback(snapshot.val() || null),
      () => callback(null)
    );
  },
  getUserProfile: async (uid: string) => {
    if (!uid) return null;
    const snapshot = await get(ref(database, `${COLLECTIONS.userProfiles}/${uid}`));
    return (snapshot.val() || null) as UserProfile | null;
  },
  subscribeUserProfiles: (callback: (data: UserProfile[]) => void) =>
    subscribeList<UserProfile>(COLLECTIONS.userProfiles, (profiles) =>
      callback(profiles.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name)))
    ),
  subscribeDivisionSlots: (callback: (data: DivisionSlot[]) => void) =>
    subscribeList<DivisionSlot>(COLLECTIONS.divisionSlots, (slots) =>
      callback(slots.sort((a, b) => a.label.localeCompare(b.label)))
    ),
  saveDivisionSlot: async (slot: Omit<DivisionSlot, 'id'> & { id?: string }) => {
    const value = slot.value.trim().toLowerCase().replace(/\s+/g, ' ');
    const id = slot.id || value.replace(/[.#$/[\]]/g, '_');
    await set(ref(database, `${COLLECTIONS.divisionSlots}/${id}`), {
      ...slot,
      id,
      value,
      label: slot.label.trim() || formatDivisionLabelLocal(value),
      defaultName: slot.defaultName || '',
      createdAt: serverTimestamp(),
    });
    return id;
  },
  deleteDivisionSlot: (id: string) => remove(ref(database, `${COLLECTIONS.divisionSlots}/${id}`)),
  createDivisionAccount: async (account: {
    email: string;
    password: string;
    name: string;
    division: DivisionName;
  }) => {
    const creatorAuth = getAccountCreatorAuth();
    const email = account.email.trim();
    const profilesSnapshot = await get(ref(database, COLLECTIONS.userProfiles));
    const existingProfiles = Object.values((profilesSnapshot.val() || {}) as Record<string, UserProfile>);
    const existingDivisionProfile = existingProfiles.find((profile) => profile.role === 'division' && profile.division === account.division);

    if (existingDivisionProfile) {
      throw new Error('Divisi ini sudah punya akun. Setiap divisi hanya boleh memiliki satu akun.');
    }

    let credential;

    try {
      credential = await createUserWithEmailAndPassword(creatorAuth, email, account.password);
    } catch (error: any) {
      if (error?.code !== 'auth/email-already-in-use') throw error;
      credential = await signInWithEmailAndPassword(creatorAuth, email, account.password);
    }

    const profile: UserProfile = {
      id: credential.user.uid,
      uid: credential.user.uid,
      email,
      name: account.name.trim(),
      division: account.division,
      role: 'division',
      createdAt: serverTimestamp(),
    };

    await set(ref(database, `${COLLECTIONS.userProfiles}/${credential.user.uid}`), profile);
    await signOut(creatorAuth);
    return profile;
  },
  updateUserProfile: (profile: UserProfile) =>
    set(ref(database, `${COLLECTIONS.userProfiles}/${profile.uid}`), profile),
  deleteUserProfile: async (uid: string) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');

    const response = await fetch('/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      let message = 'Akun belum berhasil dihapus dari Firebase Auth.';
      try {
        const payload = await response.json();
        message = payload?.message || message;
      } catch {
        message = await response.text().catch(() => message);
      }
      throw new Error(message);
    }
  },

  subscribeSiteContent: (callback: (data: SiteContent) => void) =>
    subscribeValue<SiteContent>(COLLECTIONS.site, EMPTY_SITE_CONTENT, callback),
  saveSiteContent: (data: SiteContent) => set(ref(database, COLLECTIONS.site), data),

  subscribeEventContent: (callback: (data: EventContent) => void) =>
    subscribeValue<EventContent>(COLLECTIONS.event, EMPTY_EVENT_CONTENT, callback),
  saveEventContent: (data: EventContent) => set(ref(database, COLLECTIONS.event), data),

  subscribeTeam: (callback: (data: TeamMember[]) => void) => subscribeList(COLLECTIONS.team, callback),
  saveTeam: (data: TeamMember[]) => saveList(COLLECTIONS.team, data),
  upsertTeam: (item: TeamMember) => upsertItem(COLLECTIONS.team, item),

  subscribePrograms: (callback: (data: Program[]) => void) => subscribeList(COLLECTIONS.programs, callback),
  savePrograms: (data: Program[]) => saveList(COLLECTIONS.programs, data),
  upsertProgram: (item: Program) => upsertItem(COLLECTIONS.programs, item),

  subscribeGallery: (callback: (data: GalleryImage[]) => void) => subscribeList(COLLECTIONS.gallery, callback),
  saveGallery: (data: GalleryImage[]) => saveList(COLLECTIONS.gallery, data),
  upsertGallery: (item: GalleryImage) => upsertItem(COLLECTIONS.gallery, item),

  subscribeTestimonials: (callback: (data: Testimonial[]) => void) =>
    subscribeList(COLLECTIONS.testimonials, callback),
  saveTestimonials: (data: Testimonial[]) => saveList(COLLECTIONS.testimonials, data),
  upsertTestimonial: (item: Testimonial) => upsertItem(COLLECTIONS.testimonials, item),

  subscribeReviewSubmissions: (callback: (data: ReviewSubmission[]) => void) =>
    subscribeList<ReviewSubmission>(COLLECTIONS.reviewSubmissions, (reviews) =>
      callback(reviews.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))))
    ),
  addReviewSubmission: async (review: Omit<ReviewSubmission, 'id' | 'date' | 'status' | 'createdAt' | 'avatar'> & { avatar?: string }) => {
    const validationError = validatePublicReview({
      name: review.name,
      role: review.role,
      quote: review.quote,
    });

    if (validationError) {
      throw new Error(validationError);
    }

    const reviewRef = push(ref(database, COLLECTIONS.reviewSubmissions));
    const newReview: ReviewSubmission = {
      name: review.name.trim(),
      role: review.role.trim() || 'Pengunjung Website',
      quote: review.quote.trim(),
      avatar: review.avatar || '',
      id: reviewRef.key || `review_${Date.now()}`,
      date: new Date().toLocaleString('id-ID'),
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    await set(reviewRef, newReview);
  },
  approveReviewSubmission: async (review: ReviewSubmission) => {
    const testimonial: Testimonial = {
      id: `test_${Date.now()}`,
      name: review.name,
      role: review.role,
      quote: review.quote,
      avatar: review.avatar,
    };

    await upsertItem(COLLECTIONS.testimonials, testimonial);
    await remove(ref(database, `${COLLECTIONS.reviewSubmissions}/${review.id}`));
  },
  rejectReviewSubmission: (id: string) => remove(ref(database, `${COLLECTIONS.reviewSubmissions}/${id}`)),
  updateReviewSubmission: (review: ReviewSubmission) => set(ref(database, `${COLLECTIONS.reviewSubmissions}/${review.id}`), review),

  subscribeMessages: (callback: (data: ContactMessage[]) => void) =>
    subscribeList<ContactMessage>(COLLECTIONS.messages, (messages) =>
      callback(messages.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))))
    ),
  addMessage: async (message: Omit<ContactMessage, 'id' | 'date' | 'status'>) => {
    const messageRef = push(ref(database, COLLECTIONS.messages));
    const newMessage: ContactMessage = {
      ...message,
      id: messageRef.key || `msg_${Date.now()}`,
      date: new Date().toLocaleString('id-ID'),
      status: 'unread',
      createdAt: serverTimestamp(),
    };
    await set(messageRef, newMessage);
  },
  markMessageAsRead: (id: string) => update(ref(database, `${COLLECTIONS.messages}/${id}`), { status: 'read' }),
  deleteItem: (path: keyof typeof COLLECTIONS, id: string) => remove(ref(database, `${COLLECTIONS[path]}/${id}`)),

  subscribeWeeklyReports: (uid: string, callback: (data: WeeklyReport[]) => void) => {
    if (!uid) {
      callback([]);
      return () => undefined;
    }

    return subscribeList<WeeklyReport>(`${COLLECTIONS.weeklyReports}/${uid}`, (reports) =>
      callback(reports.sort((a, b) => Number(a.week || 0) - Number(b.week || 0)))
    );
  },
  subscribeFinancialReports: (callback: (data: WeeklyReport[]) => void) =>
    subscribeList<WeeklyReport>(COLLECTIONS.financialReports, (reports) =>
      callback(
        reports
          .filter((report) => report.reportType === 'treasurerOutput' || report.reportType === 'treasurerIncome')
          .sort((a, b) => String(b.updatedAt || b.week || '').localeCompare(String(a.updatedAt || a.week || '')))
      )
    ),
  saveWeeklyReport: async (report: WeeklyReport) => {
    const id = report.id || `week_${Date.now()}`;
    const payload = {
      ...report,
      id,
      updatedAt: serverTimestamp(),
    };
    await set(ref(database, `${COLLECTIONS.weeklyReports}/${report.userId}/${id}`), payload);

    if (report.reportType === 'treasurerOutput' || report.reportType === 'treasurerIncome') {
      await set(ref(database, `${COLLECTIONS.financialReports}/${id}`), payload);
    } else {
      await remove(ref(database, `${COLLECTIONS.financialReports}/${id}`));
    }

    return id;
  },
  deleteWeeklyReport: async (uid: string, id: string) => {
    await remove(ref(database, `${COLLECTIONS.weeklyReports}/${uid}/${id}`));
    await remove(ref(database, `${COLLECTIONS.financialReports}/${id}`));
  },

  subscribeDivisionNotes: (uid: string, callback: (data: DivisionNote[]) => void) => {
    if (!uid) {
      callback([]);
      return () => undefined;
    }

    return subscribeList<DivisionNote>(`${COLLECTIONS.divisionNotes}/${uid}`, (notes) =>
      callback(notes.sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date))))
    );
  },
  saveDivisionNote: async (note: DivisionNote) => {
    const id = note.id || `note_${Date.now()}`;
    await set(ref(database, `${COLLECTIONS.divisionNotes}/${note.userId}/${id}`), {
      ...note,
      id,
      updatedAt: serverTimestamp(),
    });
    return id;
  },
  deleteDivisionNote: (uid: string, id: string) => remove(ref(database, `${COLLECTIONS.divisionNotes}/${uid}/${id}`)),

  subscribeMoneyCollections: (callback: (data: MoneyCollection[]) => void) =>
    subscribeList<MoneyCollection>(COLLECTIONS.moneyCollections, (collections) =>
      callback(collections.sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date))))
    ),
  saveMoneyCollection: async (collection: MoneyCollection) => {
    const id = collection.id || `money_${Date.now()}`;
    await set(ref(database, `${COLLECTIONS.moneyCollections}/${id}`), {
      ...collection,
      id,
      updatedAt: serverTimestamp(),
    });
    return id;
  },
  submitMoneyCollectionPayment: async (collectionId: string, payment: Omit<MoneyCollectionPayment, 'id' | 'collectionId' | 'date'>) => {
    const paymentRef = push(ref(database, `${COLLECTIONS.moneyCollections}/${collectionId}/payments`));
    const id = paymentRef.key || `payment_${Date.now()}`;
    const payload: MoneyCollectionPayment = {
      ...payment,
      id,
      collectionId,
      date: new Date().toLocaleString('id-ID'),
      createdAt: serverTimestamp(),
    };
    await set(paymentRef, payload);
    return id;
  },
  deleteMoneyCollectionPayment: (collectionId: string, paymentId: string) =>
    remove(ref(database, `${COLLECTIONS.moneyCollections}/${collectionId}/payments/${paymentId}`)),
  deleteMoneyCollection: (collectionId: string) => remove(ref(database, `${COLLECTIONS.moneyCollections}/${collectionId}`)),
  notifyMoneyCollection: async ({
    collection,
    sender,
    recipients,
  }: {
    collection: MoneyCollection;
    sender: UserProfile;
    recipients: UserProfile[];
  }) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    let finalRecipients = recipients;
    if (!finalRecipients.length) {
      const profilesSnapshot = await get(ref(database, COLLECTIONS.userProfiles));
      if (profilesSnapshot.exists()) {
        const value = profilesSnapshot.val() as Record<string, UserProfile>;
        finalRecipients = Object.values(value || {}).filter((item) => Boolean(item?.email));
      }
    }

    const { response, payload } = await fetchJsonWithTimeout('/money-collections/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        collection,
        sender,
        recipients: finalRecipients.map((item) => ({
          uid: item.uid,
          name: item.name,
          email: item.email,
          division: item.division,
        })),
        appUrl: 'https://kkn35ump-desa-gelam.vercel.app/#admin',
      }),
    }, 60000);

    if (!response.ok) throw new Error(payload?.message || 'Informasi resmi belum berhasil dikirim.');
    return payload as { ok: boolean; sent: number; failed: number; recipients?: number };
  },

  subscribePublicDivisionChat: (callback: (data: DivisionChatMessage[]) => void) =>
    subscribeList<DivisionChatMessage>(`${COLLECTIONS.divisionChats}/public`, (messages) =>
      callback(messages.sort((a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0)))
    ),
  subscribePrivateDivisionChats: (uid: string, callback: (data: DivisionChatMessage[]) => void) => {
    if (!uid) {
      callback([]);
      return () => undefined;
    }

    return subscribeList<DivisionChatMessage>(`${COLLECTIONS.divisionChats}/privateByUser/${uid}`, (messages) =>
      callback(
        messages
          .filter((message) => message.senderUid === uid || message.recipientUid === uid)
          .sort((a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0))
      )
    );
  },
  sendDivisionChatMessage: async ({
    sender,
    text,
    recipient,
  }: {
    sender: UserProfile;
    text: string;
    recipient?: UserProfile | null;
  }) => {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    if (cleanText.length < 1) throw new Error('Pesan tidak boleh kosong.');
    if (cleanText.length > 800) throw new Error('Pesan terlalu panjang. Maksimal 800 karakter.');
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { response, payload } = await fetchJsonWithTimeout('/division-chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: cleanText,
        recipientUid: recipient?.uid || '',
      }),
    });

    if (!response.ok) throw new Error(payload?.message || 'Pesan belum berhasil dikirim.');
    return payload.message as DivisionChatMessage;
  },
  registerDivisionPushToken: async (profile: UserProfile) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      throw new Error('Browser ini belum mendukung notifikasi.');
    }
    if (Notification.permission !== 'granted') {
      throw new Error('Izin notifikasi belum aktif.');
    }

    const supported = await isMessagingSupported().catch(() => false);
    if (!supported) throw new Error('Firebase Messaging belum didukung di browser ini.');

    const vapidKey = getFirebaseEnv('VITE_FIREBASE_VAPID_KEY');
    if (!vapidKey) throw new Error('VAPID key belum diatur di frontend/.env.local.');

    const messaging = getMessaging(app);
    const serviceWorkerRegistration = await getServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    });
    if (!token) throw new Error('Token notifikasi belum berhasil dibuat.');

    const tokenKey = getMessagingTokenKey(token);
    await set(ref(database, `${COLLECTIONS.notificationTokens}/${profile.uid}/${tokenKey}`), {
      token,
      uid: profile.uid,
      email: profile.email,
      name: profile.name,
      division: profile.division,
      userAgent: navigator.userAgent,
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
    return token;
  },

  subscribeLiveLocations: (callback: (data: LiveLocation[]) => void) =>
    subscribeList<LiveLocation>(COLLECTIONS.liveLocations, (locations) =>
      callback(locations.sort((a, b) => String(a.division).localeCompare(String(b.division)) || a.name.localeCompare(b.name)))
    ),
  saveLiveLocation: async (location: LiveLocation) => {
    const locationRef = ref(database, `${COLLECTIONS.liveLocations}/${location.uid}`);
    await onDisconnect(locationRef).remove();
    await set(locationRef, location);
  },
  deleteLiveLocation: (uid: string) => remove(ref(database, `${COLLECTIONS.liveLocations}/${uid}`)),

  subscribeCompetitions: (callback: (data: CompetitionItem[]) => void) =>
    subscribeList<CompetitionItem>(COLLECTIONS.competitions, (items) =>
      callback(items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))
    ),
  upsertCompetition: (item: CompetitionItem) => upsertItem(COLLECTIONS.competitions, item),
  deleteCompetition: (id: string) => remove(ref(database, `${COLLECTIONS.competitions}/${id}`)),

  subscribeCompetitionRegistrations: (callback: (data: CompetitionRegistration[]) => void) =>
    subscribeList<CompetitionRegistration>(COLLECTIONS.competitionRegistrations, (regs) =>
      callback(regs.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))))
    ),
  addCompetitionRegistration: async (reg: Omit<CompetitionRegistration, 'id' | 'date' | 'status' | 'createdAt'>) => {
    const validationError = validateCompetitionRegistration({
      name: reg.name,
      phone: reg.phone,
      age: reg.age,
      address: reg.address,
      notes: reg.notes,
    });

    if (validationError) {
      throw new Error(validationError);
    }

    // Cek duplikat nama di lomba yang sama (case-insensitive, trim)
    const snapshot = await new Promise<CompetitionRegistration[]>((resolve) => {
      const unsub = onValue(
        ref(database, COLLECTIONS.competitionRegistrations),
        (snap) => {
          unsub();
          resolve(mapRecordToArray<CompetitionRegistration>(snap.val()));
        },
        () => resolve([])
      );
    });

    const normalizedName = reg.name.trim().toLowerCase();
    const isDuplicate = snapshot.some(
      (r) =>
        r.competitionId === reg.competitionId &&
        r.name.trim().toLowerCase() === normalizedName &&
        r.status !== 'rejected' // yang sudah ditolak boleh daftar lagi
    );

    if (isDuplicate) {
      throw new Error(`Nama "${reg.name}" sudah terdaftar di lomba ini. Satu peserta hanya boleh mendaftar satu kali.`);
    }

    const regRef = push(ref(database, COLLECTIONS.competitionRegistrations));
    const newReg: CompetitionRegistration = {
      ...reg,
      id: regRef.key || `reg_${Date.now()}`,
      date: new Date().toLocaleString('id-ID'),
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    await set(regRef, newReg);
    return newReg;
  },
  updateCompetitionRegistrationStatus: (id: string, status: CompetitionRegistration['status']) =>
    update(ref(database, `${COLLECTIONS.competitionRegistrations}/${id}`), { status }),
  deleteCompetitionRegistration: (id: string) =>
    remove(ref(database, `${COLLECTIONS.competitionRegistrations}/${id}`)),
};
