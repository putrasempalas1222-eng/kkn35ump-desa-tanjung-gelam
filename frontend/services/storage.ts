import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
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

const firebaseConfig = {
  apiKey: 'AIzaSyCxFcWI6vLfGNcQMnTVRsRtXsDJfzqiWEw',
  authDomain: 'project-3dfa8c97-bc93-4195-a5a.firebaseapp.com',
  databaseURL: 'https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com',
  projectId: 'project-3dfa8c97-bc93-4195-a5a',
  storageBucket: 'project-3dfa8c97-bc93-4195-a5a.firebasestorage.app',
  messagingSenderId: '275478991025',
  appId: '1:275478991025:web:80d97124eb119cc039d290',
  measurementId: 'G-YL95DFEMDK',
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

export const storage = {
  defaults: {
    siteContent: EMPTY_SITE_CONTENT,
    eventContent: EMPTY_EVENT_CONTENT,
  },

  init: async () => undefined,

  onAuthChange: (callback: (user: FirebaseUser | null) => void) => onAuthStateChanged(auth, callback),
  login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
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
  deleteUserProfile: (uid: string) => remove(ref(database, `${COLLECTIONS.userProfiles}/${uid}`)),

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
  saveWeeklyReport: async (report: WeeklyReport) => {
    const id = report.id || `week_${Date.now()}`;
    await set(ref(database, `${COLLECTIONS.weeklyReports}/${report.userId}/${id}`), {
      ...report,
      id,
      updatedAt: serverTimestamp(),
    });
    return id;
  },
  deleteWeeklyReport: (uid: string, id: string) => remove(ref(database, `${COLLECTIONS.weeklyReports}/${uid}/${id}`)),

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
