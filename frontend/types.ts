export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  division?: string;
}

export interface Program {
  id: string;
  category: string;
  title: string;
  description: string;
  iconName: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  category: string;
  title: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export interface ReviewSubmission {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  date: string;
  status: 'pending';
  createdAt?: number | object;
}

export interface SiteContent {
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroImage: string;
  aboutTitle: string;
  aboutHighlight: string;
  aboutDescription: string;
  aboutDetail: string;
  aboutImage: string;
  aboutHighlights: string[];
  visionTitle: string;
  visionDescription: string;
  villageTitle: string;
  villageDescription: string;
  villageOverview: string;
  villageMapUrl: string;
  contactAddress: string;
  contactEmail: string;
  contactInstagram: string;
  contactWhatsapp: string;
  videoTitle: string;
  videoSubtitle: string;
  videoDescription: string;
  videoPoster: string;
  videoSrc: string;
  maintenanceEnabled: boolean;
  maintenanceStart: string;
  maintenanceEnd: string;
  maintenanceTitle: string;
  maintenanceMessage: string;
}

export interface EventContent {
  title: string;
  description: string;
  image: string;
  date: string;
  location: string;
  audience: string;
}

export interface CompetitionItem {
  id: string;
  title: string;
  category: string;
  description: string;
  requirements: string;
  prizes: string;
  registrationStart: string;   // ISO date string YYYY-MM-DD
  registrationEnd: string;     // ISO date string YYYY-MM-DD
  maxParticipants: string;
  fee: string;
  iconName: string;
  color: string;
  isOpen: boolean;
  order?: number;
}

export interface CompetitionRegistration {
  id: string;
  competitionId: string;
  competitionTitle: string;
  name: string;
  phone: string;
  address: string;
  age: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'rejected';
  date: string;
  createdAt?: number | object;
}

export type UserRole = 'admin' | 'division';

export type DivisionName = string;

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  division: DivisionName;
  role: UserRole;
  createdAt?: number | object;
}

export interface LiveLocation {
  uid: string;
  name: string;
  email: string;
  division: DivisionName;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: number;
}

export interface WeeklyReportEntry {
  id: string;
  dayNumber: string;
  dateText: string;
  activityName: string;
  activityTime: string;
  evidenceUrl: string;
  responsibleName?: string;
}

export interface WeeklyReport {
  id: string;
  reportType?: 'weekly' | 'matrix' | 'individualMatrix' | 'treasurerOutput';
  userId: string;
  name: string;
  nim: string;
  prodi: string;
  faculty: string;
  division: DivisionName;
  week: string;
  kodeKelompok: string;
  desa: string;
  kecamatan: string;
  kodeDpl: string;
  villageDate: string;
  signerName: string;
  signerNim: string;
  entries: WeeklyReportEntry[];
  updatedAt?: number | object;
}

export interface DivisionNote {
  id: string;
  userId: string;
  division: DivisionName;
  title: string;
  content: string;
  date: string;
  updatedAt?: number | object;
}
