import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Plus,
  Printer,
  Save,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { storage, ContactMessage } from '../services/storage';
import {
  DivisionName,
  EventContent,
  GalleryImage,
  Program,
  ReviewSubmission,
  SiteContent,
  TeamMember,
  Testimonial,
  UserProfile,
  WeeklyReport,
  WeeklyReportEntry,
} from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

type Tab = 'overview' | 'accounts' | 'content' | 'maintenance' | 'event' | 'team' | 'programs' | 'gallery' | 'testimonials' | 'reviews' | 'messages';
type EditableType = 'team' | 'programs' | 'gallery' | 'testimonials';
type EditableItem = TeamMember | Program | GalleryImage | Testimonial;

const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';

const DIVISIONS: { value: DivisionName; label: string; defaultName: string }[] = [
  { value: 'ketua', label: 'Ketua', defaultName: 'Daffa' },
  { value: 'sekretaris', label: 'Sekretaris', defaultName: 'Lulu' },
  { value: 'bendahara', label: 'Bendahara', defaultName: 'Dhita' },
  { value: 'pdd 1', label: 'PDD 1', defaultName: 'Imel' },
  { value: 'pdd 2', label: 'PDD 2', defaultName: '' },
  { value: 'pdd 3', label: 'PDD 3', defaultName: 'Ilham' },
  { value: 'humas 1', label: 'Humas 1', defaultName: 'Edwin' },
  { value: 'humas 2', label: 'Humas 2', defaultName: 'Sekar' },
  { value: 'acara 1', label: 'Acara 1', defaultName: 'Putra' },
  { value: 'acara 2', label: 'Acara 2', defaultName: 'Aisyah' },
  { value: 'perlengkapan 1', label: 'Perlengkapan 1', defaultName: 'Egi' },
  { value: 'perlengkapan 2', label: 'Perlengkapan 2', defaultName: 'Sahlini, Diffa' },
];

const getDivisionLabel = (value: DivisionName) => DIVISIONS.find((item) => item.value === value)?.label || value;
const REPORT_LOGO_UMP = '/report-assets/logo-ump.png';
const REPORT_LOGO_KKN = '/report-assets/logo-kkn.png';
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

const emptyItem = (type: EditableType): EditableItem => {
  const id = `${type}_${Date.now()}`;

  if (type === 'team') {
    return { id, name: '', role: '', division: '', image: '' };
  }

  if (type === 'programs') {
    return { id, category: '', title: '', description: '', iconName: '' };
  }

  if (type === 'gallery') {
    return { id, category: '', title: '', url: '' };
  }

  return { id, name: '', role: '', quote: '', avatar: '' };
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  rows?: number;
}) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 transition-colors">
      {label}
    </span>
    {rows ? (
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200 resize-none"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (type === 'date' || type === 'time') event.preventDefault();
        }}
        onPaste={(event) => {
          if (type === 'date' || type === 'time') event.preventDefault();
        }}
        onClick={(event) => {
          if (type === 'date' || type === 'time') {
            (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
          }
        }}
        lang="id-ID"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200 dark:[color-scheme:dark]"
      />
    )}
  </label>
);

const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 transition-colors">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const fileToImageDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Gambar gagal diproses.'));
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Browser tidak bisa memproses gambar.'));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
};

const fileToVideoDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const maxSizeMb = 8;

    if (!file.type.startsWith('video/')) {
      reject(new Error('File harus berupa video.'));
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      reject(new Error(`Ukuran video maksimal ${maxSizeMb}MB agar database tetap ringan.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Video gagal dibaca.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
};

const getYouTubeEmbedUrl = (value: string) => {
  if (!value) return '';

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) return value;

      const id = url.searchParams.get('v') || url.pathname.split('/shorts/')[1]?.split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }

  return '';
};

const ImageField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [error, setError] = useState('');
  const youtubeEmbedUrl = getYouTubeEmbedUrl(value);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const dataUrl = await fileToImageDataUrl(file);
      onChange(dataUrl);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Gambar gagal diunggah.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Field label={label} value={value} onChange={onChange} />
      <label className="block rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-4 cursor-pointer hover:border-m-blue transition-colors">
        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">Upload gambar dari perangkat</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gambar dikompres lalu disimpan sebagai data URL di database, tanpa Firebase Storage.
        </span>
      </label>
      {value && (
        <img
          src={value}
          alt={label}
          className="h-32 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        />
      )}
      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
};

const VideoField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [error, setError] = useState('');

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const dataUrl = await fileToVideoDataUrl(file);
      onChange(dataUrl);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Video gagal diunggah.');
    } finally {
      event.target.value = '';
    }
  };

  const getYoutubeEmbedUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      let videoId: string | null = null;
      if (parsed.hostname.includes('youtube.com')) {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1);
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  };

  const youtubeEmbedUrl = getYoutubeEmbedUrl(value);

  return (
    <div className="space-y-3">
      <Field label={label} value={value} onChange={onChange} />
      <label className="block rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-4 cursor-pointer hover:border-m-blue transition-colors">
        <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={handleFile} className="sr-only" />
        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">Upload video dari perangkat</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
          Bisa isi link YouTube atau upload video kecil. Upload disimpan sebagai base64 data URL, maksimal 8MB.
        </span>
      </label>
      {youtubeEmbedUrl ? (
        <iframe
          src={youtubeEmbedUrl}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950"
        />
      ) : value && (
        <video
          src={value}
          controls
          className="h-44 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-950"
        />
      )}
      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
};

const getEventDateInputValue = (value: string) => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return {
    date: match?.[1] || '',
    time: match?.[2] || '',
  };
};

const setEventDatePart = (currentValue: string, part: 'date' | 'time', value: string) => {
  const current = getEventDateInputValue(currentValue);
  const nextDate = part === 'date' ? value : current.date;
  const nextTime = part === 'time' ? value : current.time;

  if (!nextDate && !nextTime) return '';
  if (!nextDate) return '';

  return `${nextDate}T${nextTime || '08:00'}:00+07:00`;
};

const formatDateDisplay = (isoDate: string) => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const formatDateTimeDisplay = (value: string) => {
  const current = getEventDateInputValue(value);
  if (!current.date) return 'Tanggal belum diatur';
  return `${formatDateDisplay(current.date)}${current.time ? ` ${current.time}` : ''} WIB`;
};

const DateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.preventDefault()}
        onPaste={(event) => event.preventDefault()}
        onClick={(event) => {
          (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        }}
        lang="id-ID"
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-m-blue dark:[color-scheme:dark]"
      />
    </label>
  );
};

const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

const parseIndonesianDateToIso = (text: string): string => {
  if (!text) return '';
  try {
    const parts = text.split(',');
    const datePart = parts[1] || parts[0];
    if (!datePart) return '';
    const dateWords = datePart.trim().split(/\s+/);
    if (dateWords.length !== 3) return '';

    const day = parseInt(dateWords[0]);
    const monthName = dateWords[1];
    const year = parseInt(dateWords[2]);

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex === -1 || isNaN(day) || isNaN(year)) return '';

    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch (e) {
    return '';
  }
};

const formatIndonesianDayMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];

    return `${dayNum} ${monthName}`;
  } catch (e) {
    return dateStr;
  }
};

const parseIndonesianDayMonthToIso = (text: string): string => {
  if (!text) return '';
  try {
    const dateWords = text.trim().split(/\s+/);
    if (dateWords.length !== 2) return '';

    const day = parseInt(dateWords[0]);
    const monthName = dateWords[1];

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex === -1 || isNaN(day)) return '';

    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `2026-${mm}-${dd}`;
  } catch (e) {
    return '';
  }
};

const STANDARD_TIMES = [
  '08:00 - 12:00 WIB',
  '08:00 - 16:00 WIB',
  '09:00 - 11:30 WIB',
  '13:00 - 15:00 WIB',
  '13:30 - 16:00 WIB',
  '14:00 - 16:00 WIB',
  '16:00 - 18:00 WIB',
  '19:30 - 21:00 WIB',
  '20:00 - 22:00 WIB',
];

const getSelectedTimeOption = (value: string): string => {
  if (!value) return '';
  if (STANDARD_TIMES.includes(value)) return value;
  return 'custom';
};

const AccountManager = ({ profiles }: { profiles: UserProfile[] }) => {
  const [division, setDivision] = useState<DivisionName>('ketua');
  const [name, setName] = useState(DIVISIONS[0].defaultName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingProfileId, setEditingProfileId] = useState('');
  const [editingProfileName, setEditingProfileName] = useState('');
  const [savingProfileId, setSavingProfileId] = useState('');

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await storage.createDivisionAccount({ email, password, name, division });
      setEmail('');
      setPassword('');
      setMessage('Akun berhasil dibuat dan sudah masuk daftar divisi.');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') setMessage('Email sudah dipakai akun lain.');
      else if (code === 'auth/weak-password') setMessage('Password minimal 6 karakter.');
      else setMessage(error?.message || 'Akun belum berhasil dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const changeDivision = (value: DivisionName) => {
    setDivision(value);
    const defaultName = DIVISIONS.find((item) => item.value === value)?.defaultName || '';
    setName(defaultName);
  };

  const startEditProfileName = (profile: UserProfile) => {
    setEditingProfileId(profile.uid);
    setEditingProfileName(profile.name);
    setMessage('');
  };

  const saveProfileName = async (profile: UserProfile) => {
    const nextName = editingProfileName.trim();
    if (!nextName) {
      setMessage('Nama anggota tidak boleh kosong.');
      return;
    }

    setSavingProfileId(profile.uid);
    setMessage('');

    try {
      await storage.updateUserProfile({ ...profile, name: nextName });
      setEditingProfileId('');
      setEditingProfileName('');
      setMessage('Nama anggota berhasil diperbarui.');
    } catch (error: any) {
      setMessage(error?.message || 'Nama anggota gagal diperbarui.');
    } finally {
      setSavingProfileId('');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-black">Akun Divisi</h1>
        <p className="text-slate-500 dark:text-slate-400">Buat akun anggota dan arahkan mereka ke dashboard laporan masing-masing.</p>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
        <form onSubmit={createAccount} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="font-black text-lg">Buat Akun Baru</h2>
          <SelectField
            label="Divisi"
            value={division}
            onChange={changeDivision}
            options={DIVISIONS.map((item) => ({ value: item.value, label: item.label }))}
          />
          <Field label="Nama Anggota" value={name} onChange={setName} />
          <Field label="Email Login" type="email" value={email} onChange={setEmail} />
          <Field label="Password Awal" type="password" value={password} onChange={setPassword} />
          {message && (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {message}
            </p>
          )}
          <button className="w-full rounded-lg bg-m-blue hover:bg-m-blue-dark text-white py-3 font-bold flex items-center justify-center gap-2">
            <Plus size={18} />
            {saving ? 'Membuat akun...' : 'Buat Akun'}
          </button>
        </form>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <h2 className="font-black text-lg mb-4">Daftar Divisi</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {DIVISIONS.map((item) => {
              const profile = profiles.find((candidate) => candidate.division === item.value);
              return (
                <div key={item.value} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-m-blue">{item.label}</p>
                  {profile && editingProfileId === profile.uid ? (
                    <div className="mt-2 space-y-2">
                      <input
                        value={editingProfileName}
                        onChange={(event) => setEditingProfileName(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => saveProfileName(profile)}
                          disabled={savingProfileId === profile.uid}
                          className="rounded-lg bg-m-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {savingProfileId === profile.uid ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfileId('');
                            setEditingProfileName('');
                          }}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="font-black text-slate-900 dark:text-white">{profile?.name || item.defaultName || 'Belum diisi'}</p>
                      {profile && (
                        <button
                          type="button"
                          onClick={() => startEditProfileName(profile)}
                          className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Edit Nama
                        </button>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{profile?.email || 'Akun belum dibuat'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const createEmptyReport = (profile: UserProfile, week = '1'): WeeklyReport => ({
  id: `week_${Date.now()}`,
  userId: profile.uid,
  name: profile.name,
  nim: '',
  prodi: '',
  faculty: '',
  division: profile.division,
  week,
  kodeKelompok: '35',
  desa: 'Tanjung Gelam',
  kecamatan: '',
  kodeDpl: '',
  villageDate: '',
  signerName: profile.name,
  signerNim: '',
  entries: [
    { id: `entry_${Date.now()}_1`, dayNumber: '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '' },
  ],
});

const getNextReportWeek = (reports: WeeklyReport[]) => {
  const usedWeeks = reports
    .map((report) => Number(report.week))
    .filter((week) => Number.isFinite(week) && week > 0);

  return String((usedWeeks.length ? Math.max(...usedWeeks) : 0) + 1);
};

const escapePdfText = (value: string) =>
  value
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const sanitizeFilePart = (value: string) => value.trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'Laporan';

const getDownloadTimestamp = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const waitForNextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const waitForImagesToLoad = async (element: HTMLElement) => {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
};

const downloadReportTemplatePdf = async (report: WeeklyReport) => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.background = '#ffffff';
  host.style.color = '#000000';
  host.style.zIndex = '-9999';
  host.style.opacity = '0.01';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(<ReportTemplate report={report} printMode downloadMode />);
    await waitForNextPaint();
    await document.fonts?.ready;
    await waitForImagesToLoad(host);
    await waitForNextPaint();

    const pages = Array.from(host.querySelectorAll<HTMLElement>('.weekly-report-pdf-page'));
    if (!pages.length) throw new Error('Halaman laporan gagal dirender.');

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const totalHeight = A4_HEIGHT_PX * pages.length;

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: totalHeight,
      });
      const imageData = canvas.toDataURL('image/jpeg', 0.98);

      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    pdf.save(`Laporan_Mingguan_Minggu_${sanitizeFilePart(report.week)}_${sanitizeFilePart(report.name)}_${getDownloadTimestamp()}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
};

const printReportTemplatePdf = async (report: WeeklyReport) => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.background = '#ffffff';
  host.style.color = '#000000';
  host.style.zIndex = '-9999';
  host.style.opacity = '0.01';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(<ReportTemplate report={report} printMode downloadMode />);
    await waitForNextPaint();
    await document.fonts?.ready;
    await waitForImagesToLoad(host);
    await waitForNextPaint();

    const pages = Array.from(host.querySelectorAll<HTMLElement>('.weekly-report-pdf-page'));
    if (!pages.length) throw new Error('Halaman laporan gagal dirender.');

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const totalHeight = A4_HEIGHT_PX * pages.length;

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: totalHeight,
      });
      const imageData = canvas.toDataURL('image/jpeg', 0.98);

      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    // Open as blob URL in a new tab so user can print the exact PDF
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      // Auto-trigger print dialog after PDF loads in the new tab
      win.addEventListener('load', () => {
        win.focus();
        win.print();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      });
    } else {
      // Fallback: if popup blocked, just revoke after a while
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  } finally {
    root.unmount();
    host.remove();
  }
};

const wrapPdfText = (text: string, maxWidth: number, fontSize: number) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  const averageCharWidth = fontSize * 0.48;
  const maxChars = Math.max(1, Math.floor(maxWidth / averageCharWidth));

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      return;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const clampLines = (lines: string[], maxLines: number) => {
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, Math.max(1, maxLines));
  visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, Math.max(0, visible[visible.length - 1].length - 3))}...`;
  return visible;
};

const loadImageAsJpeg = (src: string): Promise<{ data: string; width: number; height: number } | null> => {
  if (!src || (!/^data:image\//i.test(src) && !/^\/|^https?:\/\//i.test(src))) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context || !image.naturalWidth || !image.naturalHeight) {
          resolve(null);
          return;
        }

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        resolve({
          data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1],
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
};

class PdfDocument {
  private readonly width = 595;
  private readonly height = 842;
  private readonly pages: string[][] = [];
  private readonly images: { name: string; data: string; width: number; height: number }[] = [];

  addPage() {
    this.pages.push([]);
    return this.pages.length - 1;
  }

  addImage(image: { data: string; width: number; height: number }) {
    const existing = this.images.find((item) => item.data === image.data);
    if (existing) return existing.name;

    const name = `Im${this.images.length + 1}`;
    this.images.push({ name, ...image });
    return name;
  }

  text(page: number, value: string, x: number, y: number, size = 9, font: 'regular' | 'bold' = 'regular', align: 'left' | 'center' = 'left') {
    const text = escapePdfText(value);
    // Per-character width table based on Helvetica metrics (units per 1000, divided by 1000)
    // Bold is ~5-8% wider than regular
    const regularWidths: Record<string, number> = {
      ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889, '&': 0.667, "'": 0.222,
      '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584, ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278,
      '0': 0.556, '1': 0.556, '2': 0.556, '3': 0.556, '4': 0.556, '5': 0.556, '6': 0.556, '7': 0.556,
      '8': 0.556, '9': 0.556, ':': 0.278, ';': 0.278, '<': 0.584, '=': 0.584, '>': 0.584, '?': 0.556,
      '@': 1.015, 'A': 0.667, 'B': 0.667, 'C': 0.722, 'D': 0.722, 'E': 0.667, 'F': 0.611, 'G': 0.778,
      'H': 0.722, 'I': 0.278, 'J': 0.500, 'K': 0.667, 'L': 0.611, 'M': 0.833, 'N': 0.722, 'O': 0.778,
      'P': 0.667, 'Q': 0.778, 'R': 0.722, 'S': 0.667, 'T': 0.611, 'U': 0.722, 'V': 0.667, 'W': 0.944,
      'X': 0.667, 'Y': 0.667, 'Z': 0.611, '[': 0.278, '\\': 0.278, ']': 0.278, '^': 0.469, '_': 0.556,
      '`': 0.333, 'a': 0.556, 'b': 0.556, 'c': 0.500, 'd': 0.556, 'e': 0.556, 'f': 0.278, 'g': 0.556,
      'h': 0.556, 'i': 0.222, 'j': 0.222, 'k': 0.500, 'l': 0.222, 'm': 0.833, 'n': 0.556, 'o': 0.556,
      'p': 0.556, 'q': 0.556, 'r': 0.333, 's': 0.500, 't': 0.278, 'u': 0.556, 'v': 0.500, 'w': 0.722,
      'x': 0.500, 'y': 0.500, 'z': 0.500, '{': 0.334, '|': 0.260, '}': 0.334, '~': 0.584,
    };
    const boldFactor = 1.07; // bold is ~7% wider
    const charW = (ch: string) => {
      const w = regularWidths[ch] ?? 0.556;
      return font === 'bold' ? w * boldFactor : w;
    };
    const width = Array.from(value).reduce((sum, ch) => sum + charW(ch), 0) * size;
    const drawX = align === 'center' ? x - width / 2 : x;
    this.pages[page].push(`BT /${font === 'bold' ? 'F2' : 'F1'} ${size} Tf ${drawX.toFixed(2)} ${(this.height - y).toFixed(2)} Td (${text}) Tj ET`);
  }

  multiline(page: number, value: string, x: number, y: number, maxWidth: number, size = 8, lineHeight = 10, font: 'regular' | 'bold' = 'regular') {
    wrapPdfText(value, maxWidth, size).forEach((line, index) => {
      this.text(page, line, x, y + index * lineHeight, size, font);
    });
  }

  line(page: number, x1: number, y1: number, x2: number, y2: number, width = 0.7, color = '0 0 0') {
    this.pages[page].push(`${color} RG ${width} w ${x1.toFixed(2)} ${(this.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.height - y2).toFixed(2)} l S`);
  }

  rect(page: number, x: number, y: number, width: number, height: number, stroke = '0 0 0') {
    this.pages[page].push(`${stroke} RG ${x.toFixed(2)} ${(this.height - y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  }

  roundRect(page: number, x: number, y: number, width: number, height: number, radius: number, stroke = '0 0 0') {
    const k = 0.5522847498;
    const right = x + width;
    const bottom = y + height;
    const c = radius * k;

    this.pages[page].push(
      `${stroke} RG 0.7 w ` +
      `${(x + radius).toFixed(2)} ${(this.height - y).toFixed(2)} m ` +
      `${(right - radius).toFixed(2)} ${(this.height - y).toFixed(2)} l ` +
      `${(right - radius + c).toFixed(2)} ${(this.height - y).toFixed(2)} ${(right).toFixed(2)} ${(this.height - y - radius + c).toFixed(2)} ${(right).toFixed(2)} ${(this.height - y - radius).toFixed(2)} c ` +
      `${right.toFixed(2)} ${(this.height - bottom + radius).toFixed(2)} l ` +
      `${right.toFixed(2)} ${(this.height - bottom + radius - c).toFixed(2)} ${(right - radius + c).toFixed(2)} ${(this.height - bottom).toFixed(2)} ${(right - radius).toFixed(2)} ${(this.height - bottom).toFixed(2)} c ` +
      `${(x + radius).toFixed(2)} ${(this.height - bottom).toFixed(2)} l ` +
      `${(x + radius - c).toFixed(2)} ${(this.height - bottom).toFixed(2)} ${x.toFixed(2)} ${(this.height - bottom + radius - c).toFixed(2)} ${x.toFixed(2)} ${(this.height - bottom + radius).toFixed(2)} c ` +
      `${x.toFixed(2)} ${(this.height - y - radius).toFixed(2)} l ` +
      `${x.toFixed(2)} ${(this.height - y - radius + c).toFixed(2)} ${(x + radius - c).toFixed(2)} ${(this.height - y).toFixed(2)} ${(x + radius).toFixed(2)} ${(this.height - y).toFixed(2)} c S`
    );
  }

  image(page: number, imageName: string, x: number, y: number, width: number, height: number) {
    this.pages[page].push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${(this.height - y - height).toFixed(2)} cm /${imageName} Do Q`);
  }

  save(filename: string) {
    const encoder = (value: string) => value;
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesId = addObject('');
    const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const imageIds = this.images.map((image) => {
      const binary = atob(image.data);
      return addObject(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\nstream\n${binary}\nendstream`);
    });
    const pageIds: number[] = [];
    const contentIds: number[] = [];

    this.pages.forEach((commands) => {
      const content = commands.join('\n');
      const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      contentIds.push(contentId);
      pageIds.push(addObject(''));
    });

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    pageIds.forEach((pageId, index) => {
      const xObjects = this.images.map((image, imageIndex) => `/${image.name} ${imageIds[imageIndex]} 0 R`).join(' ');
      objects[pageId - 1] =
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << ${xObjects} >> >> ` +
        `/Contents ${contentIds[index]} 0 R >>`;
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((body, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${encoder(body)}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 0xff;

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

const drawWeeklyReportPdfPage = (
  pdf: PdfDocument,
  page: number,
  report: WeeklyReport,
  pageEntries: Array<WeeklyReportEntry & { pdfRowHeight: number }>,
  pageIndex: number,
  isLastPage: boolean,
  images: {
    logoUmp: { data: string; width: number; height: number } | null;
    logoKkn: { data: string; width: number; height: number } | null;
    bismillah: { data: string; width: number; height: number } | null;
    evidence: Record<string, { data: string; width: number; height: number } | null>;
  }
) => {
  const green = '0 0.42 0.21';
  const x = 30;
  const contentWidth = 535;
  const boxX = 30;
  const boxY = 104;
  const boxWidth = 535;
  const boxHeight = 692;

  const logoUmpName = images.logoUmp ? pdf.addImage(images.logoUmp) : '';
  const logoKknName = images.logoKkn ? pdf.addImage(images.logoKkn) : '';
  const bismillahName = images.bismillah ? pdf.addImage(images.bismillah) : '';

  if (logoUmpName) pdf.image(page, logoUmpName, 227.5, 24, 31, 31);
  if (logoKknName) pdf.image(page, logoKknName, 260.5, 24, 64, 31);
  pdf.text(page, 'KULIAH KERJA NYATA ANGKATAN KE 66 TAHUN 2026', 297.5, 72, 6.8, 'bold', 'center');
  pdf.text(page, 'UNIVERSITAS MUHAMMADIYAH PALEMBANG', 297.5, 86, 13.5, 'bold', 'center');
  pdf.line(page, x, 98, x + contentWidth, 98, 0.45, green);
  pdf.line(page, x, 104, x + contentWidth, 104, 0.45, green);
  pdf.text(page, 'Jln. Jend. Ahmad Yani 13 Ulu Palembang (30263) Telp. 0711-5103022 Fax. 0711-510378 Website: http://lppm.um-palembang.ac.id/ Email : lppm@um-palembang.ac.id', 297.5, 102, 4.6, 'bold', 'center');

  pdf.roundRect(page, boxX, boxY, boxWidth, boxHeight, 17, green);
  if (bismillahName) pdf.image(page, bismillahName, 258.5, 121, 78, 22);

  if (pageIndex === 0) {
    pdf.text(page, 'LAPORAN MINGGUAN (LOGBOOK)', 297.5, 155, 7.2, 'bold', 'center');
    pdf.text(page, 'KKN REGULER - ANGKATAN KE 66', 297.5, 164, 6.4, 'bold', 'center');
    pdf.text(page, 'UNIVERSITAS MUHAMMADIYAH PALEMBANG', 297.5, 173, 6.4, 'bold', 'center');
    pdf.text(page, 'TAHUN 2026', 297.5, 182, 6.4, 'bold', 'center');
    pdf.text(page, 'BUKU PROFIL DAN POTENSI DESA', 297.5, 191, 6.4, 'bold', 'center');

    pdf.line(page, 40, 218, 555, 218, 0.65);
    pdf.line(page, 40, 221, 555, 221, 1.4);
    pdf.line(page, 40, 224, 555, 224, 0.65);
    [
      ['NAMA', report.name],
      ['NIM', report.nim],
      ['PRODI', report.prodi],
      ['FAKULTAS', report.faculty],
    ].forEach(([label, value], index) => {
      pdf.text(page, label, 42, 227 + index * 9, 6.6);
      pdf.text(page, ':', 129, 227 + index * 9, 6.6);
      pdf.text(page, value, 140, 227 + index * 9, 6.6);
    });
    pdf.line(page, 40, 262, 555, 262, 0.65);
    pdf.line(page, 40, 265, 555, 265, 1.4);
    pdf.line(page, 40, 268, 555, 268, 0.65);
    [
      ['KODE KELOMPOK', report.kodeKelompok],
      ['DESA/KELURAHAN', report.desa],
      ['KECAMATAN', report.kecamatan],
      ['KODE DPL', report.kodeDpl],
      ['NAMA DPL', getDivisionLabel(report.division)],
    ].forEach(([label, value], index) => {
      pdf.text(page, label, 42, 271 + index * 9, 6.3);
      pdf.text(page, ':', 129, 271 + index * 9, 6.3);
      pdf.text(page, value, 140, 271 + index * 9, 6.3);
    });
    pdf.line(page, 40, 315, 555, 315, 0.65);
    pdf.line(page, 40, 318, 555, 318, 1.4);
    pdf.line(page, 40, 321, 555, 321, 0.65);
  }

  const tableX = 40;
  const tableY = pageIndex === 0 ? 125 : 160;
  const colWidths = [35, 110, 180, 190];
  const rowHeights = pageEntries.map((entry) => entry.pdfRowHeight);
  const headerHeight = 31;
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0);

  pdf.rect(page, tableX, tableY, tableWidth, tableHeight);
  let cursorX = tableX;
  colWidths.slice(0, -1).forEach((width) => {
    cursorX += width;
    pdf.line(page, cursorX, tableY, cursorX, tableY + tableHeight);
  });

  pdf.line(page, tableX, tableY + headerHeight, tableX + tableWidth, tableY + headerHeight);

  // Compute column center X positions (horizontal center of each column)
  const hCol0X = tableX + colWidths[0] / 2;                                                              // center of col 0
  const hCol1X = tableX + colWidths[0] + colWidths[1] / 2;                                              // center of col 1
  const hCol2X = tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2;                               // center of col 2
  const hCol3X = tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2;                // center of col 3

  // Compute vertical center for 2 lines of text inside header cell
  const hFontSize = 6.2;
  const hLineGap = 8.5;                                                  // baseline-to-baseline gap between line 1 and line 2
  const hAscent = hFontSize * 0.72;                                      // approx ascent above baseline
  const hDescent = hFontSize * 0.22;                                     // approx descent below baseline
  const hBlockHeight = hAscent + hLineGap + hDescent;                   // total visual height of 2-line block
  const hLine1Y = tableY + (headerHeight - hBlockHeight) / 2 + hAscent; // baseline of line 1 (vertically centered)
  const hLine2Y = hLine1Y + hLineGap;                                    // baseline of line 2

  pdf.text(page, 'Hari', hCol0X, hLine1Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'ke', hCol0X, hLine2Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Hari, Tanggal,', hCol1X, hLine1Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Bulan, Tahun', hCol1X, hLine2Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Nama Kegiatan', hCol2X, hLine1Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Waktu Kegiatan', hCol2X, hLine2Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Bukti Foto dan Screenshot Flash', hCol3X, hLine1Y, hFontSize, 'bold', 'center');
  pdf.text(page, 'Video Kegiatan', hCol3X, hLine2Y, hFontSize, 'bold', 'center');

  let rowY = tableY + headerHeight;
  pageEntries.forEach((entry, index) => {
    const rowHeight = rowHeights[index];
    if (index > 0 || headerHeight > 0) pdf.line(page, tableX, rowY, tableX + tableWidth, rowY);

    const maxTextLines = Math.max(1, Math.floor((rowHeight - 14) / 8));
    const activityLines = clampLines(
      [...wrapPdfText(entry.activityName, colWidths[2] - 10, 6.4), ...(entry.activityTime ? ['', ...wrapPdfText(entry.activityTime, colWidths[2] - 10, 6.2)] : [])],
      maxTextLines
    );
    const dateLines = clampLines(wrapPdfText(entry.dateText, colWidths[1] - 10, 6.4), maxTextLines);

    pdf.text(page, entry.dayNumber, tableX + 8, rowY + 14, 6.5);
    dateLines.forEach((line, lineIndex) => pdf.text(page, line, tableX + colWidths[0] + 5, rowY + 14 + lineIndex * 8, 6.4));
    activityLines.forEach((line, lineIndex) => pdf.text(page, line, tableX + colWidths[0] + colWidths[1] + 5, rowY + 14 + lineIndex * 8, 6.4));

    const evidenceImage = images.evidence[entry.id];
    const evidenceX = tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5;
    const evidenceY = rowY + 8;
    const evidenceWidth = colWidths[3] - 10;
    const evidenceHeight = rowHeight - 16;
    if (evidenceImage) {
      const imageName = pdf.addImage(evidenceImage);
      const ratio = Math.min(evidenceWidth / evidenceImage.width, evidenceHeight / evidenceImage.height);
      const drawWidth = evidenceImage.width * ratio;
      const drawHeight = evidenceImage.height * ratio;
      pdf.image(page, imageName, evidenceX + (evidenceWidth - drawWidth) / 2, evidenceY + (evidenceHeight - drawHeight) / 2, drawWidth, drawHeight);
    } else if (entry.evidenceUrl) {
      clampLines(wrapPdfText(entry.evidenceUrl, evidenceWidth, 5.5), Math.max(1, Math.floor(evidenceHeight / 7))).forEach((line, lineIndex) => {
        pdf.text(page, line, evidenceX, evidenceY + 8 + lineIndex * 7, 5.5);
      });
    }

    rowY += rowHeight;
  });

  if (isLastPage) {
    const signY = Math.min(Math.max(rowY + 34, 610), 690);
    pdf.text(page, `${report.desa || 'Desa/Kelurahan'}, ${report.villageDate || '................'} 2026`, 445, signY, 7, 'regular', 'center');
    pdf.text(page, `(${report.signerName || 'Nama'}   ${report.signerNim || 'NIM'})`, 445, signY + 63, 7, 'regular', 'center');
  }

  pdf.text(page, '(Pascasarjana Program Studi : Hukum, Manajemen, Pend. Biologi, Teknik Kimia, Ilmu Pertanian, dan Pendidikan Agama Islam)', 297.5, 797, 4.3, 'bold', 'center');
  pdf.text(page, 'Fakultas : Teknik, Ekonomi dan Bisnis, Keguruan dan Ilmu Pendidikan, Pertanian, Hukum, Agama Islam dan Kedokteran', 297.5, 803, 4.3, 'bold', 'center');
};

type PdfReportEntry = WeeklyReportEntry & { pdfRowHeight: number };

const getPdfEntryHeight = (
  entry: WeeklyReportEntry,
  evidenceImage: { data: string; width: number; height: number } | null
) => {
  const activityLineCount =
    wrapPdfText(entry.activityName, 177, 6.4).length +
    (entry.activityTime ? 1 + wrapPdfText(entry.activityTime, 177, 6.2).length : 0);
  const dateLineCount = wrapPdfText(entry.dateText, 108, 6.4).length;
  const evidenceLineCount = entry.evidenceUrl && !evidenceImage ? wrapPdfText(entry.evidenceUrl, 190, 5.5).length : 1;
  const textHeight = Math.max(activityLineCount, dateLineCount, evidenceLineCount) * 8 + 18;

  return Math.min(132, Math.max(76, textHeight));
};

const paginatePdfEntries = (
  entries: WeeklyReportEntry[],
  evidence: Record<string, { data: string; width: number; height: number } | null>
) => {
  const pages: PdfReportEntry[][] = [];
  let currentPage: PdfReportEntry[] = [];
  let currentHeight = 0;

  entries.forEach((entry) => {
    const pdfEntry = {
      ...entry,
      pdfRowHeight: getPdfEntryHeight(entry, evidence[entry.id] || null),
    };
    const pageIndex = pages.length;
    const tableY = pageIndex === 0 ? 382 : 160;
    const availableHeight = 610 - tableY - 31;
    const nextHeight = currentHeight + pdfEntry.pdfRowHeight;

    if (currentPage.length > 0 && nextHeight > availableHeight) {
      pages.push(currentPage);
      currentPage = [pdfEntry];
      currentHeight = pdfEntry.pdfRowHeight;
      return;
    }

    currentPage.push(pdfEntry);
    currentHeight = nextHeight;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length ? pages : [[{ ...entries[0], pdfRowHeight: 76 }]];
};

const generateWeeklyReportPdf = async (report: WeeklyReport) => {
  const entries = report.entries.length
    ? report.entries
    : [{ id: 'empty', dayNumber: report.week || '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '' }];
  const [logoUmp, logoKkn, bismillah] = await Promise.all([
    loadImageAsJpeg(REPORT_LOGO_UMP),
    loadImageAsJpeg(REPORT_LOGO_KKN),
    loadImageAsJpeg('/report-assets/bismillah.png'),
  ]);
  const evidenceEntries = await Promise.all(entries.map(async (entry) => [entry.id, await loadImageAsJpeg(entry.evidenceUrl)] as const));
  const evidence = Object.fromEntries(evidenceEntries);
  const pages = paginatePdfEntries(entries, evidence);
  const pdf = new PdfDocument();

  pages.forEach((pageEntries, pageIndex) => {
    const page = pdf.addPage();
    drawWeeklyReportPdfPage(pdf, page, report, pageEntries, pageIndex, pageIndex === pages.length - 1, {
      logoUmp,
      logoKkn,
      bismillah,
      evidence,
    });
  });

  pdf.save(`Laporan_Mingguan_Minggu_${sanitizeFilePart(report.week)}_${sanitizeFilePart(report.name)}_${getDownloadTimestamp()}.pdf`);
};

const DivisionDashboard = ({ profile, onLogout, onClose }: { profile: UserProfile; onLogout: () => void; onClose?: () => void }) => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const closeNav = () => setIsNavOpen(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateToSection = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.blur();
    scrollToSection(id);
  };
  const [editing, setEditing] = useState<WeeklyReport>(() => {
    if (typeof window !== 'undefined' && profile?.uid) {
      const saved = localStorage.getItem(`weekly_report_draft_${profile.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.userId === profile.uid) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse weekly report draft:', e);
        }
      }
    }
    return createEmptyReport(profile);
  });
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [printReport, setPrintReport] = useState<WeeklyReport | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => storage.subscribeWeeklyReports(profile.uid, setReports), [profile.uid]);

  // Sync to localStorage instantly whenever editing changes
  useEffect(() => {
    if (profile?.uid && editing) {
      localStorage.setItem(`weekly_report_draft_${profile.uid}`, JSON.stringify(editing));
    }
  }, [editing, profile?.uid]);

  // Debounced auto-save to Firebase database
  useEffect(() => {
    if (!editing || !editing.id || !profile?.uid) return;

    // Trigger saving status when editing state updates
    setAutoSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await storage.saveWeeklyReport(editing);
        setAutoSaveStatus('saved');
      } catch (err) {
        console.error('Firebase auto-save error:', err);
        setAutoSaveStatus('idle');
      }
    }, 1500); // 1.5 seconds debounce delay

    return () => clearTimeout(timer);
  }, [editing, profile?.uid]);

  const updateEntry = (id: string, patch: Partial<WeeklyReportEntry>) => {
    setEditing((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));
  };

  const addEntry = () => {
    setEditing((current) => ({
      ...current,
      entries: [
        ...current.entries,
        { id: `entry_${Date.now()}`, dayNumber: String(current.entries.length + 1), dateText: '', activityName: '', activityTime: '', evidenceUrl: '' },
      ],
    }));
  };

  const saveReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await storage.saveWeeklyReport(editing);
    setAutoSaveStatus('saved');
    setSaving(false);
  };

  const exportPdf = async (report: WeeklyReport) => {
    setDownloadingPdf(report.id);
    setPdfGenerating(true);

    try {
      await printReportTemplatePdf(report);
    } catch (err) {
      console.error('Print PDF error:', err);
      alert('Terjadi kesalahan saat membuat PDF untuk cetak.');
    } finally {
      setDownloadingPdf(null);
      setPdfGenerating(false);
    }
  };

  const deleteReport = async (report: WeeklyReport) => {
    if (!window.confirm(`Hapus laporan Minggu ${report.week}?`)) return;

    await storage.deleteWeeklyReport(profile.uid, report.id);
    if (editing.id === report.id) {
      setEditing(createEmptyReport(profile, getNextReportWeek(reports.filter((item) => item.id !== report.id))));
      setAutoSaveStatus('idle');
    }
  };

  const downloadPdf = async (report: WeeklyReport) => {
    setDownloadingPdf(report.id);
    setPdfGenerating(true);

    try {
      await downloadReportTemplatePdf(report);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Terjadi kesalahan saat membuat PDF.');
    } finally {
      setDownloadingPdf(null);
      setPdfGenerating(false);
    }
  };

  const mobileNavDrawer = typeof document !== 'undefined' && isNavOpen
    ? createPortal(
      <>
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fadeIn cursor-pointer"
          onClick={closeNav}
        />

        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0f1322] border-r border-slate-200/60 dark:border-slate-800/60 p-6 flex flex-col justify-between overflow-hidden lg:hidden transition-transform duration-300 ease-in-out translate-x-0">
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <span className="text-[9px] bg-m-blue/10 text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Divisi {getDivisionLabel(profile.division)}
                </span>
                <h2 className="font-bold text-lg text-slate-800 dark:text-white mt-1">Laporan Mingguan</h2>
              </div>
              <button
                type="button"
                onClick={closeNav}
                className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-200 cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px]"
                aria-label="Tutup navigasi"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-1">
              <button
                type="button"
                onClick={(event) => navigateToSection(event, 'form-laporan')}
                className="w-full rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151c30] transition-colors text-left"
              >
                Tulis Laporan
              </button>
              <button
                type="button"
                onClick={(event) => navigateToSection(event, 'laporan-tersimpan')}
                className="w-full rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151c30] transition-colors text-left"
              >
                Laporan Tersimpan
              </button>
              <button
                type="button"
                onClick={(event) => navigateToSection(event, 'pratinjau-pdf')}
                className="w-full rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151c30] transition-colors text-left"
              >
                Pratinjau PDF A4
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={() => {
                    closeNav();
                    onClose();
                  }}
                  className="w-full rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151c30] transition-colors text-left"
                >
                  Lihat Website
                </button>
              )}
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-6">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#151c30] border border-slate-200/60 dark:border-slate-800/60 rounded-full pl-2 pr-3 py-1.5 shadow-sm">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none shrink-0">
                {profile.name ? profile.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left overflow-hidden flex-1">
                <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200 truncate">{profile.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">{profile.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full mt-3 rounded-full bg-[#fce8e6] text-[#c5221f] dark:bg-red-950/20 dark:text-red-400 hover:bg-[#f9d2ce] dark:hover:bg-red-900/60 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </aside>
      </>,
      document.body
    )
    : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white">
      {mobileNavDrawer}
      <header className="no-print sticky top-0 z-20 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-[#0f1322]/90 backdrop-blur px-4 md:px-8 py-3.5 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsNavOpen(true);
            }}
            className="lg:hidden p-2.5 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all duration-200 shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px]"
            title="Buka Navigasi"
          >
            <Menu size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] bg-m-blue/10 text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Divisi {getDivisionLabel(profile.division)}
              </span>
            </div>
            <h1 className="text-base sm:text-2xl font-black mt-0.5 tracking-tight leading-tight">
              <span className="inline sm:hidden">Laporan Mingguan</span>
              <span className="hidden sm:inline">Dashboard Laporan Mingguan</span>
            </h1>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => navigateToSection(event, 'form-laporan')}
            className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Tulis Laporan
          </button>
          <button
            type="button"
            onClick={(event) => navigateToSection(event, 'laporan-tersimpan')}
            className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Laporan Tersimpan
          </button>
          <button
            type="button"
            onClick={(event) => navigateToSection(event, 'pratinjau-pdf')}
            className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Pratinjau A4
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Lihat Website
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#0f1322] border border-slate-200/60 dark:border-slate-800/60 rounded-full pl-2 pr-3 py-1.5 shadow-sm hover:shadow transition-all duration-200 shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none shrink-0">
            {profile.name ? profile.name[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left max-w-[150px] md:max-w-[200px] overflow-hidden">
            <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200 truncate">{profile.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">{profile.email}</p>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1"></div>
          <button
            onClick={onLogout}
            className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-full transition-all duration-200"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="no-print p-4 md:p-8 flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px] gap-6">
        <form id="form-laporan" onSubmit={saveReport} className="order-2 lg:order-1 bg-white dark:bg-[#0f1322] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight">Isi Laporan</h2>
                {autoSaveStatus === 'saving' && (
                  <span className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full font-bold animate-pulse inline-flex items-center">
                    Menyimpan otomatis...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-[#7ce3a2] px-3 py-1 rounded-full font-bold inline-flex items-center">
                    Tersimpan otomatis
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data ini akan masuk ke template PDF A4 secara langsung.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Buat laporan baru? Laporan saat ini tidak akan hilang.')) {
                    setEditing(createEmptyReport(profile, getNextReportWeek([...reports, editing])));
                    setAutoSaveStatus('idle');
                  }
                }}
                className="rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-transparent dark:border-slate-700/60"
              >
                <Plus size={16} />
                Laporan Baru
              </button>
              <button className="rounded-full bg-m-blue hover:bg-m-blue-dark text-white px-6 py-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm shadow-m-blue/15">
                <Save size={18} />
                {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Minggu Ke" value={editing.week} onChange={(value) => setEditing({ ...editing, week: value })} />
            <Field label="NIM" value={editing.nim} onChange={(value) => setEditing({ ...editing, nim: value })} />
            <Field label="Prodi" value={editing.prodi} onChange={(value) => setEditing({ ...editing, prodi: value })} />
            <Field label="Fakultas" value={editing.faculty} onChange={(value) => setEditing({ ...editing, faculty: value })} />
            <Field label="Desa/Kelurahan" value={editing.desa} onChange={(value) => setEditing({ ...editing, desa: value })} />
            <Field label="Kecamatan" value={editing.kecamatan} onChange={(value) => setEditing({ ...editing, kecamatan: value })} />
            <Field label="Kode DPL" value={editing.kodeDpl} onChange={(value) => setEditing({ ...editing, kodeDpl: value })} />
            <div className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 transition-colors">
                Tanggal Tanda Tangan
              </span>
              <input
                type="date"
                value={parseIndonesianDayMonthToIso(editing.villageDate)}
                onChange={(event) => {
                  const dateVal = event.target.value;
                  if (dateVal) {
                    const formatted = formatIndonesianDayMonth(dateVal);
                    setEditing({ ...editing, villageDate: formatted });
                  } else {
                    setEditing({ ...editing, villageDate: '' });
                  }
                }}
                onKeyDown={(event) => event.preventDefault()}
                onPaste={(event) => event.preventDefault()}
                onClick={(event) => {
                  (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200 dark:[color-scheme:dark]"
              />
              {editing.villageDate && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                  Terformat: {editing.villageDate} (akan tercetak sebagai: {editing.desa || 'Desa'}, {editing.villageDate} 2026)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-lg tracking-tight">Kegiatan Mingguan</h3>
              <button
                type="button"
                onClick={addEntry}
                className="rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 border border-transparent dark:border-slate-700/60"
              >
                <Plus size={14} />
                Tambah Baris
              </button>
            </div>
            <div className="space-y-4">
              {editing.entries.map((entry) => (
                <div key={entry.id} className="relative grid md:grid-cols-[100px_1fr_1fr] gap-5 bg-slate-50/50 dark:bg-[#151a2d]/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-200">
                  <Field label="Hari Ke" value={entry.dayNumber} onChange={(value) => updateEntry(entry.id, { dayNumber: value })} />
                  <div className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 transition-colors">
                      Hari, Tanggal, Bulan, Tahun
                    </span>
                    <input
                      type="date"
                      value={parseIndonesianDateToIso(entry.dateText)}
                      onChange={(event) => {
                        const dateVal = event.target.value;
                        if (dateVal) {
                          const formatted = formatIndonesianDate(dateVal);
                          updateEntry(entry.id, { dateText: formatted });
                        }
                      }}
                      onKeyDown={(event) => event.preventDefault()}
                      onPaste={(event) => event.preventDefault()}
                      onClick={(event) => {
                        (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200 dark:[color-scheme:dark]"
                    />
                    {entry.dateText && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                        {entry.dateText}
                      </p>
                    )}
                  </div>
                  <div className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 transition-colors">
                      Waktu Kegiatan
                    </span>
                    <select
                      value={getSelectedTimeOption(entry.activityTime)}
                      onChange={(event) => {
                        const val = event.target.value;
                        if (val === 'custom') {
                          updateEntry(entry.id, { activityTime: '08:00 - 10:00 WIB' });
                        } else {
                          updateEntry(entry.id, { activityTime: val });
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200"
                    >
                      <option value="">-- Pilih Waktu --</option>
                      {STANDARD_TIMES.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                      <option value="custom">Kustom (Ketik Manual)</option>
                    </select>
                    {getSelectedTimeOption(entry.activityTime) === 'custom' && (
                      <input
                        type="text"
                        value={entry.activityTime}
                        onChange={(event) => updateEntry(entry.id, { activityTime: event.target.value })}
                        placeholder="Contoh: 08:00 - 10:00 WIB"
                        className="w-full mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 dark:focus:ring-m-blue/20 transition-all duration-200"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Nama Kegiatan" rows={3} value={entry.activityName} onChange={(value) => updateEntry(entry.id, { activityName: value })} />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Upload Bukti Foto/Screenshot
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 block rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-pointer hover:border-m-blue transition-colors text-center shadow-sm">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await fileToImageDataUrl(file);
                              updateEntry(entry.id, { evidenceUrl: dataUrl });
                            } catch (err: any) {
                              alert(err?.message || 'Gagal mengupload gambar');
                            } finally {
                              event.target.value = '';
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {entry.evidenceUrl ? 'Ganti Gambar' : 'Pilih Gambar'}
                        </span>
                      </label>
                      {entry.evidenceUrl && (
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.id, { evidenceUrl: '' })}
                          className="rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-2 text-xs font-bold border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {entry.evidenceUrl && (
                      <div className="mt-2 relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                        <img
                          src={entry.evidenceUrl}
                          alt="Preview bukti"
                          className="h-24 w-full object-contain p-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <aside className="order-1 lg:order-2 space-y-6">
          <div id="laporan-tersimpan" className="bg-white dark:bg-[#0f1322] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-lg tracking-tight border-b border-slate-100 dark:border-slate-800/60 pb-3">Laporan Tersimpan</h2>
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="bg-slate-50/60 dark:bg-[#151a2d]/40 rounded-xl border border-slate-100 dark:border-slate-800/80 p-4 hover:bg-slate-100/60 dark:hover:bg-[#151a2d]/80 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white">Minggu {report.week}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{report.entries.length} baris kegiatan</p>
                    </div>
                  </div>
                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setEditing(report)}
                      className="rounded-full bg-white dark:bg-[#0f1322] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2 text-xs font-bold text-center text-slate-700 dark:text-slate-300 transition-all duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => downloadPdf(report)}
                      disabled={downloadingPdf !== null}
                      className="rounded-full bg-[#e6f4ea] text-[#137333] dark:bg-emerald-950/40 dark:text-[#7ce3a2] hover:bg-[#d2e3d6] dark:hover:bg-emerald-900/60 border border-emerald-200/50 dark:border-emerald-800/40 py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-200"
                    >
                      <Download size={13} className={downloadingPdf === report.id ? "animate-bounce" : ""} />
                      {downloadingPdf === report.id ? 'Unduh...' : 'Unduh'}
                    </button>
                    <button
                      onClick={() => exportPdf(report)}
                      disabled={downloadingPdf !== null}
                      className="rounded-full bg-[#e8f0fe] text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff] hover:bg-[#d2e3fc] dark:hover:bg-m-blue/30 border border-m-blue/20 py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-200"
                    >
                      <Printer size={13} />
                      Cetak
                    </button>
                    <button
                      onClick={() => deleteReport(report)}
                      disabled={downloadingPdf !== null}
                      className="rounded-full bg-[#fce8e6] text-[#c5221f] dark:bg-red-950/40 dark:text-red-400 hover:bg-[#f9d2ce] dark:hover:bg-red-900/60 border border-red-200/50 dark:border-red-800/40 py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-200"
                      title="Hapus laporan"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada laporan tersimpan.</p>
                </div>
              )}
            </div>
          </div>

          <div id="pratinjau-pdf" className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
              Pratinjau Cetak PDF A4
            </span>
            <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 p-4 shadow-inner">
              <PreviewReportTemplate report={editing} />
            </div>
          </div>
        </aside>
      </main>

      {printReport && <div id="weekly-report-print"><ReportTemplate report={printReport} printMode /></div>}

      {pdfGenerating && (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center text-black pointer-events-none">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-m-blue mx-auto"></div>
            <p className="font-bold text-lg text-slate-800">Sedang memproses PDF...</p>
            <p className="text-sm text-slate-500">Mohon tunggu sebentar, dokumen sedang diunduh.</p>
          </div>
        </div>
      )}

      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        #weekly-report-print {
          position: fixed;
          left: -9999px;
          top: -9999px;
          width: ${A4_WIDTH_PX}px;
          min-height: ${A4_HEIGHT_PX}px;
          background: white;
          color: black;
          z-index: -9999;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100%;
            overflow: hidden;
          }
          body * {
            visibility: hidden;
          }
          #weekly-report-print, #weekly-report-print * {
            visibility: visible;
          }
          #weekly-report-print {
            position: absolute;
            left: 0;
            top: 0;
            z-index: 9999;
          }
          .no-print {
            display: none !important;
          }
        }
        /* Style date and time picker indicators to be white in dark mode */
        .dark input[type="date"]::-webkit-calendar-picker-indicator,
        .dark input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) !important;
        }
      `}</style>
    </div>
  );
};

const PreviewReportTemplate = ({ report }: { report: WeeklyReport }) => {
  const fontFamily = "'Arial Narrow', Arial, sans-serif";
  const previewScale = 0.43;
  const pageWidth = `${A4_WIDTH_MM}mm`;
  const pageHeight = `${A4_HEIGHT_MM}mm`;
  const entries = report?.entries?.length
    ? report.entries
    : [{ id: 'empty', dayNumber: report?.week || '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '' }];
  const pages = entries.reduce<WeeklyReportEntry[][]>((acc, entry, index) => {
    const pageIndex = Math.floor(index / 4);
    acc[pageIndex] = [...(acc[pageIndex] || []), entry];
    return acc;
  }, []);

  if (!report) return null;

  return (
    <div
      className="text-black"
      style={{
        width: `calc(${pageWidth} * ${previewScale})`,
      }}
    >
      {pages.map((pageEntries, pageIndex) => (
        <div
          key={pageIndex}
          className="mx-auto mb-4 border border-slate-300 dark:border-slate-700 shadow-md relative overflow-hidden bg-white"
          style={{
            width: `calc(${pageWidth} * ${previewScale})`,
            height: `calc(${pageHeight} * ${previewScale})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
              width: pageWidth,
              height: pageHeight,
            }}
          >
            <div
              className="weekly-report-pdf-page mx-auto bg-white"
              style={{
                width: pageWidth,
                height: pageHeight,
                boxSizing: 'border-box',
                overflow: 'hidden',
                padding: '5mm 11mm 8mm',
                fontFamily,
                position: 'relative',
              }}
            >
              <div className="text-center" style={{ height: '35mm', overflow: 'hidden' }}>
                <div className="flex items-center justify-center gap-[1mm] h-[15.8mm] overflow-hidden">
                  <img src={REPORT_LOGO_UMP} alt="Logo UMP" className="h-[15.8mm] w-[18mm] object-contain" />
                  <img src={REPORT_LOGO_KKN} alt="Logo KKN UMPalembang" className="h-[15.6mm] w-[31mm] object-contain" />
                </div>
                <p
                  className="mt-[0.4mm] font-bold uppercase leading-[1.1] text-[#006b35] tracking-normal"
                  style={{ fontFamily: '"Arial Narrow", Arial, sans-serif', fontSize: '14px', marginBottom: '0mm' }}
                >
                  Kuliah Kerja Nyata Angkatan Ke 66 Tahun 2026
                </p>
                <h2
                  className="font-bold uppercase text-[#006b35] tracking-normal"
                  style={{ fontSize: '24px', lineHeight: '1.3', marginTop: '0mm', marginBottom: '0mm' }}
                >
                  Universitas Muhammadiyah Palembang
                </h2>
                <div className="mx-auto h-px bg-[#00a651]" style={{ width: '184mm', marginTop: '2.5mm' }}></div>
                <div
                  className="mx-auto font-semibold text-[#006b35]"
                  style={{
                    width: '184mm',
                    fontFamily: '"Arial Narrow", Arial, sans-serif',
                    fontSize: '7px',
                    lineHeight: '1.3',
                    paddingTop: '0mm',
                    paddingBottom: '0.3mm',
                    paddingLeft: '0',
                    paddingRight: '0',
                    marginTop: '0mm',
                    marginBottom: '0.5mm',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                  }}
                >
                  Jln. Jend. Ahmad Yani 13 Ulu Palembang (30263) Telp. 0711-513022 Fax. 0711-513078  Website: http://lppm.um-palembang.ac.id/ Email : lppm@um-palembang.ac.id
                </div>
                <div className="mx-auto h-px bg-[#00a651]" style={{ width: '184mm' }}></div>
                <div style={{ height: '0.6mm' }}></div>
                <div className="mx-auto h-[1.2px] bg-[#00a651]" style={{ width: '184mm' }}></div>
              </div>

              <div className="mt-[1.5mm] rounded-[8mm] border border-[#004f28] pt-[1.5mm] px-[6mm] pb-[6mm] relative" style={{ minHeight: '236mm' }}>
                <div className="text-center">
                  <img
                    src="/report-assets/bismillah.png"
                    alt="Bismillah"
                    className="mx-auto h-[8mm] object-contain"
                  />
                  {pageIndex === 0 && (
                    <h3 className="mt-[1.5mm] text-[11px] font-bold uppercase leading-[1.25] text-black">
                      Laporan Mingguan (Logbook)<br />
                      KKN Reguler - Angkatan Ke 66<br />
                      Universitas Muhammadiyah Palembang<br />
                      Tahun 2026<br />
                      Buku Profil dan Potensi Desa
                    </h3>
                  )}
                </div>

                {pageIndex === 0 && (
                  <>
                    <div className="mt-[1.5mm] py-[0.5px] text-[11px] font-normal leading-[1.3] uppercase text-black" style={{ fontFamily: "'Aptos Display', Aptos, sans-serif" }}>
                      <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mb-[0.2mm]">
                        <div className="h-px bg-black"></div>
                        <div className="h-[2.5px] bg-black"></div>
                        <div className="h-px bg-black"></div>
                      </div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NAMA</span><span>:</span><span>{report.name}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NIM</span><span>:</span><span>{report.nim}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>PRODI</span><span>:</span><span>{report.prodi}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>FAKULTAS</span><span>:</span><span>{report.faculty}</span></div>
                      <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mt-[2mm]">
                        <div className="h-px bg-black"></div>
                        <div className="h-[2.5px] bg-black"></div>
                        <div className="h-px bg-black"></div>
                      </div>
                    </div>

                    <div className="py-[0.5px] text-[11px] font-normal leading-[1.3] uppercase text-black" style={{ fontFamily: "'Aptos Display', Aptos, sans-serif" }}>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KODE KELOMPOK</span><span>:</span><span>{report.kodeKelompok}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>DESA/KELURAHAN</span><span>:</span><span>{report.desa}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KECAMATAN</span><span>:</span><span>{report.kecamatan}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KODE DPL</span><span>:</span><span>{report.kodeDpl}</span></div>
                      <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NAMA DPL</span><span>:</span><span>{getDivisionLabel(report.division)}</span></div>
                      <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mt-[2mm]">
                        <div className="h-px bg-black"></div>
                        <div className="h-[2.5px] bg-black"></div>
                        <div className="h-px bg-black"></div>
                      </div>
                    </div>
                  </>
                )}

                <table className={`${pageIndex === 0 ? 'mt-[1.5mm]' : 'mt-[3mm]'} w-full border-collapse text-[11px] leading-tight table-fixed text-black`}>
                  <colgroup>
                    <col style={{ width: '7.2%' }} />
                    <col style={{ width: '21.5%' }} />
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '37.3%' }} />
                  </colgroup>
                  {pageIndex === 0 && (
                    <thead>
                      <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3' }}>
                        {([
                          ['Hari', 'ke'],
                          ['Hari, Tanggal,', 'Bulan, Tahun'],
                          ['Nama Kegiatan', 'Waktu Kegiatan'],
                          ['Bukti Foto dan Screenshot Flash', 'Video Kegiatan'],
                        ] as [string, string][]).map(([line1, line2], i) => (
                          <th key={i} style={{ border: '1px solid black', padding: 0, fontWeight: 'bold' }}>
                            <div style={{
                              minHeight: '9mm',
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              padding: '1mm 2px 2mm',
                              boxSizing: 'border-box',
                            }}>
                              <span>{line1}</span>
                              <span>{line2}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {pageEntries.map((entry, index) => (
                      <tr key={entry.id} className="align-top">
                        <td className={`border border-black px-1 py-2 text-center align-middle ${index === 0 ? 'h-[32mm]' : 'h-[22mm]'}`}>{entry.dayNumber}.</td>
                        <td className="border border-black px-1 py-2 whitespace-pre-wrap">{entry.dateText}</td>
                        <td className="border border-black px-1 py-2 whitespace-pre-wrap">
                          {entry.activityName}
                          {entry.activityTime && <><br /><br />{entry.activityTime}</>}
                        </td>
                        <td className="border border-black px-1 py-2">
                          {(/^https?:\/\/.+\.(png|jpg|jpeg|webp)$/i.test(entry.evidenceUrl) || /^data:image\//i.test(entry.evidenceUrl)) ? (
                            <img src={entry.evidenceUrl} alt="Bukti kegiatan" className={`${index === 0 ? 'max-h-[26mm]' : 'max-h-[16mm]'} w-full object-contain`} />
                          ) : (
                            <span className="break-all">{entry.evidenceUrl}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageIndex === pages.length - 1 && (
                  <div className="mt-[8mm] ml-auto w-[60mm] text-center text-[9px]">
                    <p>{report.desa || 'Desa/Kelurahan'}, {report.villageDate || '................'} 2026</p>
                    <div className="h-[18mm]"></div>
                    <p>({report.signerName || 'Nama'} &nbsp; {report.signerNim || 'NIM'})</p>
                  </div>
                )}

                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-white px-[3mm] text-center text-[8.5px] leading-tight text-[#00451f] whitespace-nowrap"
                  style={{ bottom: '-12px', fontFamily: '"Arial Narrow", Arial, sans-serif', fontWeight: 820 }}
                >
                  (Pascasarjana Program Studi : Hukum, Manajemen, Pend. Biologi, Teknik Kimia, Ilmu Pertanian, dan Pendidikan Agama Islam)<br />
                  Fakultas : Teknik, Ekonomi dan Bisnis, Keguruan dan Ilmu Pendidikan, Pertanian, Hukum, Agama Islam dan Kedokteran
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ReportTemplate = ({
  report,
  printMode = false,
  downloadMode = false,
}: {
  report: WeeklyReport;
  printMode?: boolean;
  downloadMode?: boolean;
}) => {
  const fontFamily = "'Arial Narrow', Arial, sans-serif";
  const pageWidth = `${A4_WIDTH_PX}px`;
  const pageHeight = `${A4_HEIGHT_PX}px`;
  const entries = report.entries.length
    ? report.entries
    : [{ id: 'empty', dayNumber: report.week || '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '' }];
  const pages = entries.reduce<WeeklyReportEntry[][]>((acc, entry, index) => {
    const pageIndex = Math.floor(index / 4);
    acc[pageIndex] = [...(acc[pageIndex] || []), entry];
    return acc;
  }, []);

  return (
    <div className="text-black">
      {pages.map((pageEntries, pageIndex) => (
        <div
          key={pageIndex}
          style={{
            breakAfter: pageIndex < pages.length - 1 ? 'page' : 'auto',
            pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
          }}
        >
          <div
            className="weekly-report-pdf-page mx-auto bg-white"
            style={{
              width: pageWidth,
              height: pageHeight,
              boxSizing: 'border-box',
              overflow: 'hidden',
              padding: '5mm 11mm 8mm',
              fontFamily,
              position: 'relative',
            }}
          >
            <div className="text-center" style={{ height: '35mm', overflow: 'hidden' }}>
              <div className="flex items-center justify-center gap-[1mm] h-[15.8mm] overflow-hidden">
                <img src={REPORT_LOGO_UMP} alt="Logo UMP" className="h-[15.8mm] w-[18mm] object-contain" />
                <img src={REPORT_LOGO_KKN} alt="Logo KKN UMPalembang" className="h-[15.6mm] w-[31mm] object-contain" />
              </div>
              <p
                className="mt-[0.4mm] font-bold uppercase leading-[1.1] text-[#006b35] tracking-normal"
                style={{ fontFamily: '"Arial Narrow", Arial, sans-serif', fontSize: '14px', marginBottom: '0mm' }}
              >
                Kuliah Kerja Nyata Angkatan Ke 66 Tahun 2026
              </p>
              <h2
                className="font-bold uppercase text-[#006b35] tracking-normal"
                style={{ fontSize: '24px', lineHeight: '1.3', marginTop: '0mm', marginBottom: '0mm' }}
              >
                Universitas Muhammadiyah Palembang
              </h2>
              <div className="mx-auto h-px bg-[#00a651]" style={{ width: '184mm', marginTop: '2.5mm' }}></div>
              <div
                className="mx-auto font-semibold text-[#006b35]"
                style={{
                  width: '184mm',
                  fontFamily: '"Arial Narrow", Arial, sans-serif',
                  fontSize: '7px',
                  lineHeight: '1.3',
                  paddingTop: '0mm',
                  paddingBottom: '0.3mm',
                  paddingLeft: '0',
                  paddingRight: '0',
                  marginTop: '-0.5mm',
                  marginBottom: '0.5mm',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                }}
              >
                Jln. Jend. Ahmad Yani 13 Ulu Palembang (30263) Telp. 0711-513022 Fax. 0711-513078  Website: http://lppm.um-palembang.ac.id/ Email : lppm@um-palembang.ac.id
              </div>
              <div className="mx-auto h-px bg-[#00a651]" style={{ width: '184mm' }}></div>
              <div style={{ height: '0.6mm' }}></div>
              <div className="mx-auto h-[1.2px] bg-[#00a651]" style={{ width: '184mm' }}></div>
            </div>

            <div className="mt-[1.5mm] rounded-[8mm] border border-[#004f28] pt-[1.5mm] px-[6mm] pb-[6mm] relative" style={{ minHeight: '236mm' }}>
              <div className="text-center">
                <img
                  src="/report-assets/bismillah.png"
                  alt="Bismillah"
                  className="mx-auto h-[8mm] object-contain"
                />
                {pageIndex === 0 && (
                  <h3 className="mt-[1.5mm] text-[11px] font-bold uppercase leading-[1.25] text-black">
                    Laporan Mingguan (Logbook)<br />
                    KKN Reguler - Angkatan Ke 66<br />
                    Universitas Muhammadiyah Palembang<br />
                    Tahun 2026<br />
                    Buku Profil dan Potensi Desa
                  </h3>
                )}
              </div>

              {pageIndex === 0 && (
                <>
                  <div className="mt-[1.5mm] py-[0.5px] text-[11px] font-normal leading-[1.3] uppercase text-black" style={{ fontFamily: "'Aptos Display', Aptos, sans-serif" }}>
                    <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mb-[0.2mm]">
                      <div className="h-px bg-black"></div>
                      <div className="h-[2.5px] bg-black"></div>
                      <div className="h-px bg-black"></div>
                    </div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NAMA</span><span>:</span><span>{report.name}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NIM</span><span>:</span><span>{report.nim}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>PRODI</span><span>:</span><span>{report.prodi}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>FAKULTAS</span><span>:</span><span>{report.faculty}</span></div>
                    <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mt-[2mm]">
                      <div className="h-px bg-black"></div>
                      <div className="h-[2.5px] bg-black"></div>
                      <div className="h-px bg-black"></div>
                    </div>
                  </div>

                  <div className="py-[0.5px] text-[11px] font-normal leading-[1.3] uppercase text-black" style={{ fontFamily: "'Aptos Display', Aptos, sans-serif" }}>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KODE KELOMPOK</span><span>:</span><span>{report.kodeKelompok}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>DESA/KELURAHAN</span><span>:</span><span>{report.desa}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KECAMATAN</span><span>:</span><span>{report.kecamatan}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>KODE DPL</span><span>:</span><span>{report.kodeDpl}</span></div>
                    <div className="grid grid-cols-[38mm_3mm_1fr]"><span>NAMA DPL</span><span>:</span><span>{getDivisionLabel(report.division)}</span></div>
                    <div className="flex flex-col gap-[1.2px] py-[0.5px] w-full mt-[2mm]">
                      <div className="h-px bg-black"></div>
                      <div className="h-[2.5px] bg-black"></div>
                      <div className="h-px bg-black"></div>
                    </div>
                  </div>
                </>
              )}

              <table className={`${pageIndex === 0 ? 'mt-[1.5mm]' : 'mt-[3mm]'} w-full border-collapse text-[11px] leading-tight table-fixed text-black`}>
                <colgroup>
                  <col style={{ width: '7.2%' }} />
                  <col style={{ width: '21.5%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '37.3%' }} />
                </colgroup>
                {pageIndex === 0 && (
                  <thead>
                    <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3' }}>
                      {([
                        ['Hari', 'ke'],
                        ['Hari, Tanggal,', 'Bulan, Tahun'],
                        ['Nama Kegiatan', 'Waktu Kegiatan'],
                        ['Bukti Foto dan Screenshot Flash', 'Video Kegiatan'],
                      ] as [string, string][]).map(([line1, line2], i) => (
                        <th key={i} style={{ border: '1px solid black', padding: 0, fontWeight: 'bold' }}>
                          <div style={{
                            minHeight: '9mm',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '1mm 2px 2mm',
                            boxSizing: 'border-box',
                          }}>
                            <span>{line1}</span>
                            <span>{line2}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {pageEntries.map((entry, index) => (
                    <tr key={entry.id} className="align-top">
                      <td className={`border border-black px-1 py-2 text-center align-middle ${index === 0 ? 'h-[32mm]' : 'h-[22mm]'}`}>{entry.dayNumber}.</td>
                      <td className="border border-black px-1 py-2 whitespace-pre-wrap">{entry.dateText}</td>
                      <td className="border border-black px-1 py-2 whitespace-pre-wrap">
                        {entry.activityName}
                        {entry.activityTime && <><br /><br />{entry.activityTime}</>}
                      </td>
                      <td className="border border-black px-1 py-2">
                        {(/^https?:\/\/.+\.(png|jpg|jpeg|webp)$/i.test(entry.evidenceUrl) || /^data:image\//i.test(entry.evidenceUrl)) ? (
                          <img src={entry.evidenceUrl} alt="Bukti kegiatan" className={`${index === 0 ? 'max-h-[26mm]' : 'max-h-[16mm]'} w-full object-contain`} />
                        ) : (
                          <span className="break-all">{entry.evidenceUrl}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pageIndex === pages.length - 1 && (
                <div className="mt-[8mm] ml-auto w-[60mm] text-center text-[9px]">
                  <p>{report.desa || 'Desa/Kelurahan'}, {report.villageDate || '................'} 2026</p>
                  <div className="h-[18mm]"></div>
                  <p>({report.signerName || 'Nama'} &nbsp; {report.signerNim || 'NIM'})</p>
                </div>
              )}

              <div
                className="absolute left-1/2 -translate-x-1/2 bg-white px-[3mm] text-center text-[8.5px] leading-tight text-[#00451f] whitespace-nowrap"
                style={{ bottom: '-12px', fontFamily: '"Arial Narrow", Arial, sans-serif', fontWeight: 820 }}
              >
                (Pascasarjana Program Studi : Hukum, Manajemen, Pend. Biologi, Teknik Kimia, Ilmu Pertanian, dan Pendidikan Agama Islam)<br />
                Fakultas : Teknik, Ekonomi dan Bisnis, Keguruan dan Ilmu Pendidikan, Pertanian, Hukum, Agama Islam dan Kedokteran
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState('');
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [siteContent, setSiteContent] = useState<SiteContent>(storage.defaults.siteContent);
  const [eventContent, setEventContent] = useState<EventContent>(storage.defaults.eventContent);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [reviewSubmissions, setReviewSubmissions] = useState<ReviewSubmission[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [editing, setEditing] = useState<{ type: EditableType; item: EditableItem } | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewSubmission | null>(null);

  useEffect(() => {
    const unsubscribeAuth = storage.onAuthChange((user) => {
      setAdminUser(user?.email || null);
      setCurrentUid(user?.uid || '');
      setCheckingAuth(false);
    });

    const unsubscribers = [
      storage.subscribeSiteContent(setSiteContent),
      storage.subscribeEventContent(setEventContent),
      storage.subscribeTeam(setTeam),
      storage.subscribePrograms(setPrograms),
      storage.subscribeGallery(setGallery),
      storage.subscribeTestimonials(setTestimonials),
      storage.subscribeReviewSubmissions(setReviewSubmissions),
      storage.subscribeMessages(setMessages),
      storage.subscribeUserProfiles(setUserProfiles),
    ];

    return () => {
      unsubscribeAuth();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setCurrentProfile(null);
      return () => undefined;
    }

    return storage.subscribeUserProfile(currentUid, setCurrentProfile);
  }, [currentUid]);

  const unreadMessages = messages.filter((message) => message.status === 'unread').length;
  const pendingReviews = reviewSubmissions.length;
  const isAdmin = adminUser === ADMIN_EMAIL || currentProfile?.role === 'admin';

  const stats = useMemo(
    () => [
      { label: 'Anggota', value: team.length, icon: Users },
      { label: 'Program', value: programs.length, icon: Briefcase },
      { label: 'Foto Galeri', value: gallery.length, icon: ImageIcon },
      { label: 'Akun Divisi', value: userProfiles.filter((profile) => profile.role === 'division').length, icon: User },
      { label: 'Ulasan Pending', value: pendingReviews, icon: MessageSquare },
      { label: 'Pesan Baru', value: unreadMessages, icon: Mail },
    ],
    [gallery.length, pendingReviews, programs.length, team.length, unreadMessages, userProfiles]
  );

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');

    try {
      await storage.login(email, password);
      await storage.init();
    } catch (error: any) {
      const code = error?.code || '';

      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setLoginError('Email atau password belum cocok. Pastikan akun ini sudah dibuat di Firebase Auth.');
        return;
      }

      if (code === 'auth/operation-not-allowed') {
        setLoginError('Login Email/Password belum diaktifkan di Firebase Authentication.');
        return;
      }

      setLoginError('Login belum berhasil. Cek koneksi, akun Firebase Auth, dan konfigurasi project.');
    }
  };

  const logout = async () => {
    await storage.logout();
  };

  const saveSite = async () => {
    setSaving(true);
    await storage.saveSiteContent(siteContent);
    setSaving(false);
  };

  const saveMaintenance = async () => {
    setSaving(true);
    await storage.saveSiteContent(siteContent);
    setSaving(false);
  };

  const saveEvent = async () => {
    setSaving(true);
    await storage.saveEventContent(eventContent);
    setSaving(false);
  };

  const saveEditing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    if (editing.type === 'team') await storage.upsertTeam(editing.item as TeamMember);
    if (editing.type === 'programs') await storage.upsertProgram(editing.item as Program);
    if (editing.type === 'gallery') await storage.upsertGallery(editing.item as GalleryImage);
    if (editing.type === 'testimonials') await storage.upsertTestimonial(editing.item as Testimonial);
    setSaving(false);
    setEditing(null);
  };

  const deleteItem = async (type: EditableType | 'messages', id: string) => {
    const confirmed = window.confirm('Yakin ingin menghapus data ini?');
    if (!confirmed) return;
    await storage.deleteItem(type, id);
  };

  const approveReview = async (review: ReviewSubmission) => {
    await storage.approveReviewSubmission(review);
  };

  const rejectReview = async (id: string) => {
    const confirmed = window.confirm('Hapus ulasan ini?');
    if (!confirmed) return;
    await storage.rejectReviewSubmission(id);
  };

  const saveReviewEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingReview) return;

    setSaving(true);
    await storage.updateReviewSubmission(editingReview);
    setSaving(false);
    setEditingReview(null);
  };

  const navItems = [
    { id: 'overview', label: 'Monitoring', icon: LayoutDashboard },
    { id: 'accounts', label: 'Akun Divisi', icon: User },
    { id: 'content', label: 'Konten Website', icon: FileText },
    { id: 'maintenance', label: 'Maintenance', icon: CalendarClock },
    { id: 'event', label: 'Event & Countdown', icon: CalendarClock },
    { id: 'team', label: 'Anggota', icon: Users },
    { id: 'programs', label: 'Program', icon: Briefcase },
    { id: 'gallery', label: 'Galeri', icon: ImageIcon },
    { id: 'testimonials', label: 'Testimoni', icon: MessageSquare },
    { id: 'reviews', label: 'Verifikasi Ulasan', icon: Check, badge: pendingReviews },
    { id: 'messages', label: 'Pesan Masuk', icon: Mail, badge: unreadMessages },
  ] as const;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="font-semibold">Memeriksa sesi admin...</div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-lg bg-m-blue text-white flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Login</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Masuk untuk melanjutkan.</p>
            </div>
          </div>

          <form onSubmit={login} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-m-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {loginError && (
              <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-300">
                {loginError}
              </p>
            )}

            <button className="w-full rounded-lg bg-m-blue hover:bg-m-blue-dark text-white py-3 font-bold transition-colors">
              Masuk
            </button>
          </form>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Kembali ke Website
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    if (!currentProfile) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 font-semibold">
            Memuat dashboard divisi...
          </div>
        </div>
      );
    }

    return <DivisionDashboard profile={currentProfile} onLogout={logout} onClose={onClose} />;
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50 dark:bg-[#070a13] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Backdrop for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fadeIn cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Drawer (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0f1322] border-r border-slate-200/60 dark:border-slate-800/60 p-6 flex flex-col justify-between overflow-y-auto shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
              <h2 className="font-black text-2xl tracking-tight text-m-blue dark:text-[#7fcfff] flex items-center gap-2">
                Admin Panel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[180px]">{adminUser}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(false);
              }}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden text-slate-500 dark:text-slate-400 transition-all duration-200 cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px]"
              aria-label="Tutup panel admin"
            >
              <X size={22} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(item.id);
                    setIsSidebarOpen(false); // Close drawer on mobile
                  }}
                  className={`w-full rounded-full px-5 py-3 text-sm font-bold flex items-center justify-between transition-all ${
                    selected
                      ? 'bg-[#e8f0fe] text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#151c30]'
                  }`}
                >
                  <span className="flex items-center gap-3.5">
                    <Icon size={18} />
                    {item.label}
                  </span>
                  {'badge' in item && item.badge > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white font-bold">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer Actions */}
        <div className="mt-8 space-y-1 border-t border-slate-100 dark:border-slate-800/80 pt-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              setIsSidebarOpen(false);
            }}
            className="w-full rounded-full px-5 py-3 text-sm font-bold flex items-center gap-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#151c30] transition-colors"
          >
            <ArrowLeft size={18} />
            Lihat Website
          </button>
          <button
            onClick={logout}
            className="w-full rounded-full px-5 py-3 text-sm font-bold flex items-center gap-3.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 md:h-full flex flex-col overflow-hidden">
        {/* Google Style Sticky App Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f1322]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(true);
              }}
              className="p-2.5 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden transition-all duration-200 flex items-center justify-center min-w-[40px] min-h-[40px]"
              title="Buka Panel Admin"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {navItems.find((item) => item.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="hidden sm:flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={14} />
              Kembali ke Web
            </button>
            <div className="h-8 w-8 rounded-full bg-m-blue/10 dark:bg-m-blue/20 text-m-blue dark:text-[#7fcfff] flex items-center justify-center font-bold text-sm border border-m-blue/20 select-none">
              {adminUser ? adminUser[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Monitoring Website</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Data realtime dari Firebase Realtime Database.</p>
              </div>

              {/* Google Style Stats Grid */}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="bg-white dark:bg-[#0f1322] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 hover:shadow-md transition-all duration-200 flex items-center gap-4"
                    >
                      <div className="h-12 w-12 rounded-xl bg-m-blue/10 dark:bg-m-blue/20 text-m-blue dark:text-[#7fcfff] flex items-center justify-center shrink-0">
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="text-2xl font-black tracking-tight">{stat.value}</div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <h3 className="font-bold mb-4">Event Aktif</h3>
                <p className="text-xl font-black">{eventContent.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{formatDateTimeDisplay(eventContent.date)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{eventContent.location}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <h3 className="font-bold mb-4">Pesan Terbaru</h3>
                {messages.slice(0, 4).map((message) => (
                  <div key={message.id} className="py-3 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-sm">{message.name}</p>
                      <span className="text-xs text-slate-400">{message.status === 'unread' ? 'Baru' : 'Dibaca'}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{message.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-sm text-slate-500">Belum ada pesan masuk.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountManager profiles={userProfiles} />
        )}

        {activeTab === 'content' && (
          <div className="space-y-6 max-w-5xl">
            <Header title="Konten Website" action={saveSite} saving={saving} />
            <div className="grid lg:grid-cols-2 gap-4">
              <Panel title="Hero">
                <Field label="Badge" value={siteContent.heroBadge} onChange={(value) => setSiteContent({ ...siteContent, heroBadge: value })} />
                <Field label="Judul" value={siteContent.heroTitle} onChange={(value) => setSiteContent({ ...siteContent, heroTitle: value })} />
                <Field label="Highlight Judul" value={siteContent.heroHighlight} onChange={(value) => setSiteContent({ ...siteContent, heroHighlight: value })} />
                <Field label="Subtitle" rows={3} value={siteContent.heroSubtitle} onChange={(value) => setSiteContent({ ...siteContent, heroSubtitle: value })} />
                <ImageField label="Gambar Hero" value={siteContent.heroImage} onChange={(value) => setSiteContent({ ...siteContent, heroImage: value })} />
              </Panel>
              <Panel title="Tentang & Visi">
                <Field label="Judul Tentang" value={siteContent.aboutTitle} onChange={(value) => setSiteContent({ ...siteContent, aboutTitle: value })} />
                <Field label="Highlight Tentang" value={siteContent.aboutHighlight} onChange={(value) => setSiteContent({ ...siteContent, aboutHighlight: value })} />
                <Field label="Deskripsi" rows={3} value={siteContent.aboutDescription} onChange={(value) => setSiteContent({ ...siteContent, aboutDescription: value })} />
                <Field label="Detail" rows={3} value={siteContent.aboutDetail} onChange={(value) => setSiteContent({ ...siteContent, aboutDetail: value })} />
                <ImageField label="Gambar Tentang" value={siteContent.aboutImage} onChange={(value) => setSiteContent({ ...siteContent, aboutImage: value })} />
                <Field label="Poin Highlight, pisahkan dengan enter" rows={4} value={siteContent.aboutHighlights.join('\n')} onChange={(value) => setSiteContent({ ...siteContent, aboutHighlights: value.split('\n').filter(Boolean) })} />
                <Field label="Visi" value={siteContent.visionTitle} onChange={(value) => setSiteContent({ ...siteContent, visionTitle: value })} />
                <Field label="Deskripsi Visi" rows={2} value={siteContent.visionDescription} onChange={(value) => setSiteContent({ ...siteContent, visionDescription: value })} />
              </Panel>
              <Panel title="Profil Desa">
                <Field label="Judul Profil Desa" value={siteContent.villageTitle} onChange={(value) => setSiteContent({ ...siteContent, villageTitle: value })} />
                <Field label="Deskripsi Profil Desa" rows={2} value={siteContent.villageDescription} onChange={(value) => setSiteContent({ ...siteContent, villageDescription: value })} />
                <Field label="Gambaran Umum" rows={4} value={siteContent.villageOverview} onChange={(value) => setSiteContent({ ...siteContent, villageOverview: value })} />
                <Field label="Google Maps Embed URL" rows={3} value={siteContent.villageMapUrl} onChange={(value) => setSiteContent({ ...siteContent, villageMapUrl: value })} />
              </Panel>
              <Panel title="Kontak">
                <Field label="Alamat" rows={2} value={siteContent.contactAddress} onChange={(value) => setSiteContent({ ...siteContent, contactAddress: value })} />
                <Field label="Email" value={siteContent.contactEmail} onChange={(value) => setSiteContent({ ...siteContent, contactEmail: value })} />
                <Field label="Instagram" value={siteContent.contactInstagram} onChange={(value) => setSiteContent({ ...siteContent, contactInstagram: value })} />
                <Field label="WhatsApp" value={siteContent.contactWhatsapp} onChange={(value) => setSiteContent({ ...siteContent, contactWhatsapp: value })} />
              </Panel>
              <Panel title="Video Dokumentasi">
                <Field label="Judul Video" value={siteContent.videoTitle} onChange={(value) => setSiteContent({ ...siteContent, videoTitle: value })} />
                <Field label="Subtitle Video" value={siteContent.videoSubtitle} onChange={(value) => setSiteContent({ ...siteContent, videoSubtitle: value })} />
                <Field label="Deskripsi Section" rows={2} value={siteContent.videoDescription} onChange={(value) => setSiteContent({ ...siteContent, videoDescription: value })} />
                <ImageField label="Poster Video" value={siteContent.videoPoster} onChange={(value) => setSiteContent({ ...siteContent, videoPoster: value })} />
                <VideoField label="File Video Base64" value={siteContent.videoSrc} onChange={(value) => setSiteContent({ ...siteContent, videoSrc: value })} />
              </Panel>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6 max-w-3xl">
            <Header title="Maintenance Website" action={saveMaintenance} saving={saving} />
            <Panel title="Status Halaman Publik">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4">
                <div>
                  <span className="block font-black text-slate-900 dark:text-white">Aktifkan halaman maintenance</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Saat aktif, pengunjung akan diarahkan ke halaman status sesuai jadwal.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={siteContent.maintenanceEnabled}
                  onChange={(event) => setSiteContent({ ...siteContent, maintenanceEnabled: event.target.checked })}
                  className="h-5 w-5 accent-m-blue"
                />
              </label>

              <Field
                label="Judul Halaman"
                value={siteContent.maintenanceTitle}
                onChange={(value) => setSiteContent({ ...siteContent, maintenanceTitle: value })}
              />
              <Field
                label="Pesan Halaman"
                rows={3}
                value={siteContent.maintenanceMessage}
                onChange={(value) => setSiteContent({ ...siteContent, maintenanceMessage: value })}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <DateField
                  label="Tanggal Mulai"
                  value={getEventDateInputValue(siteContent.maintenanceStart).date}
                  onChange={(value) => setSiteContent({ ...siteContent, maintenanceStart: setEventDatePart(siteContent.maintenanceStart, 'date', value) })}
                />
                <Field
                  label="Jam Mulai"
                  type="time"
                  value={getEventDateInputValue(siteContent.maintenanceStart).time}
                  onChange={(value) => setSiteContent({ ...siteContent, maintenanceStart: setEventDatePart(siteContent.maintenanceStart, 'time', value) })}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <DateField
                  label="Tanggal Selesai"
                  value={getEventDateInputValue(siteContent.maintenanceEnd).date}
                  onChange={(value) => setSiteContent({ ...siteContent, maintenanceEnd: setEventDatePart(siteContent.maintenanceEnd, 'date', value) })}
                />
                <Field
                  label="Jam Selesai"
                  type="time"
                  value={getEventDateInputValue(siteContent.maintenanceEnd).time}
                  onChange={(value) => setSiteContent({ ...siteContent, maintenanceEnd: setEventDatePart(siteContent.maintenanceEnd, 'time', value) })}
                />
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                Mulai: <span className="font-bold">{formatDateTimeDisplay(siteContent.maintenanceStart)}</span>
                <br />
                Selesai: <span className="font-bold">{formatDateTimeDisplay(siteContent.maintenanceEnd)}</span>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'event' && (
          <div className="space-y-6 max-w-3xl">
            <Header title="Event & Countdown" action={saveEvent} saving={saving} />
            <Panel title="Data Event">
              <Field label="Nama Event" value={eventContent.title} onChange={(value) => setEventContent({ ...eventContent, title: value })} />
              <Field label="Deskripsi" rows={3} value={eventContent.description} onChange={(value) => setEventContent({ ...eventContent, description: value })} />
              <div className="grid sm:grid-cols-2 gap-4">
                <DateField
                  label="Tanggal"
                  value={getEventDateInputValue(eventContent.date).date}
                  onChange={(value) => setEventContent({ ...eventContent, date: setEventDatePart(eventContent.date, 'date', value) })}
                />
                <Field
                  label="Jam"
                  type="time"
                  value={getEventDateInputValue(eventContent.date).time}
                  onChange={(value) => setEventContent({ ...eventContent, date: setEventDatePart(eventContent.date, 'time', value) })}
                />
              </div>
              <Field label="Lokasi" value={eventContent.location} onChange={(value) => setEventContent({ ...eventContent, location: value })} />
              <Field label="Peserta" value={eventContent.audience} onChange={(value) => setEventContent({ ...eventContent, audience: value })} />
              <ImageField label="Gambar Event" value={eventContent.image} onChange={(value) => setEventContent({ ...eventContent, image: value })} />
            </Panel>
          </div>
        )}

        {(['team', 'programs', 'gallery', 'testimonials'] as EditableType[]).includes(activeTab as EditableType) && (
          <ListManager
            type={activeTab as EditableType}
            data={{ team, programs, gallery, testimonials }[activeTab as EditableType]}
            onAdd={() => setEditing({ type: activeTab as EditableType, item: emptyItem(activeTab as EditableType) })}
            onEdit={(item) => setEditing({ type: activeTab as EditableType, item })}
            onDelete={(id) => deleteItem(activeTab as EditableType, id)}
          />
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black">Verifikasi Ulasan</h1>
              <p className="text-slate-500 dark:text-slate-400">Ulasan dari pengunjung baru tampil setelah disetujui.</p>
            </div>

            <div className="grid gap-3">
              {reviewSubmissions.map((review) => (
                <div key={review.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex gap-4">
                      {review.avatar ? (
                        <img src={review.avatar} alt={review.name} className="h-12 w-12 rounded-full object-cover bg-slate-100 dark:bg-slate-800" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-m-blue/10 text-m-blue flex items-center justify-center font-black">
                          {review.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black">{review.name}</h3>
                        <p className="text-sm text-m-blue font-semibold">{review.role}</p>
                        <p className="text-xs text-slate-400 mt-1">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => approveReview(review)}
                        className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-bold flex items-center gap-2"
                      >
                        <Check size={16} />
                        Setujui
                      </button>
                      <button
                        onClick={() => rejectReview(review.id)}
                        className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm font-bold flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-700 dark:text-slate-300">
                    {review.quote}
                  </p>
                </div>
              ))}
              {reviewSubmissions.length === 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500">
                  Belum ada ulasan yang menunggu verifikasi.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h1 className="text-3xl font-black">Pesan Masuk</h1>
            <div className="grid gap-3">
              {messages.map((message) => (
                <div key={message.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{message.name}</h3>
                        {message.status === 'unread' && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">Baru</span>}
                      </div>
                      <p className="text-sm text-slate-500">{message.email} - {message.date}</p>
                    </div>
                    <div className="flex gap-2">
                      {message.status === 'unread' && (
                        <button onClick={() => storage.markMessageAsRead(message.id)} className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-bold flex items-center gap-2">
                          <Check size={16} />
                          Dibaca
                        </button>
                      )}
                      <button onClick={() => deleteItem('messages', message.id)} className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm font-bold">
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-slate-700 dark:text-slate-300">{message.message}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-slate-500">Belum ada pesan masuk.</p>}
            </div>
          </div>
        )}
        </div>
      </main>

      {editing && (
        <EditModal
          editing={editing}
          saving={saving}
          setEditing={setEditing}
          saveEditing={saveEditing}
        />
      )}

      {editingReview && (
        <ReviewEditModal
          review={editingReview}
          saving={saving}
          setReview={setEditingReview}
          onSave={saveReviewEdit}
        />
      )}
    </div>
  );
};

const Header = ({ title, action, saving }: { title: string; action: () => void; saving: boolean }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400">Perubahan langsung tersimpan ke Firebase.</p>
    </div>
    <button onClick={action} className="rounded-lg bg-m-blue hover:bg-m-blue-dark text-white px-5 py-3 font-bold flex items-center justify-center gap-2">
      <Save size={18} />
      {saving ? 'Menyimpan...' : 'Simpan'}
    </button>
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
    <h2 className="font-black text-lg">{title}</h2>
    {children}
  </section>
);

const ListManager = ({
  type,
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: EditableType;
  data: EditableItem[];
  onAdd: () => void;
  onEdit: (item: EditableItem) => void;
  onDelete: (id: string) => void;
}) => {
  const titleMap = {
    team: 'Anggota Kelompok',
    programs: 'Program Kerja',
    gallery: 'Galeri Kegiatan',
    testimonials: 'Testimoni',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-black">{titleMap[type]}</h1>
        <button onClick={onAdd} className="rounded-lg bg-m-blue hover:bg-m-blue-dark text-white px-5 py-3 font-bold flex items-center justify-center gap-2">
          <Plus size={18} />
          Tambah Data
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((item) => {
          const image = 'image' in item ? item.image : 'url' in item ? item.url : 'avatar' in item ? item.avatar : '';
          const title = 'title' in item ? item.title : item.name;
          const subtitle = 'category' in item ? item.category : 'role' in item ? item.role : '';
          const description = 'description' in item ? item.description : 'quote' in item ? item.quote : '';

          return (
            <article key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              {image && <img src={image} alt={title} className="h-44 w-full object-cover bg-slate-200 dark:bg-slate-800" />}
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-m-blue">{subtitle}</p>
                <h3 className="font-black text-lg mt-1">{title || 'Tanpa judul'}</h3>
                {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{description}</p>}
                <div className="flex gap-2 mt-5">
                  <button onClick={() => onEdit(item)} className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-bold">
                    Edit
                  </button>
                  <button onClick={() => onDelete(item.id)} className="rounded-lg bg-red-50 text-red-700 px-3 py-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const EditModal = ({
  editing,
  saving,
  setEditing,
  saveEditing,
}: {
  editing: { type: EditableType; item: EditableItem };
  saving: boolean;
  setEditing: React.Dispatch<React.SetStateAction<{ type: EditableType; item: EditableItem } | null>>;
  saveEditing: (event: React.FormEvent) => void;
}) => {
  const updateItem = (patch: Partial<EditableItem>) => {
    setEditing((current) => current && { ...current, item: { ...current.item, ...patch } as EditableItem });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={saveEditing} className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">Edit Data</h2>
          <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        {editing.type === 'team' && (
          <>
            <Field label="Nama" value={(editing.item as TeamMember).name} onChange={(value) => updateItem({ name: value } as Partial<EditableItem>)} />
            <Field label="Jabatan" value={(editing.item as TeamMember).role} onChange={(value) => updateItem({ role: value } as Partial<EditableItem>)} />
            <Field label="Divisi" value={(editing.item as TeamMember).division || ''} onChange={(value) => updateItem({ division: value } as Partial<EditableItem>)} />
            <ImageField label="Foto Anggota" value={(editing.item as TeamMember).image} onChange={(value) => updateItem({ image: value } as Partial<EditableItem>)} />
          </>
        )}

        {editing.type === 'programs' && (
          <>
            <Field label="Kategori" value={(editing.item as Program).category} onChange={(value) => updateItem({ category: value } as Partial<EditableItem>)} />
            <Field label="Nama Program" value={(editing.item as Program).title} onChange={(value) => updateItem({ title: value } as Partial<EditableItem>)} />
            <Field label="Deskripsi" rows={4} value={(editing.item as Program).description} onChange={(value) => updateItem({ description: value } as Partial<EditableItem>)} />
            <Field label="Icon Lucide" value={(editing.item as Program).iconName} onChange={(value) => updateItem({ iconName: value } as Partial<EditableItem>)} />
          </>
        )}

        {editing.type === 'gallery' && (
          <>
            <Field label="Judul Foto" value={(editing.item as GalleryImage).title} onChange={(value) => updateItem({ title: value } as Partial<EditableItem>)} />
            <Field label="Kategori" value={(editing.item as GalleryImage).category} onChange={(value) => updateItem({ category: value } as Partial<EditableItem>)} />
            <ImageField label="Gambar Galeri" value={(editing.item as GalleryImage).url} onChange={(value) => updateItem({ url: value } as Partial<EditableItem>)} />
          </>
        )}

        {editing.type === 'testimonials' && (
          <>
            <Field label="Nama" value={(editing.item as Testimonial).name} onChange={(value) => updateItem({ name: value } as Partial<EditableItem>)} />
            <Field label="Jabatan" value={(editing.item as Testimonial).role} onChange={(value) => updateItem({ role: value } as Partial<EditableItem>)} />
            <Field label="Testimoni" rows={4} value={(editing.item as Testimonial).quote} onChange={(value) => updateItem({ quote: value } as Partial<EditableItem>)} />
            <ImageField label="Avatar Testimoni" value={(editing.item as Testimonial).avatar} onChange={(value) => updateItem({ avatar: value } as Partial<EditableItem>)} />
          </>
        )}

        <button className="w-full rounded-lg bg-m-blue hover:bg-m-blue-dark text-white py-3 font-bold flex items-center justify-center gap-2">
          <Save size={18} />
          {saving ? 'Menyimpan...' : 'Simpan Data'}
        </button>
      </form>
    </div>
  );
};

const ReviewEditModal = ({
  review,
  saving,
  setReview,
  onSave,
}: {
  review: ReviewSubmission;
  saving: boolean;
  setReview: React.Dispatch<React.SetStateAction<ReviewSubmission | null>>;
  onSave: (event: React.FormEvent) => void;
}) => {
  const updateReview = (patch: Partial<ReviewSubmission>) => {
    setReview((current) => current && { ...current, ...patch });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSave} className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">Edit Ulasan</h2>
          <button type="button" onClick={() => setReview(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <Field label="Nama" value={review.name} onChange={(value) => updateReview({ name: value })} />
        <Field label="Peran" value={review.role} onChange={(value) => updateReview({ role: value })} />
        <Field label="Ulasan" rows={5} value={review.quote} onChange={(value) => updateReview({ quote: value })} />
        <ImageField label="Avatar Ulasan" value={review.avatar} onChange={(value) => updateReview({ avatar: value })} />

        <button className="w-full rounded-lg bg-m-blue hover:bg-m-blue-dark text-white py-3 font-bold flex items-center justify-center gap-2">
          <Save size={18} />
          {saving ? 'Menyimpan...' : 'Simpan Ulasan'}
        </button>
      </form>
    </div>
  );
};
