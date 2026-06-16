import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
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
  WeeklyReport,
  CompetitionItem,
  CompetitionRegistration,
  DivisionNote,
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
};

const getFirebaseEnv = (key: string) => import.meta.env[key] || DEFAULT_FIREBASE_ENV[key] || '';

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
  isSupported()
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
  weeklyReports: 'weeklyReports',
  financialReports: 'financialReports',
  divisionNotes: 'divisionNotes',
  liveLocations: 'liveLocations',
  competitions: 'competitions',
  competitionRegistrations: 'competitionRegistrations',
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

export const storage = {
  defaults: {
    siteContent: EMPTY_SITE_CONTENT,
    eventContent: EMPTY_EVENT_CONTENT,
  },

  init: async () => undefined,

  onAuthChange: (callback: (user: FirebaseUser | null) => void) => onAuthStateChanged(auth, callback),
  login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
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
  subscribeUserProfiles: (callback: (data: UserProfile[]) => void) =>
    subscribeList<UserProfile>(COLLECTIONS.userProfiles, (profiles) =>
      callback(profiles.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name)))
    ),
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
