import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  ClipboardCheck,
  Briefcase,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  MapPinned,
  Home,
  Globe,
  StickyNote,
  Plus,
  Printer,
  Save,
  Send,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { auth, storage, ContactMessage } from '../services/storage';
import {
  DivisionName,
  DivisionNote,
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
  WeeklyReportEntry,
  CompetitionItem,
  CompetitionRegistration,
  DivisionChatMessage,
} from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

type Tab = 'overview' | 'accounts' | 'content' | 'maintenance' | 'event' | 'team' | 'programs' | 'gallery' | 'testimonials' | 'reviews' | 'messages' | 'competitions' | 'competition-registrations';
type EditableType = 'team' | 'programs' | 'gallery' | 'testimonials';
type EditableItem = TeamMember | Program | GalleryImage | Testimonial;
type DivisionDashboardView = 'home' | 'maps' | 'notes' | 'chat' | 'weekly' | 'individualMatrix' | 'groupMatrix' | 'treasurerOutput' | 'treasurerIncome';

const ADMIN_EMAIL = 'kamikkn35ump@kknump.plg';

const DIVISIONS: { value: DivisionName; label: string; defaultName: string }[] = [
  { value: 'ketua', label: 'Ketua', defaultName: 'Daffa' },
  { value: 'sekretaris', label: 'Sekretaris', defaultName: 'Lulu' },
  { value: 'bendahara', label: 'Bendahara', defaultName: 'Dhita' },
  { value: 'bendahara 1', label: 'Bendahara 1', defaultName: 'Dhita' },
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

const formatDivisionLabel = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (/\d+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join(' ');

const getDivisionLabel = (value: DivisionName) => DIVISIONS.find((item) => item.value === value)?.label || formatDivisionLabel(value);

const getDivisionAccessGroup = (value: DivisionName) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.startsWith('bendahara')) return 'bendahara';
  if (normalized.startsWith('pdd')) return 'pdd';
  if (normalized.startsWith('acara')) return 'acara';
  return normalized;
};

const getChatSenderLabel = (name: string, division: DivisionName) =>
  `${name || 'Divisi'} (D. ${getDivisionLabel(division)})`;

const REPORT_LOGO_UMP = '/report-assets/logo-ump.png';
const REPORT_LOGO_KKN = '/report-assets/logo-kkn.png';
const LOGIN_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const getSessionActivityKey = (uid: string) => `kkn_session_last_active_${uid}`;
const getOtpVerifiedKey = (uid: string) => `kkn_login_otp_verified_${uid}`;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PUTRA_AI_PROXY_ENDPOINT = '/putra-ai-proxy';
const OLLAMA_ENDPOINT = 'http://localhost:11434';
const OLLAMA_REPORT_MODEL = 'llama3.2:3b';

const getPutraAiProxyUrl = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_PUTRA_AI_PROXY_ENDPOINT || PUTRA_AI_PROXY_ENDPOINT;
};

const extractPutraAiText = (payload: unknown): string => {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';

  const data = payload as Record<string, any>;
  const directText =
    data.reply ||
    data.answer ||
    data.text ||
    data.message ||
    data.response ||
    data.output ||
    data.content;

  if (typeof directText === 'string') return directText;

  const choiceText = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
  if (typeof choiceText === 'string') return choiceText;

  const candidateParts = data.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts)) {
    return candidateParts.map((part) => part?.text).filter(Boolean).join('\n');
  }

  const contentParts = data.content?.parts;
  if (Array.isArray(contentParts)) {
    return contentParts.map((part) => part?.text).filter(Boolean).join('\n');
  }

  return '';
};

const extractJsonObject = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Respons AI tidak berisi JSON.');
  }

  return JSON.parse(candidate.slice(start, end + 1));
};

const readAiStringField = (source: any, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

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

const googleInputClass =
  'w-full rounded-md border border-slate-200 bg-[#f8fafd] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1a73e8] focus:ring-4 focus:ring-[#1a73e8]/10 dark:border-slate-800 dark:bg-[#111827] dark:text-white dark:hover:bg-[#151c2c] dark:focus:border-[#8ab4f8] dark:focus:ring-[#8ab4f8]/15';

const googlePrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#1a73e8]/20 transition-all hover:bg-[#1765cc] hover:shadow-md hover:shadow-[#1a73e8]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

const googleSurfaceClass =
  'rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(60,64,67,0.12),0_2px_8px_rgba(60,64,67,0.08)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none';

const adminMiniPrimaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#1a73e8]/20 bg-[#e8f0fe] px-3 py-1.5 text-xs font-black text-[#1a73e8] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1a73e8] hover:text-white hover:shadow-md hover:shadow-[#1a73e8]/20 active:translate-y-0 dark:border-[#8ab4f8]/20 dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]';

const adminMiniNeutralButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-[#f1f3f4] hover:text-slate-900 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white';

const adminMiniDangerButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-600 hover:text-white hover:shadow-md hover:shadow-red-500/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300';

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
        className={`${googleInputClass} resize-none`}
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
        className={`${googleInputClass} dark:[color-scheme:dark]`}
      />
    )}
  </label>
);

const SignaturePad = ({
  value,
  signerName,
  onChange,
}: {
  value?: string;
  signerName?: string;
  onChange: (value: string) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = getPoint(event);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const finishDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  const generateSignatureFromName = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const name = (signerName || '').trim();
    if (!canvas || !context || !name) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#111827';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '76px "Segoe Script", "Brush Script MT", cursive';
    context.fillText(name, canvas.width / 2, canvas.height / 2 + 8, canvas.width - 80);
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(17, 24, 39, 0.22)';
    context.beginPath();
    context.moveTo(canvas.width * 0.23, canvas.height * 0.72);
    context.quadraticCurveTo(canvas.width * 0.5, canvas.height * 0.82, canvas.width * 0.77, canvas.height * 0.72);
    context.stroke();
    onChange(canvas.toDataURL('image/png'));
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `tanda-tangan-${(signerName || 'digital').trim().replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  };

  const uploadSignature = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await fileToImageDataUrl(file);
    onChange(dataUrl);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  return (
    <div className="block md:col-span-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Tanda Tangan Digital
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={generateSignatureFromName}
            disabled={!signerName?.trim()}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
          >
            Buat dari Nama
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Upload Gambar
          </button>
          <button
            type="button"
            onClick={downloadSignature}
            disabled={!value}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            Simpan PNG
          </button>
          <button
            type="button"
            onClick={clearSignature}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Hapus
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            uploadSignature(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <canvas
          ref={canvasRef}
          width={720}
          height={220}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={finishDrawing}
          className="h-[150px] w-full touch-none rounded-xl bg-white"
        />
      </div>
    </div>
  );
};

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
      className={googleInputClass}
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
      <label className="block cursor-pointer rounded-md border border-dashed border-slate-300 bg-[#f8fafd] px-4 py-4 transition-colors hover:border-[#1a73e8] hover:bg-white dark:border-slate-700 dark:bg-[#111827] dark:hover:bg-[#151c2c]">
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
          className="h-32 w-full rounded-md object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
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
  const youtubeEmbedUrl = getYouTubeEmbedUrl(value);
  const showWarning = value.trim() !== '' && !youtubeEmbedUrl;

  return (
    <div className="space-y-3">
      <Field label={label} value={value} onChange={onChange} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Masukkan link video YouTube (contoh: <code className="text-m-blue font-mono">https://www.youtube.com/watch?v=...</code> atau <code className="text-m-blue font-mono">https://youtu.be/...</code>). Video akan dapat diputar langsung di halaman web.
      </p>
      {showWarning && (
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          ⚠️ Tautan tidak dikenali sebagai tautan YouTube yang valid. Pastikan format tautan benar agar video dapat diputar.
        </p>
      )}
      {youtubeEmbedUrl && (
        <div className="mt-2 space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Preview Video
          </span>
          <iframe
            src={youtubeEmbedUrl}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 shadow-md"
          />
        </div>
      )}
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
        className={`${googleInputClass} dark:[color-scheme:dark]`}
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
  const [editingProfileDivision, setEditingProfileDivision] = useState<DivisionName>('ketua');
  const [savingProfileId, setSavingProfileId] = useState('');
  const [deletingProfileId, setDeletingProfileId] = useState('');
  const [resettingProfileId, setResettingProfileId] = useState('');
  const databaseDivisionSlots = useMemo(() => {
    const divisionValues = Array.from(new Set(
      profiles
        .filter((profile) => profile.role === 'division' && profile.division)
        .map((profile) => profile.division)
    ));

    return divisionValues
      .filter((value) => !DIVISIONS.some((item) => item.value === value))
      .map((value) => ({
        value,
        label: getDivisionLabel(value),
        defaultName: '',
      }));
  }, [profiles]);
  const allDivisions = useMemo(() => [...DIVISIONS, ...databaseDivisionSlots], [databaseDivisionSlots]);
  const visibleDivisions = allDivisions;
  const tableDivisions = useMemo(() => {
    const divisionValues = Array.from(new Set(
      profiles
        .filter((profile) => profile.role === 'division' && profile.division)
        .map((profile) => profile.division)
    ));

    return divisionValues
      .map((value) => allDivisions.find((item) => item.value === value) || { value, label: getDivisionLabel(value), defaultName: '' })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allDivisions, profiles]);
  const getProfilesByDivision = (value: DivisionName) => profiles.filter((profile) => profile.role === 'division' && profile.division === value);
  const selectedDivisionProfiles = getProfilesByDivision(division);
  const selectedDivisionHasAccount = selectedDivisionProfiles.length > 0;

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (selectedDivisionHasAccount) {
      const selectedDivision = allDivisions.find((item) => item.value === division);
      setMessage(`Divisi ${selectedDivision?.label || division} sudah punya akun. Hapus akun lama dulu kalau mau mengganti akun.`);
      return;
    }

    setSaving(true);

    try {
      await storage.createDivisionAccount({ email, password, name, division });
      setEmail('');
      setPassword('');
      setMessage('Akun berhasil dibuat dan sudah masuk daftar divisi.');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') setMessage('Email sudah dipakai akun lain.');
      else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') setMessage('Email ini sudah pernah dibuat. Masukkan password akun lama, atau gunakan email baru.');
      else if (code === 'auth/weak-password') setMessage('Password minimal 6 karakter.');
      else setMessage(error?.message || 'Akun belum berhasil dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const changeDivision = (value: DivisionName) => {
    setDivision(value);
    const defaultName = allDivisions.find((item) => item.value === value)?.defaultName || '';
    setName(defaultName);
  };

  const prepareCreateForDivision = (value: DivisionName) => {
    const selectedDivision = allDivisions.find((item) => item.value === value);
    const divisionProfiles = getProfilesByDivision(value);

    if (divisionProfiles.length > 0) {
      setDivision(value);
      setName(divisionProfiles[0].name || selectedDivision?.defaultName || '');
      setEmail('');
      setPassword('');
      setMessage(`Divisi ${selectedDivision?.label || value} sudah punya akun. Setiap divisi hanya boleh memiliki satu akun.`);
      return;
    }

    setDivision(value);
    setName(selectedDivision?.defaultName || '');
    setEmail('');
    setPassword('');
    setMessage(`Silakan isi email dan password untuk membuat akun ${selectedDivision?.label || value}.`);
  };

  const startEditProfileName = (profile: UserProfile) => {
    setEditingProfileId(profile.uid);
    setEditingProfileName(profile.name);
    setEditingProfileDivision(profile.division);
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
      const duplicateDivisionProfile = profiles.find((item) => (
        item.role === 'division' &&
        item.uid !== profile.uid &&
        item.division === editingProfileDivision
      ));

      if (duplicateDivisionProfile) {
        const targetDivision = allDivisions.find((item) => item.value === editingProfileDivision);
        setMessage(`Divisi ${targetDivision?.label || editingProfileDivision} sudah punya akun. Hapus akun lama dulu sebelum memindahkan akun ke divisi itu.`);
        return;
      }

      await storage.updateUserProfile({ ...profile, name: nextName, division: editingProfileDivision });
      setEditingProfileId('');
      setEditingProfileName('');
      setEditingProfileDivision('ketua');
      setMessage('Nama anggota berhasil diperbarui.');
    } catch (error: any) {
      setMessage(error?.message || 'Nama anggota gagal diperbarui.');
    } finally {
      setSavingProfileId('');
    }
  };

  const deleteProfile = async (profile: UserProfile) => {
    if (!window.confirm(`Hapus akun ${profile.name || profile.email} saja dari Firebase Auth dan database? Divisi lain tidak ikut terhapus.`)) return;

    setDeletingProfileId(profile.uid);
    setMessage('');

    try {
      await storage.deleteUserProfile(profile.uid);
      if (editingProfileId === profile.uid) {
        setEditingProfileId('');
        setEditingProfileName('');
        setEditingProfileDivision('ketua');
      }
      setMessage('Akun yang dipilih berhasil dihapus dari Firebase Auth dan database.');
    } catch (error: any) {
      setMessage(error?.message || 'Akun belum berhasil dihapus dari Firebase Auth.');
    } finally {
      setDeletingProfileId('');
    }
  };

  const sendProfilePasswordReset = async (profile: UserProfile) => {
    const targetEmail = profile.email.trim();
    if (!targetEmail) {
      setMessage('Email akun tidak ditemukan.');
      return;
    }

    if (!window.confirm(`Kirim link reset password ke ${targetEmail}?`)) return;

    setResettingProfileId(profile.uid);
    setMessage('');

    try {
      await storage.sendPasswordReset(targetEmail);
      setMessage(`Link reset password sudah dikirim ke ${targetEmail}. Minta pemilik akun cek inbox atau spam.`);
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/invalid-email') setMessage('Format email akun belum benar.');
      else if (code === 'auth/user-not-found') setMessage('Email ini belum terdaftar di Firebase Auth.');
      else if (code === 'auth/operation-not-allowed') setMessage('Reset password Email/Password belum diaktifkan di Firebase Authentication.');
      else setMessage(error?.message || 'Link reset password belum berhasil dikirim.');
    } finally {
      setResettingProfileId('');
    }
  };

  const hideDivisionSlot = async (value: DivisionName) => {
    const selectedDivision = allDivisions.find((item) => item.value === value);
    const divisionProfiles = getProfilesByDivision(value);

    if (divisionProfiles.length === 0) {
      setMessage(`Divisi ${selectedDivision?.label || value} tidak punya akun di database.`);
      return;
    }

    if (!window.confirm(`Hapus divisi ${selectedDivision?.label || value}? Semua ${divisionProfiles.length} akun di divisi ini akan ikut terhapus dari Firebase Auth dan database.`)) return;

    const deleteKey = `division:${value}`;
    setDeletingProfileId(deleteKey);
    setMessage('');

    try {
      await Promise.all(divisionProfiles.map((profile) => storage.deleteUserProfile(profile.uid)));

      if (divisionProfiles.some((profile) => profile.uid === editingProfileId)) {
        setEditingProfileId('');
        setEditingProfileName('');
        setEditingProfileDivision('ketua');
      }

      setMessage(`Divisi ${selectedDivision?.label || value} dan semua akunnya sudah dihapus dari Firebase Auth dan database.`);
    } catch (error: any) {
      setMessage(error?.message || 'Divisi belum berhasil dihapus.');
    } finally {
      setDeletingProfileId('');
    }
  };

  return (
    <div className="w-full space-y-3">
      <form onSubmit={createAccount} className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#1a73e8] dark:text-[#8ab4f8]">Manajemen Akun</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Buat Akun Baru</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Setiap divisi hanya boleh memiliki satu akun aktif.</p>
            </div>
            <span className="w-fit border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300">
              {profiles.filter((profile) => profile.role === 'division').length} akun aktif di database
            </span>
          </div>
          <div className="border border-slate-200 bg-[#f8fafd] p-4 shadow-none dark:border-slate-800 dark:bg-[#111827]">
            <div className="grid gap-4 lg:grid-cols-4">
              <SelectField
                label="Divisi"
                value={division}
                onChange={changeDivision}
                options={visibleDivisions.map((item) => ({ value: item.value, label: item.label }))}
              />
              <Field label="Nama Anggota" value={name} onChange={setName} />
              <Field label="Email Login" type="email" value={email} onChange={setEmail} />
              <Field label="Password Awal" type="password" value={password} onChange={setPassword} />
            </div>
            {selectedDivisionHasAccount && (
              <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                Divisi ini sudah punya akun: {selectedDivisionProfiles.map((profile) => profile.email).join(', ')}. Hapus akun lama dulu jika ingin membuat akun baru.
              </p>
            )}
          </div>
          {message && (
            <p className="border border-slate-200 bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200">
              {message}
            </p>
          )}
          <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Password asli tidak bisa dilihat ulang dari Firebase. Jika akun lupa password, gunakan tombol Reset Password di daftar akun untuk mengirim link reset ke email terdaftar.
          </p>
          <button
            type="submit"
            disabled={saving || selectedDivisionHasAccount}
            className={`${googlePrimaryButtonClass} w-full py-3 lg:w-auto lg:px-8`}
          >
            <Plus size={16} />
            {saving ? 'Membuat akun...' : selectedDivisionHasAccount ? 'Divisi Sudah Punya Akun' : 'Buat Akun'}
          </button>
        </div>
      </form>

      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1320]">
        <div className="w-full p-4">
          <div className="flex flex-col gap-3 border-b border-slate-300/70 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-1 bg-[#1a73e8]" />
              <div>
                <h2 className="font-black text-lg text-slate-950 dark:text-white">Daftar Divisi</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kelola slot divisi, akun aktif, dan akun kosong.</p>
              </div>
            </div>
            <span className="w-fit border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300">
              {tableDivisions.length} divisi di database
            </span>
          </div>

          <div className="mt-4 border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
            <div className="hidden grid-cols-[220px_110px_minmax(0,1fr)_150px] gap-4 border-b border-slate-200 bg-[#f8fafd] px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400 lg:grid">
              <span>Divisi</span>
              <span>Status</span>
              <span>Akun</span>
              <span className="text-right">Aksi</span>
            </div>
            {tableDivisions.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Belum ada akun divisi di database.</p>
              </div>
            )}
            {tableDivisions.map((item) => {
              const divisionProfiles = getProfilesByDivision(item.value);
              const hasDuplicateAccounts = divisionProfiles.length > 1;
              return (
                <div key={item.value} className="grid gap-3 border-b border-slate-200 px-4 py-2.5 last:border-b-0 hover:bg-[#f4f8ff] dark:border-slate-800 dark:hover:bg-[#111827] lg:grid-cols-[220px_110px_minmax(0,1fr)_150px] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-wide text-slate-950 dark:text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {divisionProfiles.length ? `${divisionProfiles.length} akun terdaftar` : 'Slot belum punya akun'}
                      {hasDuplicateAccounts ? ' - hapus salah satu akun' : ''}
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black ${hasDuplicateAccounts ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : divisionProfiles.length ? 'bg-[#e6f4ea] text-[#137333] dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-[#fef7e0] text-[#b06000] dark:bg-amber-950/40 dark:text-amber-300'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${hasDuplicateAccounts ? 'bg-red-500' : divisionProfiles.length ? 'bg-[#34a853]' : 'bg-[#fbbc04]'}`} />
                      {hasDuplicateAccounts ? 'Duplikat' : divisionProfiles.length ? 'Aktif' : 'Kosong'}
                    </span>
                  </div>

                  {divisionProfiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {divisionProfiles.map((profile) => (
                        <div key={profile.uid}>
                          {editingProfileId === profile.uid ? (
                            <div className="space-y-2 border border-[#d2e3fc] bg-[#f8fbff] p-3 dark:border-[#1a73e8]/30 dark:bg-slate-950/60">
                              <input
                                value={editingProfileName}
                                onChange={(event) => setEditingProfileName(event.target.value)}
                                className={googleInputClass}
                                autoFocus
                              />
                              <SelectField
                                label="Pindah Divisi"
                                value={editingProfileDivision}
                                onChange={setEditingProfileDivision}
                                options={visibleDivisions.map((divisionItem) => ({ value: divisionItem.value, label: divisionItem.label }))}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveProfileName(profile)}
                                  disabled={savingProfileId === profile.uid}
                                  className={adminMiniPrimaryButtonClass}
                                >
                                  <Save size={12} />
                                  {savingProfileId === profile.uid ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProfileId('');
                                    setEditingProfileName('');
                                    setEditingProfileDivision('ketua');
                                  }}
                                  className={adminMiniNeutralButtonClass}
                                >
                                  <X size={12} />
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 bg-transparent py-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#e8f0fe] text-xs font-black text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
                                  {(profile.name || profile.email || item.label).slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{profile.name || item.defaultName || 'Belum diisi'}</p>
                                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => sendProfilePasswordReset(profile)}
                                disabled={resettingProfileId === profile.uid}
                                className={`${adminMiniPrimaryButtonClass} shrink-0`}
                              >
                                <Mail size={12} />
                                {resettingProfileId === profile.uid ? 'Mengirim...' : 'Reset Password'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProfile(profile)}
                                disabled={deletingProfileId === profile.uid}
                                className={`${adminMiniDangerButtonClass} shrink-0`}
                              >
                                <Trash2 size={12} />
                                {deletingProfileId === profile.uid ? 'Menghapus...' : 'Hapus akun'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-1">
                      <p className="truncate text-sm font-black text-slate-800 dark:text-white">{item.defaultName || 'Belum diisi'}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Akun belum dibuat untuk slot ini.</p>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    {divisionProfiles[0] && (
                      <button
                        type="button"
                        onClick={() => startEditProfileName(divisionProfiles[0])}
                        className={adminMiniNeutralButtonClass}
                      >
                        <Edit size={12} />
                        Edit akun
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => prepareCreateForDivision(item.value)}
                      disabled={divisionProfiles.length > 0}
                      className={adminMiniPrimaryButtonClass}
                    >
                      <Plus size={12} />
                      {divisionProfiles.length > 0 ? 'Sudah ada' : 'Tambah'}
                    </button>
                    <button
                      type="button"
                      onClick={() => hideDivisionSlot(item.value)}
                      disabled={deletingProfileId === `division:${item.value}`}
                      className={adminMiniDangerButtonClass}
                    >
                      <Trash2 size={12} />
                      {deletingProfileId === `division:${item.value}` ? 'Menghapus...' : 'Hapus divisi & akun'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const createEmptyReport = (profile: UserProfile, week = '1', reportType: WeeklyReport['reportType'] = 'weekly'): WeeklyReport => ({
  id: `week_${Date.now()}`,
  reportType,
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
  signatureDataUrl: '',
  entries: [
    { id: `entry_${Date.now()}_1`, dayNumber: '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '', responsibleName: '' },
  ],
});

const isGroupMatrixReport = (report: WeeklyReport) =>
  report.reportType === 'matrix' || (report.division === 'sekretaris' && report.entries.some((entry) => Boolean(entry.responsibleName)));

const isIndividualMatrixReport = (report: WeeklyReport) => report.reportType === 'individualMatrix';
const isMatrixReport = (report: WeeklyReport) => isGroupMatrixReport(report) || isIndividualMatrixReport(report);
const isTreasurerOutputReport = (report: WeeklyReport) => report.reportType === 'treasurerOutput';
const isTreasurerIncomeReport = (report: WeeklyReport) => report.reportType === 'treasurerIncome';
const isTreasurerFinancialReport = (report: WeeklyReport) => isTreasurerOutputReport(report) || isTreasurerIncomeReport(report);
const isCustomTableReport = (report: WeeklyReport) => isMatrixReport(report) || isTreasurerFinancialReport(report);

const getReportFilePrefix = (report: WeeklyReport) => {
  if (isGroupMatrixReport(report)) return 'Matriks_Program_Kerja_Kelompok';
  if (isIndividualMatrixReport(report)) return 'Matriks_Program_Kerja_Individu';
  if (isTreasurerOutputReport(report)) return 'Laporan_Pengeluaran_Bendahara';
  if (isTreasurerIncomeReport(report)) return 'Laporan_Pemasukan_Bendahara';
  return `Laporan_Mingguan_Minggu_${sanitizeFilePart(report.week)}`;
};

const parseCurrencyValue = (value: string) => {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const isLiveLocationFresh = (location: LiveLocation) => Date.now() - Number(location.updatedAt || 0) < 2 * 60 * 1000;

const formatLiveLocationTime = (timestamp: number) => {
  if (!timestamp) return 'Belum pernah update';
  return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const lonToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;
const latToTileY = (lat: number, zoom: number) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const chooseMapZoom = (locations: LiveLocation[]) => {
  if (locations.length <= 1) return 16;
  const lats = locations.map((location) => location.lat);
  const lngs = locations.map((location) => location.lng);
  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  if (spread > 40) return 2;
  if (spread > 20) return 3;
  if (spread > 10) return 4;
  if (spread > 5) return 5;
  if (spread > 2) return 7;
  if (spread > 1) return 8;
  if (spread > 0.5) return 9;
  if (spread > 0.25) return 10;
  if (spread > 0.15) return 12;
  if (spread > 0.06) return 13;
  if (spread > 0.025) return 14;
  if (spread > 0.01) return 15;
  return 16;
};

const clampMapZoom = (zoom: number) => Math.max(2, Math.min(18, zoom));

const TANJUNG_GELAM_CENTER = { lat: -3.27384, lng: 104.678205 };
const TANJUNG_GELAM_GOOGLE_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=-3.273840,104.678205';

const getLocationsCenter = (locations: LiveLocation[]) =>
  locations.length
    ? {
        lat: locations.reduce((sum, location) => sum + location.lat, 0) / locations.length,
        lng: locations.reduce((sum, location) => sum + location.lng, 0) / locations.length,
      }
    : TANJUNG_GELAM_CENTER;

const TANJUNG_GELAM_BOUNDARY_POINTS = [
  { lat: -3.2817, lng: 104.6498 },
  { lat: -3.2743, lng: 104.6545 },
  { lat: -3.2734, lng: 104.6662 },
  { lat: -3.2747, lng: 104.6778 },
  { lat: -3.2796, lng: 104.6851 },
  { lat: -3.2877, lng: 104.6845 },
  { lat: -3.2922, lng: 104.6754 },
  { lat: -3.2915, lng: 104.6636 },
  { lat: -3.2874, lng: 104.6543 },
];

const LiveLocationsMap = ({ locations, currentUid, selectedUid, onSelectLocation }: { locations: LiveLocation[]; currentUid: string; selectedUid: string; onSelectLocation: (uid: string) => void }) => {
  const [viewport, setViewport] = useState<{ center: { lat: number; lng: number }; zoom: number } | null>(null);
  const [hasInitialFit, setHasInitialFit] = useState(false);
  const dragState = useRef<{ x: number; y: number; center: { lat: number; lng: number } } | null>(null);
  const didDrag = useRef(false);
  const lastSelectedUid = useRef('');
  const usableLocations = locations.filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng));
  const selectedLocation = usableLocations.find((location) => location.uid === selectedUid);
  const locationsSignature = usableLocations.map((location) => `${location.uid}:${location.lat.toFixed(5)},${location.lng.toFixed(5)}`).join('|');
  const initialCenter = getLocationsCenter(usableLocations);
  const initialZoom = clampMapZoom(chooseMapZoom(usableLocations));
  const center = viewport?.center || initialCenter;
  const zoom = viewport?.zoom ?? initialZoom;
  const centerTileX = lonToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const tileColumns = 9;
  const tileRows = 5;
  const tileLayerWidth = tileColumns * 256;
  const tileLayerHeight = tileRows * 256;
  const startX = Math.floor(centerTileX) - Math.floor(tileColumns / 2);
  const startY = Math.floor(centerTileY) - Math.floor(tileRows / 2);
  const maxTile = 2 ** zoom;
  const tiles = Array.from({ length: tileColumns * tileRows }, (_, index) => {
    const dx = index % tileColumns;
    const dy = Math.floor(index / tileColumns);
    const x = ((startX + dx) % maxTile + maxTile) % maxTile;
    const y = Math.min(Math.max(startY + dy, 0), maxTile - 1);
    return { x, y, dx, dy };
  });
  const tileLayerOffsetX = tileLayerWidth / 2 + (startX - centerTileX) * 256;
  const tileLayerOffsetY = tileLayerHeight / 2 + (startY - centerTileY) * 256;
  const tanjungGelamBoundaryPath = `${TANJUNG_GELAM_BOUNDARY_POINTS.map((point, index) => {
    const pointTileX = lonToTileX(point.lng, zoom);
    const pointTileY = latToTileY(point.lat, zoom);
    const x = tileLayerWidth / 2 + (pointTileX - centerTileX) * 256;
    const y = tileLayerHeight / 2 + (pointTileY - centerTileY) * 256;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ')} Z`;

  useEffect(() => {
    if (hasInitialFit || usableLocations.length === 0) return;

    setViewport({ center: initialCenter, zoom: initialZoom });
    setHasInitialFit(true);
  }, [hasInitialFit, initialCenter.lat, initialCenter.lng, initialZoom, usableLocations.length, locationsSignature]);

  useEffect(() => {
    if (!selectedUid || selectedUid === lastSelectedUid.current) {
      lastSelectedUid.current = selectedUid;
      return;
    }

    lastSelectedUid.current = selectedUid;
    if (!selectedLocation) return;

    setViewport((current) => ({
      center: { lat: selectedLocation.lat, lng: selectedLocation.lng },
      zoom: current?.zoom ?? clampMapZoom(Math.max(initialZoom, 15)),
    }));
  }, [selectedUid, selectedLocation?.lat, selectedLocation?.lng, initialZoom]);

  const updateCenterFromDrag = (clientX: number, clientY: number) => {
    if (!dragState.current) return;

    const deltaX = clientX - dragState.current.x;
    const deltaY = clientY - dragState.current.y;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      didDrag.current = true;
    }
    const startTileX = lonToTileX(dragState.current.center.lng, zoom);
    const startTileY = latToTileY(dragState.current.center.lat, zoom);
    const nextTileX = startTileX - deltaX / 256;
    const nextTileY = startTileY - deltaY / 256;
    const n = 2 ** zoom;
    const lng = (nextTileX / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * nextTileY) / n)));
    const lat = (latRad * 180) / Math.PI;
    setViewport((current) => ({
      center: { lat: Math.max(-85, Math.min(85, lat)), lng },
      zoom: current?.zoom ?? zoom,
    }));
  };

  const changeZoom = (nextZoom: number) => {
    setViewport((current) => ({
      center,
      zoom: clampMapZoom(nextZoom),
    }));
  };

  const showAllLocations = () => {
    setViewport({ center: initialCenter, zoom: initialZoom });
    setHasInitialFit(true);
    onSelectLocation('');
  };
  const googleMapsHref = selectedLocation
    ? `https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`
    : TANJUNG_GELAM_GOOGLE_MAPS_URL;

  return (
    <div
      className="relative h-[360px] cursor-grab touch-none overflow-hidden border border-slate-200 bg-slate-100 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-950"
      onPointerDown={(event) => {
        didDrag.current = false;
        dragState.current = { x: event.clientX, y: event.clientY, center };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => updateCenterFromDrag(event.clientX, event.clientY)}
      onPointerUp={(event) => {
        dragState.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragState.current = null;
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: `${tileLayerWidth}px`, height: `${tileLayerHeight}px` }}
      >
        {tiles.map((tile) => (
          <img
            key={`${zoom}_${tile.x}_${tile.y}_${tile.dx}_${tile.dy}`}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
            alt=""
            className="pointer-events-none absolute h-64 w-64 select-none object-cover"
            style={{ left: `${tileLayerOffsetX + tile.dx * 256}px`, top: `${tileLayerOffsetY + tile.dy * 256}px` }}
            draggable={false}
          />
        ))}
        <svg
          className="pointer-events-none absolute inset-0"
          width={tileLayerWidth}
          height={tileLayerHeight}
          viewBox={`0 0 ${tileLayerWidth} ${tileLayerHeight}`}
          aria-hidden="true"
        >
          <path
            d={tanjungGelamBoundaryPath}
            fill="rgba(14, 165, 233, 0.10)"
            stroke="#0284c7"
            strokeWidth="4"
            strokeDasharray="10 7"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-white/10 pointer-events-none" />
      {usableLocations.map((location) => {
        const tileX = lonToTileX(location.lng, zoom);
        const tileY = latToTileY(location.lat, zoom);
        const left = (tileX - centerTileX) * 256;
        const top = (tileY - centerTileY) * 256;
        const fresh = isLiveLocationFresh(location);
        const isCurrentUser = location.uid === currentUid;
        const isSelected = location.uid === selectedUid;

        return (
          <div
            key={location.uid}
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer"
            style={{ left: `calc(50% + ${left}px)`, top: `calc(50% + ${top}px)` }}
            title={`${location.name} - ${getDivisionLabel(location.division)}`}
            onClick={() => {
              if (!didDrag.current) {
                onSelectLocation(location.uid);
              }
            }}
          >
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-4 text-sm font-black text-white shadow-xl ${isSelected ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''} ${isCurrentUser ? 'border-white bg-m-blue' : fresh ? 'border-white bg-emerald-500' : 'border-slate-200 bg-slate-500'}`}>
              {location.name?.[0]?.toUpperCase() || 'D'}
              {fresh && <span className={`absolute inset-0 -z-10 rounded-full ${isCurrentUser ? 'bg-m-blue' : 'bg-emerald-500'} animate-ping opacity-40`} />}
            </div>
            <div className="absolute left-1/2 top-11 min-w-max -translate-x-1/2 rounded-full bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-800 dark:text-white shadow-sm">
              {getDivisionLabel(location.division)}
            </div>
          </div>
        );
      })}
      {usableLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
            Belum ada lokasi aktif. Aktifkan Live Maps untuk mulai berbagi lokasi.
          </p>
        </div>
      )}
      <a
        href={googleMapsHref}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 rounded-full bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-black text-m-blue shadow-sm hover:bg-m-blue hover:text-white transition-colors"
        onPointerDown={(event) => event.stopPropagation()}
      >
        Buka Maps
      </a>
      <button
        type="button"
        onClick={showAllLocations}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute bottom-3 left-3 rounded-full bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-200 shadow-sm hover:bg-m-blue hover:text-white transition-colors"
      >
        Lihat Semua
      </button>
      <div
        className="absolute right-3 top-3 flex overflow-hidden rounded-full border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/95"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => changeZoom(zoom + 1)}
          className="h-9 w-10 text-base font-black text-slate-700 transition-colors hover:bg-m-blue hover:text-white dark:text-slate-200"
          aria-label="Perbesar maps"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => changeZoom(zoom - 1)}
          className="h-9 w-10 border-l border-slate-200 text-base font-black text-slate-700 transition-colors hover:bg-m-blue hover:text-white dark:border-slate-800 dark:text-slate-200"
          aria-label="Perkecil maps"
        >
          -
        </button>
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 shadow-sm pointer-events-none">
        Geser peta untuk melihat sekitar
      </div>
    </div>
  );
};

const getTreasurerOutputTotal = (entries: WeeklyReportEntry[]) =>
  entries.reduce((total, entry) => total + parseCurrencyValue(entry.responsibleName || ''), 0);

const createEmptyReportEntry = (index: number): WeeklyReportEntry => ({
  id: `entry_${Date.now()}_${index}`,
  dayNumber: String(index),
  dateText: '',
  activityName: '',
  activityTime: '',
  evidenceUrl: '',
  responsibleName: '',
});

const getNextReportWeek = (reports: WeeklyReport[]) => {
  const usedWeeks = reports
    .map((report) => Number(report.week))
    .filter((week) => Number.isFinite(week) && week > 0);

  return String((usedWeeks.length ? Math.max(...usedWeeks) : 0) + 1);
};

const getReportSortValue = (report: WeeklyReport) => {
  const updatedAt = report.updatedAt as any;
  if (typeof updatedAt === 'number') return updatedAt;
  const week = Number(report.week || 0);
  return Number.isFinite(week) ? week : 0;
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

    pdf.save(`${getReportFilePrefix(report)}_${sanitizeFilePart(report.name)}_${getDownloadTimestamp()}.pdf`);
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

  pdf.save(`${getReportFilePrefix(report)}_${sanitizeFilePart(report.name)}_${getDownloadTimestamp()}.pdf`);
};

const DivisionDashboard = ({
  profile,
  onLogout,
  onClose,
  onAdminPanel,
  initialView = 'home',
  adminNavItems = [],
}: {
  profile: UserProfile;
  onLogout: () => void;
  onClose?: () => void;
  onAdminPanel?: () => void;
  initialView?: DivisionDashboardView;
  adminNavItems?: {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    action: () => void;
  }[];
}) => {
  const isUnifiedOperatorPanel = adminNavItems.length > 0;
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [financialReports, setFinancialReports] = useState<WeeklyReport[]>([]);
  const [notes, setNotes] = useState<DivisionNote[]>([]);
  const [divisionProfiles, setDivisionProfiles] = useState<UserProfile[]>([]);
  const [publicChatMessages, setPublicChatMessages] = useState<DivisionChatMessage[]>([]);
  const [privateChatMessages, setPrivateChatMessages] = useState<DivisionChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<'public' | 'private'>('public');
  const [selectedPrivateUid, setSelectedPrivateUid] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatToast, setChatToast] = useState<DivisionChatMessage | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [isLocationPermissionRequesting, setIsLocationPermissionRequesting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Live Maps belum aktif.');
  const [locationError, setLocationError] = useState('');
  const [selectedLocationUid, setSelectedLocationUid] = useState('');
  const [selectedFinancialReportId, setSelectedFinancialReportId] = useState('');
  const [dashboardView, setDashboardView] = useState<DivisionDashboardView>(initialView);
  const reportPageType: WeeklyReport['reportType'] =
    dashboardView === 'individualMatrix'
      ? 'individualMatrix'
      : dashboardView === 'groupMatrix'
        ? 'matrix'
        : dashboardView === 'treasurerOutput'
          ? 'treasurerOutput'
          : dashboardView === 'treasurerIncome'
            ? 'treasurerIncome'
            : 'weekly';
  const [isNavOpen, setIsNavOpen] = useState(false);
  const locationWatchId = useRef<number | null>(null);
  const locationWakeLock = useRef<any>(null);
  const liveTrackingPreferenceKey = `live_maps_tracking_${profile.uid}`;
  const divisionAccessGroup = getDivisionAccessGroup(profile.division);
  const isSecretary = divisionAccessGroup === 'sekretaris';
  const isTreasurer = divisionAccessGroup === 'bendahara';
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

  const isReportDashboardView = (view: typeof dashboardView) =>
    view === 'weekly' || view === 'individualMatrix' || view === 'groupMatrix' || view === 'treasurerOutput' || view === 'treasurerIncome';

  const getNormalizedReportType = (report: WeeklyReport): WeeklyReport['reportType'] =>
    isGroupMatrixReport(report) ? 'matrix' : isIndividualMatrixReport(report) ? 'individualMatrix' : isTreasurerOutputReport(report) ? 'treasurerOutput' : isTreasurerIncomeReport(report) ? 'treasurerIncome' : 'weekly';

  const openDashboardView = (view: typeof dashboardView, sectionId?: string) => {
    setDashboardView(view);
    closeNav();

    if (sectionId) {
      window.setTimeout(() => scrollToSection(sectionId), 80);
    } else {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
    }
  };

  const openReportPage = (view: 'weekly' | 'individualMatrix' | 'groupMatrix' | 'treasurerOutput' | 'treasurerIncome', sectionId?: string) => {
    const targetType: WeeklyReport['reportType'] =
      view === 'groupMatrix' ? 'matrix' : view === 'treasurerOutput' ? 'treasurerOutput' : view === 'treasurerIncome' ? 'treasurerIncome' : view;
    if ((targetType === 'treasurerOutput' || targetType === 'treasurerIncome') && !isTreasurer) {
      openDashboardView(view, sectionId);
      return;
    }

    const matchingReport = [editing, ...reports].find((report) => getNormalizedReportType(report) === targetType);

    setEditing(matchingReport || createEmptyReport(profile, getNextReportWeek([...reports, editing]), targetType));
    openDashboardView(view, sectionId);
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
  const [editingNote, setEditingNote] = useState<DivisionNote>(() => ({
    id: `note_${Date.now()}`,
    userId: profile.uid,
    division: profile.division,
    title: '',
    content: '',
    date: new Date().toLocaleString('id-ID'),
  }));
  const [saving, setSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [printReport, setPrintReport] = useState<WeeklyReport | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatSending, setAiChatSending] = useState(false);
  const [aiReportGenerating, setAiReportGenerating] = useState(false);
  const [aiReportMessage, setAiReportMessage] = useState('');
  const [aiChatHost, setAiChatHost] = useState<HTMLElement | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    {
      role: 'assistant',
      text: 'Halo, saya PUTRA AI STUDIO. Tanyakan apa yang ingin kamu bantu susun untuk laporan KKN.',
    },
  ]);
  const editingIsGroupMatrix = isGroupMatrixReport(editing);
  const editingIsIndividualMatrix = isIndividualMatrixReport(editing);
  const editingIsMatrix = isMatrixReport(editing);
  const editingIsTreasurerOutput = isTreasurerOutputReport(editing);
  const editingIsTreasurerIncome = isTreasurerIncomeReport(editing);
  const editingIsTreasurerFinancial = isTreasurerFinancialReport(editing);
  const normalizeNumberedEntries = (entries: WeeklyReportEntry[]) =>
    entries.map((entry, index) => ({
      ...entry,
      dayNumber: String(index + 1),
    }));
  const shouldNormalizeReportEntries = (report: WeeklyReport) => report.reportType === 'weekly' || isMatrixReport(report);
  const hasAiProtectedContent = (entry: WeeklyReportEntry) =>
    [entry.dateText, entry.activityName, entry.activityTime, entry.evidenceUrl, entry.responsibleName]
      .some((value) => Boolean(String(value || '').trim()));
  const chatLastSeenKey = `division_chat_last_seen_${profile.uid}`;
  const [chatLastSeenAt, setChatLastSeenAt] = useState(() => Number(localStorage.getItem(chatLastSeenKey) || 0));
  const privateChatPartners = divisionProfiles.filter((item) => item.uid !== profile.uid);
  const selectedPrivateProfile =
    privateChatPartners.find((item) => item.uid === selectedPrivateUid) || privateChatPartners[0] || null;
  const activePrivateUid = selectedPrivateUid || selectedPrivateProfile?.uid || '';
  const activePrivateMessages = activePrivateUid
    ? privateChatMessages.filter((message) => message.senderUid === activePrivateUid || message.recipientUid === activePrivateUid)
    : [];
  const visibleChatMessages = chatMode === 'public' ? publicChatMessages : activePrivateMessages;
  const incomingChatMessages = [...publicChatMessages, ...privateChatMessages].filter((message) => message.senderUid !== profile.uid);
  const unreadChatCount = incomingChatMessages.filter((message) => Number(message.createdAtMs || 0) > chatLastSeenAt).length;
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifiedChatIdsRef = useRef<Set<string>>(new Set());

  const requestChatNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setChatError('Browser ini belum mendukung notifikasi.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== 'granted') {
      setChatError(permission === 'denied' ? 'Izin notifikasi diblokir browser.' : 'Izin notifikasi belum aktif.');
      return;
    }

    try {
      await storage.registerDivisionPushToken(profile);
      setChatError('');
      setChatToast({
        id: `notif_ready_${Date.now()}`,
        chatType: 'public',
        senderUid: profile.uid,
        senderName: 'Sistem KKN 35',
        senderEmail: '',
        senderDivision: profile.division,
        text: 'Notifikasi chat sudah aktif untuk akun ini.',
        date: new Date().toLocaleString('id-ID'),
        createdAtMs: Date.now(),
      });
    } catch (error: any) {
      setChatError(error?.message || 'Token notifikasi belum berhasil disimpan.');
    }
  };

  const showChatNotification = async (message: DivisionChatMessage) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const title = message.chatType === 'private'
      ? `Chat pribadi dari ${message.senderName}`
      : `Chat publik dari ${getDivisionLabel(message.senderDivision)}`;
    const options: NotificationOptions = {
      body: message.text,
      icon: '/report-assets/logokknv1.png',
      badge: '/report-assets/logokknv1.png',
      tag: `division-chat-${message.id}`,
      data: { url: `${window.location.origin}/#admin` },
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration?.showNotification) {
        registration.showNotification(title, options);
        return;
      }
    }

    new Notification(title, options);
  };

  useEffect(() => storage.subscribeWeeklyReports(profile.uid, setReports), [profile.uid]);
  useEffect(() => storage.subscribeFinancialReports(setFinancialReports), []);
  useEffect(() => storage.subscribeDivisionNotes(profile.uid, setNotes), [profile.uid]);
  useEffect(() => storage.subscribeUserProfiles((profiles) => setDivisionProfiles(profiles.filter((item) => item.role === 'division'))), []);
  useEffect(() => storage.subscribePublicDivisionChat(setPublicChatMessages), []);
  useEffect(() => storage.subscribePrivateDivisionChats(profile.uid, setPrivateChatMessages), [profile.uid]);
  useEffect(() => storage.subscribeLiveLocations(setLiveLocations), []);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    storage.registerDivisionPushToken(profile).catch(() => undefined);
  }, [profile.uid]);

  useEffect(() => {
    if (!selectedPrivateUid && privateChatPartners[0]?.uid) {
      setSelectedPrivateUid(privateChatPartners[0].uid);
    }
  }, [privateChatPartners, selectedPrivateUid]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleChatMessages.length, chatMode, activePrivateUid]);

  useEffect(() => {
    if (dashboardView !== 'chat') return;
    const latest = Math.max(0, ...incomingChatMessages.map((message) => Number(message.createdAtMs || 0)));
    if (!latest) return;
    localStorage.setItem(chatLastSeenKey, String(latest));
    setChatLastSeenAt(latest);
  }, [dashboardView, incomingChatMessages.length, chatLastSeenKey]);

  useEffect(() => {
    incomingChatMessages.forEach((message) => {
      if (notifiedChatIdsRef.current.has(message.id)) return;
      notifiedChatIdsRef.current.add(message.id);
      if (Number(message.createdAtMs || 0) <= chatLastSeenAt) return;
      if (!(dashboardView === 'chat' && document.visibilityState === 'visible')) {
        setChatToast(message);
        window.setTimeout(() => {
          setChatToast((current) => (current?.id === message.id ? null : current));
        }, 6000);
      }
      showChatNotification(message).catch(() => undefined);
    });
  }, [incomingChatMessages, chatLastSeenAt, dashboardView]);

  useEffect(() => {
    return () => {
      if (locationWatchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
      locationWakeLock.current?.release?.().catch?.(() => undefined);
      storage.deleteLiveLocation(profile.uid).catch(() => undefined);
    };
  }, [profile.uid]);

  useEffect(() => {
    const host = document.createElement('div');
    host.id = 'putra-ai-chat-root';
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('right', '24px', 'important');
    host.style.setProperty('bottom', '72px', 'important');
    host.style.setProperty('z-index', '2147483647', 'important');
    host.style.setProperty('display', 'flex', 'important');
    host.style.setProperty('flex-direction', 'column', 'important');
    host.style.setProperty('align-items', 'flex-end', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    host.style.setProperty('opacity', '1', 'important');
    host.style.setProperty('pointer-events', 'auto', 'important');
    host.style.setProperty('transform', 'none', 'important');
    document.body.appendChild(host);
    setAiChatHost(host);

    return () => {
      setAiChatHost(null);
      host.remove();
    };
  }, []);

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
        await storage.saveWeeklyReport({
          ...editing,
          entries: shouldNormalizeReportEntries(editing) ? normalizeNumberedEntries(editing.entries) : editing.entries,
          reportType: isGroupMatrixReport(editing) ? 'matrix' : isIndividualMatrixReport(editing) ? 'individualMatrix' : isTreasurerOutputReport(editing) ? 'treasurerOutput' : isTreasurerIncomeReport(editing) ? 'treasurerIncome' : 'weekly',
        });
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
      entries: [...current.entries, createEmptyReportEntry(current.entries.length + 1)],
    }));
  };

  const generateReportWithOllama = async (targetIndex?: number) => {
    if (!editingIsMatrix && editing.reportType !== 'weekly') {
      setAiReportMessage('Bantuan AI saat ini khusus laporan mingguan dan matriks.');
      return;
    }

    const firstEmptyIndex = editing.entries.findIndex((entry) => !hasAiProtectedContent(entry));
    const fallbackRowIndex = firstEmptyIndex === -1 ? Math.max(editing.entries.length - 1, 0) : firstEmptyIndex;

    const rowNumberText =
      typeof targetIndex === 'number'
        ? String(targetIndex + 1)
        : window.prompt(
            `AI mau bantu isi/edit baris nomor berapa? (1-${editing.entries.length})`,
            String(fallbackRowIndex + 1)
          );
    if (rowNumberText === null) return;

    const rowIndex = Number(rowNumberText) - 1;
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= editing.entries.length) {
      setAiReportMessage(`Nomor baris tidak valid. Pilih angka 1 sampai ${editing.entries.length}.`);
      return;
    }

    const targetHasContent = rowIndex < editing.entries.length && hasAiProtectedContent(editing.entries[rowIndex]);
    if (targetHasContent && !window.confirm(`Baris nomor ${rowIndex + 1} sudah ada isi. AI akan memperbarui isi baris ini saja. Lanjutkan?`)) {
      setAiReportMessage('Dibatalkan. Isi lama tetap aman.');
      return;
    }
    const targetRowIndex = rowIndex;
    const aiFocusDescription = editingIsMatrix
      ? 'Nama Kegiatan dan Sasaran Kegiatan'
      : 'Nama Kegiatan';

    const instruction = window.prompt(
      targetHasContent
        ? `Tulis prompt/arahan untuk AI memperbaiki ${aiFocusDescription} pada baris ini. Contoh: rapikan jadi kegiatan komunikasi desa yang lebih formal.`
        : `Tulis prompt/arahan untuk AI mengisi ${aiFocusDescription} pada baris ini. Contoh: kegiatan sosialisasi kesehatan di posko, sasaran ibu-ibu PKK.`,
      ''
    );
    if (instruction === null) return;

    setAiReportGenerating(true);
    setAiReportMessage(
      targetHasContent
        ? `AI sedang memperbarui baris nomor ${targetRowIndex + 1}...`
        : `AI sedang membantu isi baris nomor ${targetRowIndex + 1}...`
    );

    const selectedEntry = editing.entries[targetRowIndex];
    const reportKind = editingIsGroupMatrix
      ? 'matriks program kerja kelompok'
      : editingIsIndividualMatrix
        ? 'matriks program kerja individu'
        : 'laporan mingguan/logbook KKN';
    const selectedDateText =
      editing.reportType === 'weekly' && !parseIndonesianDateToIso(selectedEntry.dateText)
        ? ''
        : selectedEntry.dateText;

    const prompt = `
Kamu membantu mahasiswa KKN menyusun ${reportKind} dalam bahasa Indonesia yang formal, singkat, dan realistis.
Konteks:
- Nama: ${editing.name || profile.name}
- Divisi: ${getDivisionLabel(profile.division)}
- Desa/Kelurahan: ${editing.desa || 'Tanjung Gelam'}
- Kecamatan: ${editing.kecamatan || '-'}
- Minggu ke: ${editing.week || '1'}
- Baris yang diisi: nomor ${targetRowIndex + 1}${targetHasContent ? ' (edit baris ini setelah konfirmasi pengguna)' : ''}
- Fokus AI: ${aiFocusDescription}
- Arahan pengguna: ${instruction.trim() || 'Lengkapi baris ini secara realistis berdasarkan konteks KKN.'}

Data baris target saat ini:
${JSON.stringify({
  no: editingIsMatrix || editing.reportType === 'weekly' ? String(targetRowIndex + 1) : selectedEntry.dayNumber,
  tanggalAtauTujuan: selectedDateText,
  namaKegiatan: selectedEntry.activityName,
  waktuAtauSasaran: selectedEntry.activityTime,
  buktiAtauJadwal: selectedEntry.evidenceUrl && selectedEntry.evidenceUrl.startsWith('data:image/') ? '[gambar sudah diupload]' : selectedEntry.evidenceUrl,
  penanggungJawab: selectedEntry.responsibleName || '',
}, null, 2)}

Data baris lain sebagai konteks saja, jangan diubah:
${JSON.stringify(editing.entries.map((entry, index) => ({
  no: entry.dayNumber,
  posisiBaris: index + 1,
  tanggalAtauTujuan: editing.reportType === 'weekly' && !parseIndonesianDateToIso(entry.dateText) ? '' : entry.dateText,
  namaKegiatan: entry.activityName,
  waktuAtauSasaran: entry.activityTime,
  buktiAtauJadwal: entry.evidenceUrl && entry.evidenceUrl.startsWith('data:image/') ? '[gambar sudah diupload]' : entry.evidenceUrl,
  penanggungJawab: entry.responsibleName || '',
})), null, 2)}

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Isi hanya satu baris target nomor ${targetRowIndex + 1}; jangan membuat 4 baris atau semua tabel.
- Jangan mengubah baris lain. Jika baris target sudah ada isi, rapikan/perbaiki hanya baris target sesuai arahan pengguna.
- Untuk laporan mingguan, AI hanya boleh memperbaiki/mengisi field activityName sebagai Nama Kegiatan. Field dateText, activityTime, evidenceUrl, dan responsibleName harus dikembalikan sama seperti data target.
- Untuk matriks, AI hanya boleh memperbaiki/mengisi field activityName sebagai Nama Kegiatan dan activityTime sebagai Sasaran Kegiatan. Field dateText sebagai Tujuan Kegiatan, evidenceUrl sebagai Jadwal Kegiatan, dan responsibleName harus dikembalikan sama seperti data target.
- Buat respons lebih jelas dan cukup panjang: laporan mingguan activityName berisi 2-3 kalimat ringkas tentang kegiatan, proses, dan hasil awal.
- Untuk matriks, activityName berisi nama kegiatan yang spesifik dan jelas; activityTime berisi sasaran kegiatan 2-3 kalimat yang menjelaskan siapa sasaran, kebutuhan, dan dampak yang diharapkan.
- Jangan isi atau ubah field bukti foto/gambar/data:image.
- Untuk laporan mingguan, entry berisi: dayNumber, dateText, activityName, activityTime.
- Untuk matriks, entry berisi: dayNumber, activityName, dateText sebagai tujuan kegiatan, activityTime sebagai sasaran kegiatan, evidenceUrl sebagai jadwal kegiatan${editingIsGroupMatrix ? ', responsibleName sebagai penanggung jawab' : ''}.
- Untuk laporan mingguan dan matriks, dayNumber wajib "${targetRowIndex + 1}".
- Buat kalimat kegiatan spesifik untuk KKN, bukan terlalu umum.
- Jika ada isi lama di baris target, boleh rapikan dan lengkapi.

Format JSON wajib:
${editingIsMatrix ? `{
  "entry": {
    "activityName": "nama kegiatan yang spesifik dan jelas berdasarkan prompt",
    "activityTime": "sasaran kegiatan 2-3 kalimat yang menjelaskan siapa sasaran, kebutuhan, dan dampak yang diharapkan"
  }
}` : `{
  "entry": {
    "activityName": "2-3 kalimat ringkas tentang kegiatan, proses, dan hasil awal berdasarkan prompt"
  }
}`}

Jangan gunakan nama field selain activityName${editingIsMatrix ? ' dan activityTime' : ''}.
Jika perlu, activityName juga berarti Nama Kegiatan${editingIsMatrix ? ' dan activityTime berarti Sasaran Kegiatan' : ''}.
Format lengkap yang juga diterima:
{
  "entry": {
    "dayNumber": "${targetRowIndex + 1}",
    "dateText": "...",
    "activityName": "...",
    "activityTime": "...",
    "evidenceUrl": "...",
    "responsibleName": "..."
  }
}
`;

    try {
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_REPORT_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.35,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama memberi status ${response.status}.`);
      }

      const payload = await response.json();
      const aiText = String(payload?.response || '').trim();
      const parsed = extractJsonObject(aiText);
      const generatedEntry = parsed?.entry || (Array.isArray(parsed?.entries) ? parsed.entries[0] : null);

      if (!generatedEntry) {
        throw new Error('AI belum menghasilkan baris laporan target.');
      }

      const generatedActivityName = readAiStringField(generatedEntry, [
        'activityName',
        'namaKegiatan',
        'nama_kegiatan',
        'kegiatan',
        'judulKegiatan',
        'judul_kegiatan',
        'name',
      ]);
      const generatedActivityTime = readAiStringField(generatedEntry, [
        'activityTime',
        'sasaranKegiatan',
        'sasaran_kegiatan',
        'sasaran',
        'targetKegiatan',
        'target_kegiatan',
        'target',
      ]);

      if (!generatedActivityName) {
        throw new Error('AI belum mengirim Nama Kegiatan. Coba ulangi dengan prompt yang lebih spesifik.');
      }
      if (editingIsMatrix && !generatedActivityTime) {
        throw new Error('AI belum mengirim Sasaran Kegiatan. Coba ulangi dengan prompt yang menyebut sasaran kegiatan.');
      }

      setEditing((current) => {
        const nextEntries = current.entries.map((entry, index) => {
          if (index !== targetRowIndex) {
            return editingIsMatrix || current.reportType === 'weekly' ? { ...entry, dayNumber: String(index + 1) } : entry;
          }

          const nextEvidenceUrl =
            entry.evidenceUrl && entry.evidenceUrl.startsWith('data:image/')
              ? entry.evidenceUrl
              : editingIsMatrix
                ? entry.evidenceUrl
                : entry.evidenceUrl;

          return {
            ...entry,
            dayNumber: editingIsMatrix || current.reportType === 'weekly' ? String(index + 1) : String(generatedEntry.dayNumber || entry.dayNumber || index + 1),
            dateText: current.reportType === 'weekly' && !parseIndonesianDateToIso(entry.dateText) ? '' : entry.dateText,
            activityName: generatedActivityName,
            activityTime: editingIsMatrix ? generatedActivityTime : entry.activityTime,
            evidenceUrl: nextEvidenceUrl,
            responsibleName: entry.responsibleName,
          };
        });

        return {
          ...current,
          entries: nextEntries,
          reportType: editingIsGroupMatrix ? 'matrix' : editingIsIndividualMatrix ? 'individualMatrix' : 'weekly',
        };
      });

      setAiReportMessage(`AI berhasil ${targetHasContent ? 'memperbarui' : 'mengisi'} baris nomor ${targetRowIndex + 1}. Cek lagi sebelum disimpan.`);
    } catch (error: any) {
      setAiReportMessage(error?.message || 'AI belum berhasil mengisi laporan. Pastikan Ollama aktif di http://localhost:11434 dan model llama3.2:3b sudah tersedia.');
    } finally {
      setAiReportGenerating(false);
    }
  };

  const createNewReport = (reportType: WeeklyReport['reportType'] = 'weekly') => {
    const label =
      reportType === 'matrix'
        ? 'matriks kelompok baru'
        : reportType === 'individualMatrix'
          ? 'matriks individu baru'
          : reportType === 'treasurerOutput'
            ? 'laporan pengeluaran baru'
            : reportType === 'treasurerIncome'
              ? 'laporan pemasukan baru'
              : 'laporan mingguan baru';
    if (window.confirm(`Buat ${label}? Laporan saat ini tidak akan hilang.`)) {
      setEditing(createEmptyReport(profile, getNextReportWeek([...reports, editing]), reportType));
      setAutoSaveStatus('idle');
    }
  };

  const resetNoteForm = () => {
    setEditingNote({
      id: `note_${Date.now()}`,
      userId: profile.uid,
      division: profile.division,
      title: '',
      content: '',
      date: new Date().toLocaleString('id-ID'),
    });
  };

  const saveNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingNote.title.trim() && !editingNote.content.trim()) return;

    setNoteSaving(true);
    await storage.saveDivisionNote({
      ...editingNote,
      userId: profile.uid,
      division: profile.division,
      title: editingNote.title.trim() || 'Catatan tanpa judul',
      content: editingNote.content.trim(),
      date: editingNote.date || new Date().toLocaleString('id-ID'),
    });
    resetNoteForm();
    setNoteSaving(false);
  };

  const editNote = (note: DivisionNote) => {
    setEditingNote(note);
    openDashboardView('notes');
  };

  const deleteNote = async (note: DivisionNote) => {
    if (!window.confirm(`Hapus catatan "${note.title}"?`)) return;
    await storage.deleteDivisionNote(profile.uid, note.id);
    if (editingNote.id === note.id) resetNoteForm();
  };

  const saveReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await storage.saveWeeklyReport({
      ...editing,
      entries: shouldNormalizeReportEntries(editing) ? normalizeNumberedEntries(editing.entries) : editing.entries,
      reportType: editingIsGroupMatrix ? 'matrix' : editingIsIndividualMatrix ? 'individualMatrix' : editingIsTreasurerOutput ? 'treasurerOutput' : editingIsTreasurerIncome ? 'treasurerIncome' : 'weekly',
    });
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
      setEditing(createEmptyReport(profile, getNextReportWeek(reports.filter((item) => item.id !== report.id)), reportPageType));
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

  const requestLocationWakeLock = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    try {
      locationWakeLock.current = await (navigator as any).wakeLock.request('screen');
    } catch {
      locationWakeLock.current = null;
    }
  };

  const releaseLocationWakeLock = async () => {
    await locationWakeLock.current?.release?.().catch?.(() => undefined);
    locationWakeLock.current = null;
  };

  const getLocationPermissionState = async () => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return '';

    try {
      const status = await (navigator as any).permissions.query({ name: 'geolocation' });
      return String(status?.state || '');
    } catch {
      return '';
    }
  };

  const startLocationTracking = async (allowPermissionPrompt = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Browser ini belum mendukung GPS/geolocation.');
      return;
    }

    const permissionState = await getLocationPermissionState();
    if (!allowPermissionPrompt && permissionState !== 'granted') {
      setIsLocationTracking(false);
      setLocationStatus('Tekan Aktifkan Live Maps untuk memberi izin lokasi.');
      return;
    }

    setLocationError('');
    setLocationStatus('Meminta izin lokasi...');
    setIsLocationTracking(true);
    localStorage.setItem(liveTrackingPreferenceKey, '1');
    closeNav();
    setIsAiChatOpen(false);
    setIsLocationPermissionRequesting(permissionState !== 'granted');
    requestLocationWakeLock();

    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const nextLocation: LiveLocation = {
          uid: profile.uid,
          name: profile.name,
          email: profile.email,
          division: profile.division,
          lat: latitude,
          lng: longitude,
          accuracy,
          heading,
          speed,
          updatedAt: Date.now(),
        };

        try {
          await storage.saveLiveLocation(nextLocation);
          setIsLocationPermissionRequesting(false);
          setLocationStatus(`Lokasi diperbarui ${formatLiveLocationTime(nextLocation.updatedAt)}`);
          setLocationError('');
        } catch (error: any) {
          setIsLocationPermissionRequesting(false);
          setLocationError(error?.message || 'Lokasi belum berhasil disimpan.');
        }
      },
      (error) => {
        setIsLocationPermissionRequesting(false);
        setIsLocationTracking(false);
        localStorage.removeItem(liveTrackingPreferenceKey);
        locationWatchId.current = null;
        releaseLocationWakeLock();
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Izin lokasi belum berhasil. Jika muncul pesan overlay Android, tutup tombol melayang/aplikasi overlay lalu tekan Aktifkan Live Maps lagi.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Lokasi belum tersedia. Pastikan GPS/perangkat lokasi aktif.');
        } else {
          setLocationError('Waktu pencarian lokasi habis. Coba aktifkan lagi.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );
  };

  const stopLocationTracking = async () => {
    if (locationWatchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }

    setIsLocationTracking(false);
    setIsLocationPermissionRequesting(false);
    localStorage.removeItem(liveTrackingPreferenceKey);
    await releaseLocationWakeLock();
    setLocationStatus('Live Maps dimatikan.');
    await storage.deleteLiveLocation(profile.uid).catch(() => undefined);
  };

  useEffect(() => {
    if (localStorage.getItem(liveTrackingPreferenceKey) === '1') {
      startLocationTracking(false);
    }
  }, [liveTrackingPreferenceKey]);

  useEffect(() => {
    const keepTrackingAlive = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem(liveTrackingPreferenceKey) === '1') {
        requestLocationWakeLock();
        if (locationWatchId.current === null) {
          startLocationTracking(false);
        }
      }
    };

    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (localStorage.getItem(liveTrackingPreferenceKey) !== '1') return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', keepTrackingAlive);
    window.addEventListener('focus', keepTrackingAlive);
    window.addEventListener('beforeunload', warnBeforeClose);

    return () => {
      document.removeEventListener('visibilitychange', keepTrackingAlive);
      window.removeEventListener('focus', keepTrackingAlive);
      window.removeEventListener('beforeunload', warnBeforeClose);
    };
  }, [liveTrackingPreferenceKey]);

  const submitAiChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = aiChatInput.trim();
    if (!question || aiChatSending) return;

    const nextMessages = [...aiChatMessages, { role: 'user' as const, text: question }];
    setAiChatMessages(nextMessages);
    setAiChatInput('');
    setAiChatSending(true);

    try {
      const token = await auth.currentUser?.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        model: 'PutraAi-V1',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(getPutraAiProxyUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'PutraAi-V1',
          message: question,
          prompt: question,
          history: aiChatMessages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            text: message.text,
          })),
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
          context: {
            app: 'Dashboard KKN',
            assistant: 'PUTRA AI STUDIO',
            division: getDivisionLabel(profile.division),
            userName: profile.name,
            currentReportType: editing.reportType || 'weekly',
            currentWeek: editing.week,
          },
        }),
      });

      const rawText = await response.text();
      let payload: unknown = rawText;
      try {
        payload = rawText ? JSON.parse(rawText) : {};
      } catch {
        payload = rawText;
      }

      const answer = extractPutraAiText(payload).trim();
      if (!response.ok || !answer) {
        throw new Error(`PUTRA AI proxy failed with status ${response.status}`);
      }

      setAiChatMessages((current) => [...current, { role: 'assistant', text: answer }]);
    } catch (err) {
      console.error('PUTRA AI STUDIO proxy error:', err);
      setAiChatMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: 'Koneksi ke PUTRA AI STUDIO belum berhasil. Pastikan proxy PUTRA_AI_V1_API_URL aktif, lalu coba kirim pertanyaan lagi.',
        },
      ]);
    } finally {
      setAiChatSending(false);
    }
  };

  const sendDivisionChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatSending) return;
    if (chatMode === 'private' && !selectedPrivateProfile) {
      setChatError('Pilih divisi tujuan terlebih dahulu.');
      return;
    }

    setChatSending(true);
    setChatError('');
    try {
      await storage.sendDivisionChatMessage({
        sender: profile,
        text,
        recipient: chatMode === 'private' ? selectedPrivateProfile : null,
      });
      setChatInput('');
      const now = Date.now();
      localStorage.setItem(chatLastSeenKey, String(now));
      setChatLastSeenAt(now);
    } catch (error: any) {
      setChatError(error?.message || 'Pesan belum berhasil dikirim.');
    } finally {
      setChatSending(false);
    }
  };

  const currentLiveLocation = liveLocations.find((location) => location.uid === profile.uid);
  const sortedLiveLocations = [...liveLocations].sort((a, b) => {
    if (a.uid === profile.uid) return -1;
    if (b.uid === profile.uid) return 1;
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  });
  const activeSelectedLocationUid =
    selectedLocationUid && sortedLiveLocations.some((location) => location.uid === selectedLocationUid)
      ? selectedLocationUid
      : currentLiveLocation?.uid || sortedLiveLocations[0]?.uid || '';
  const isFinancialReportPage = reportPageType === 'treasurerOutput' || reportPageType === 'treasurerIncome';
  const isFinancialReadOnly = isFinancialReportPage && !isTreasurer;
  const pageReports = (isFinancialReadOnly ? financialReports : reports)
    .filter((report) => getNormalizedReportType(report) === reportPageType)
    .sort((a, b) => getReportSortValue(b) - getReportSortValue(a));
  const previewReport = isFinancialReadOnly
    ? pageReports.find((report) => report.id === selectedFinancialReportId) || pageReports[0] || null
    : editing;
  const reportPageTitle =
    reportPageType === 'matrix'
      ? 'Matriks Program Kerja Kelompok'
      : reportPageType === 'individualMatrix'
        ? 'Matriks Program Kerja Individu'
        : reportPageType === 'treasurerOutput'
          ? 'Laporan Pengeluaran Bendahara'
          : reportPageType === 'treasurerIncome'
            ? 'Laporan Pemasukan Bendahara'
          : 'Laporan Mingguan';
  const divisionNavItems = [
    { label: 'Home', icon: Home, active: dashboardView === 'home', action: () => openDashboardView('home') },
    { label: 'Live Maps', icon: MapPinned, active: dashboardView === 'maps', action: () => openDashboardView('maps') },
    { label: 'Catatan', icon: StickyNote, active: dashboardView === 'notes', action: () => openDashboardView('notes') },
    { label: unreadChatCount ? `Chat Divisi (${unreadChatCount})` : 'Chat Divisi', icon: MessageSquare, active: dashboardView === 'chat', action: () => openDashboardView('chat') },
    { label: 'Laporan Mingguan', icon: FileText, active: dashboardView === 'weekly', action: () => openReportPage('weekly') },
    { label: 'Matriks Individu', icon: ClipboardCheck, active: dashboardView === 'individualMatrix', action: () => openReportPage('individualMatrix') },
    ...(isSecretary ? [{ label: 'Matriks Kelompok', icon: ClipboardList, active: dashboardView === 'groupMatrix', action: () => openReportPage('groupMatrix') }] : []),
    { label: isTreasurer ? 'Laporan Pengeluaran' : 'Riwayat Pengeluaran', icon: Briefcase, active: dashboardView === 'treasurerOutput', action: () => openReportPage('treasurerOutput') },
    { label: isTreasurer ? 'Laporan Pemasukan' : 'Riwayat Pemasukan', icon: Download, active: dashboardView === 'treasurerIncome', action: () => openReportPage('treasurerIncome') },
    ...adminNavItems.map((item) => ({ ...item, active: false })),
    ...(!isUnifiedOperatorPanel && onAdminPanel ? [{ label: 'Panel Tugas', icon: LayoutDashboard, active: false, action: () => { closeNav(); onAdminPanel(); } }] : []),
    ...(onClose ? [{ label: 'Lihat Website', icon: Globe, active: false, action: () => { closeNav(); onClose(); } }] : []),
  ];

  const mobileNavDrawer = typeof document !== 'undefined' && isNavOpen
    ? createPortal(
      <>
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[85] lg:hidden transition-opacity duration-300 animate-fadeIn cursor-pointer"
          onClick={closeNav}
        />

        <aside className="fixed inset-y-0 left-0 z-[90] flex w-72 translate-x-0 flex-col justify-between overflow-hidden border-r border-slate-200 bg-white p-5 transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-[#111827] lg:hidden">
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <span className="bg-[#e8f0fe] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff]">
                  Divisi {getDivisionLabel(profile.division)}
                </span>
                <h2 className="font-bold text-lg text-slate-800 dark:text-white mt-1">Dashboard Divisi</h2>
              </div>
              <button
                type="button"
                onClick={closeNav}
                className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center border border-transparent p-2.5 text-slate-500 transition-all duration-200 hover:border-slate-200 hover:bg-[#f8fafd] dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800"
                aria-label="Tutup navigasi"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-1">
              {divisionNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors ${
                      item.active
                        ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]'
                        : 'text-slate-600 hover:bg-[#f1f3f4] hover:text-[#1a73e8] dark:text-slate-300 dark:hover:bg-[#151c30] dark:hover:text-[#8ab4f8]'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-6">
            <div className="flex items-center gap-3 border border-slate-200 bg-[#f8fafd] py-1.5 pl-2 pr-3 shadow-sm dark:border-slate-800 dark:bg-[#151c30]">
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
              className="mt-3 flex w-full items-center justify-center gap-2 border border-red-200 bg-[#fce8e6] py-2.5 text-sm font-bold text-[#c5221f] transition-all duration-200 hover:bg-[#f9d2ce] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/60"
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

  const aiChatWidget = aiChatHost && !isLocationPermissionRequesting
    ? createPortal(
      <>
        <style>{`
          #putra-ai-chat-root {
            position: fixed !important;
            right: 24px !important;
            bottom: 72px !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            visibility: visible !important;
            opacity: 1 !important;
            transform: none !important;
            pointer-events: auto !important;
          }
        `}</style>
        <div
          id="putra-ai-chat-widget"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          {isAiChatOpen && (
            <div className="mb-4 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#0f1322] shadow-2xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-m-blue to-emerald-400 text-white flex items-center justify-center shadow-sm">
                    <MessageSquare size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">PUTRA AI STUDIO</h3>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">Tanyakan ke AI</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiChatOpen(false)}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Tutup chat PUTRA AI STUDIO"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4 bg-slate-50/80 dark:bg-slate-950/30">
                {aiChatMessages.map((message, index) => (
                  <div key={`${message.role}_${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user'
                          ? 'bg-m-blue text-white'
                          : 'bg-white dark:bg-[#151a2d] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800'
                        }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={submitAiChat} className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f1322] p-3">
                <input
                  value={aiChatInput}
                  onChange={(event) => setAiChatInput(event.target.value)}
                  placeholder={aiChatSending ? 'PUTRA AI sedang menjawab...' : 'Tulis pertanyaan...'}
                  disabled={aiChatSending}
                  className="min-w-0 flex-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={aiChatSending || !aiChatInput.trim()}
                  className="h-10 w-10 rounded-full bg-m-blue text-white flex items-center justify-center hover:bg-m-blue-dark transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Kirim pertanyaan"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAiChatOpen((current) => !current)}
            className="ml-auto h-14 w-14 rounded-full bg-gradient-to-tr from-m-blue to-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-m-blue/40 ring-4 ring-white/80 dark:ring-slate-950/80 hover:scale-105 active:scale-95 transition-transform"
            aria-label="Buka chat PUTRA AI STUDIO"
            title="PUTRA AI STUDIO"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      </>,
      aiChatHost
    )
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-900 dark:bg-[#0b0f19] dark:text-white lg:flex lg:h-dvh lg:overflow-hidden">
      {mobileNavDrawer}
      {chatToast && (
        <button
          type="button"
          onClick={() => {
            setChatMode(chatToast.chatType);
            if (chatToast.chatType === 'private') {
              setSelectedPrivateUid(chatToast.senderUid === profile.uid ? chatToast.recipientUid || '' : chatToast.senderUid);
            }
            setChatToast(null);
            openDashboardView('chat');
          }}
          className="no-print fixed right-4 top-24 z-[95] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#1a73e8]/20 bg-white p-4 text-left shadow-2xl shadow-slate-950/20 transition-transform hover:-translate-y-0.5 dark:border-[#8ab4f8]/20 dark:bg-[#111827]"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-m-blue text-white">
              <MessageSquare size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black uppercase tracking-wider text-[#1a73e8] dark:text-[#8ab4f8]">
                Pesan Baru
              </span>
              <span className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">
                {getChatSenderLabel(chatToast.senderName, chatToast.senderDivision)}
              </span>
              <span className="mt-1 block line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                {chatToast.text}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setChatToast(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  setChatToast(null);
                }
              }}
              className="-mr-1 -mt-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={16} />
            </span>
          </div>
        </button>
      )}
      <aside className="no-print hidden h-dvh w-72 shrink-0 flex-col justify-between overflow-y-auto overscroll-contain border-r border-slate-200/80 bg-white p-5 dark:border-slate-800/80 dark:bg-[#111827] lg:flex">
        <div>
          <div className="mb-6 px-1">
            <span className="inline-flex bg-[#e8f0fe] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff]">
              Divisi {getDivisionLabel(profile.division)}
            </span>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white">Dashboard Divisi</h2>
          </div>

          <nav className="space-y-1">
            {divisionNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors ${
                    item.active
                      ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]'
                      : 'text-slate-600 hover:bg-[#f1f3f4] hover:text-[#1a73e8] dark:text-slate-300 dark:hover:bg-[#151c30] dark:hover:text-[#8ab4f8]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800/80">
          <div className="flex items-center gap-3 border border-slate-200 bg-[#f8fafd] py-2 pl-2 pr-3 shadow-sm dark:border-slate-800 dark:bg-[#151c30]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-sm font-black text-white shadow-sm">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-black leading-tight text-slate-900 dark:text-white">{profile.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">{profile.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-red-200 bg-[#fce8e6] py-2.5 text-sm font-bold text-[#c5221f] transition-all duration-200 hover:bg-[#f9d2ce] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/60"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      <header className="no-print fixed left-0 right-0 top-0 z-[80] flex flex-row items-center justify-between gap-3 border-b border-slate-200/80 bg-white/92 px-4 py-3.5 shadow-[0_10px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#111827]/95 dark:shadow-[0_10px_34px_rgba(0,0,0,0.36)] md:sticky md:left-auto md:right-auto md:z-30 md:px-8 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsNavOpen(true);
            }}
            className="-ml-2 flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center border border-transparent p-2.5 text-slate-600 transition-all duration-200 hover:border-slate-200 hover:bg-[#f8fafd] dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-800 lg:hidden"
            title="Buka Navigasi"
          >
            <Menu size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#e8f0fe] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-m-blue dark:bg-m-blue/20 dark:text-[#7fcfff] md:text-[10px]">
                Divisi {getDivisionLabel(profile.division)}
              </span>
            </div>
            <h1 className="text-base sm:text-2xl font-black mt-0.5 tracking-tight leading-tight">
              <span className="inline sm:hidden">Dashboard Divisi</span>
              <span className="hidden sm:inline">Dashboard Divisi KKN</span>
            </h1>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={() => openDashboardView('home')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'home' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => openDashboardView('maps')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'maps' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Live Maps
          </button>
          <button
            type="button"
            onClick={() => openReportPage('weekly')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'weekly' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Mingguan
          </button>
          <button
            type="button"
            onClick={() => openReportPage('individualMatrix')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'individualMatrix' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Matriks Individu
          </button>
          {isSecretary && (
            <button
              type="button"
              onClick={() => openReportPage('groupMatrix')}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'groupMatrix' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Matriks Kelompok
            </button>
          )}
          <button
            type="button"
            onClick={() => openReportPage('treasurerOutput')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'treasurerOutput' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {isTreasurer ? 'Pengeluaran' : 'Riwayat Pengeluaran'}
          </button>
          <button
            type="button"
            onClick={() => openReportPage('treasurerIncome')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${dashboardView === 'treasurerIncome' ? 'bg-m-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {isTreasurer ? 'Pemasukan' : 'Riwayat Pemasukan'}
          </button>
          {onAdminPanel && (
            <button
              type="button"
              onClick={onAdminPanel}
              className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Panel Tugas
            </button>
          )}
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

        <div className="flex items-center gap-2.5 shrink-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex items-center gap-1.5 text-xs font-bold bg-[#f8fafd] dark:bg-[#0d1320] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-full shadow-sm hover:bg-white dark:hover:bg-[#111827] transition-all cursor-pointer"
              title="Kembali ke Web"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
          )}

          <div className="flex shrink-0 items-center gap-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none shrink-0">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left max-w-[150px] md:max-w-[200px] overflow-hidden">
              <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200 truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">{profile.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="h-[89px] shrink-0 md:hidden" />

      <main className="no-print flex min-w-0 flex-1 flex-col gap-3 p-0 lg:h-dvh lg:overflow-y-auto lg:overscroll-contain lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px]">
        {dashboardView === 'home' && (
          <section className="order-1 overflow-hidden border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-[#0d1320] lg:col-span-2">
            <div className="border-b border-slate-200 bg-[#f8fafd] px-4 py-5 dark:border-slate-800 dark:bg-[#111827] md:px-6">
              <p className="text-xs font-black uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Home Divisi</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight text-slate-950 dark:text-white md:text-3xl">
                Selamat datang, {profile.name || getDivisionLabel(profile.division)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 md:text-base">
                Kelola laporan, pantau lokasi divisi secara realtime, dan akses dokumen tersimpan dari satu tempat.
              </p>
            </div>
            <div className="grid gap-3 p-4 md:p-5 lg:grid-cols-4">
              {[
                { title: 'Live Maps', desc: `${liveLocations.length} divisi sedang berbagi lokasi`, action: () => openDashboardView('maps', 'live-maps'), tone: 'emerald' },
                { title: 'Catatan Divisi', desc: `${notes.length} catatan tersimpan untuk divisi kamu`, action: () => openDashboardView('notes'), tone: 'amber' },
                { title: 'Chat Divisi', desc: unreadChatCount ? `${unreadChatCount} pesan baru dari divisi` : 'Chat publik dan pribadi semua divisi', action: () => openDashboardView('chat'), tone: 'blue' },
                { title: 'Laporan Mingguan', desc: 'Isi kegiatan mingguan dan bukti foto', action: () => openReportPage('weekly'), tone: 'blue' },
                { title: 'Matriks Individu', desc: 'Program kerja individu semua divisi', action: () => openReportPage('individualMatrix'), tone: 'slate' },
                ...(isSecretary ? [{ title: 'Matriks Kelompok', desc: 'Khusus sekretaris untuk program kerja kelompok', action: () => openReportPage('groupMatrix'), tone: 'emerald' }] : []),
                {
                  title: isTreasurer ? 'Pengeluaran Bendahara' : 'Riwayat Pengeluaran',
                  desc: isTreasurer ? 'Khusus bendahara untuk laporan pengeluaran' : 'Baca laporan pengeluaran dari bendahara',
                  action: () => openReportPage('treasurerOutput'),
                  tone: 'amber',
                },
                {
                  title: isTreasurer ? 'Pemasukan Bendahara' : 'Riwayat Pemasukan',
                  desc: isTreasurer ? 'Khusus bendahara untuk laporan dana masuk' : 'Baca laporan pemasukan dari bendahara',
                  action: () => openReportPage('treasurerIncome'),
                  tone: 'emerald',
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group border border-slate-200 bg-white p-4 text-left transition-colors hover:border-m-blue/40 hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#0d1320] dark:hover:bg-[#111827]"
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white font-black ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'blue' ? 'bg-m-blue' : 'bg-slate-700'}`}>
                    {item.title[0]}
                  </span>
                  <h3 className="mt-4 font-black text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
                  <span className="mt-4 inline-flex text-xs font-black text-m-blue group-hover:translate-x-1 transition-transform">
                    Buka menu
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {dashboardView === 'maps' && (
        <section id="live-maps" className="order-1 space-y-4 border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] md:p-5 lg:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Live Maps Divisi</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Lokasi Realtime Semua Divisi</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Aktifkan Live Maps agar posisi divisi kamu tersambung ke Firebase dan bisa dilihat oleh divisi lain secara realtime.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startLocationTracking()}
                disabled={isLocationTracking}
                className="rounded-full bg-m-blue px-5 py-2.5 text-sm font-black text-white shadow-sm shadow-m-blue/20 hover:bg-m-blue-dark disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {isLocationTracking ? 'Live Aktif' : 'Aktifkan Live Maps'}
              </button>
              <button
                type="button"
                onClick={stopLocationTracking}
                disabled={!isLocationTracking && !currentLiveLocation}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-5 py-2.5 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Matikan
              </button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <LiveLocationsMap
              locations={sortedLiveLocations}
              currentUid={profile.uid}
              selectedUid={selectedLocationUid}
              onSelectLocation={setSelectedLocationUid}
            />

            <div className="border border-slate-200 bg-[#f8fafd] p-4 dark:border-slate-800 dark:bg-[#111827]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">Status Lokasi</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{locationStatus}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isLocationTracking ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {isLocationTracking ? 'Online' : 'Offline'}
                </span>
              </div>

              {locationError && (
                <p className="mt-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">
                  {locationError}
                </p>
              )}

              <div className="mt-4 max-h-[285px] space-y-2 overflow-y-auto pr-1">
                {sortedLiveLocations.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                    Belum ada divisi yang membagikan lokasi.
                  </p>
                )}
                {sortedLiveLocations.map((location) => {
                  const fresh = isLiveLocationFresh(location);
                  const isCurrentUser = location.uid === profile.uid;
                  return (
                    <button
                      key={location.uid}
                      type="button"
                      onClick={() => setSelectedLocationUid(location.uid)}
                      className={`w-full border bg-white px-3 py-3 text-left transition-colors hover:border-m-blue hover:bg-[#f8fafd] dark:bg-[#0d1320] dark:hover:bg-[#111827] ${selectedLocationUid === location.uid ? 'border-m-blue ring-4 ring-m-blue/10' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 dark:text-white truncate">
                            {getDivisionLabel(location.division)} {isCurrentUser ? '(Saya)' : ''}
                          </p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{location.name}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${fresh ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                          {fresh ? 'Realtime' : 'Lama'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>Update: {formatLiveLocationTime(location.updatedAt)}</span>
                        <span>Akurasi: {location.accuracy ? `${Math.round(location.accuracy)} m` : '-'}</span>
                      </div>
                      <a
                        href={
                          currentLiveLocation
                            ? `https://www.google.com/maps/dir/?api=1&origin=${currentLiveLocation.lat},${currentLiveLocation.lng}&destination=${location.lat},${location.lng}`
                            : `https://www.google.com/maps?q=${location.lat},${location.lng}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-m-blue/10 dark:bg-m-blue/20 px-3 py-2 text-xs font-black text-m-blue dark:text-[#7fcfff] hover:bg-m-blue hover:text-white transition-colors"
                      >
                        {isCurrentUser ? 'Buka Lokasi Saya' : 'Lihat Arah ke Divisi Ini'}
                      </a>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {dashboardView === 'chat' && (
          <section className="order-1 flex min-h-[calc(100dvh-89px)] flex-col overflow-hidden border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-[#0d1320] lg:col-span-2 lg:h-dvh lg:min-h-0">
            <div className="shrink-0 flex flex-col gap-4 border-b border-slate-200 bg-[#f8fafd] px-4 py-5 dark:border-slate-800 dark:bg-[#111827] md:flex-row md:items-start md:justify-between md:px-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Chat Divisi</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Obrolan Semua Divisi</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                  Pakai chat publik untuk koordinasi bersama, atau chat pribadi untuk menghubungi divisi tertentu.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={requestChatNotificationPermission}
                  disabled={notificationPermission === 'granted'}
                  className="rounded-full border border-[#1a73e8]/20 bg-white px-4 py-2 text-xs font-black text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700 dark:border-[#8ab4f8]/20 dark:bg-slate-900 dark:text-[#8ab4f8] dark:hover:bg-[#1a73e8]/15 dark:disabled:border-emerald-900/50 dark:disabled:bg-emerald-950/30 dark:disabled:text-emerald-300"
                >
                  {notificationPermission === 'granted'
                    ? 'Notifikasi Aktif'
                    : notificationPermission === 'denied'
                      ? 'Notifikasi Diblokir'
                      : 'Aktifkan Notifikasi'}
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1320] lg:border-b-0 lg:border-r">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChatMode('public')}
                    className={`rounded-full px-4 py-2.5 text-sm font-black transition-colors ${chatMode === 'public' ? 'bg-m-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    Publik
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatMode('private')}
                    className={`rounded-full px-4 py-2.5 text-sm font-black transition-colors ${chatMode === 'private' ? 'bg-m-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    Pribadi
                  </button>
                </div>

                {chatMode === 'public' ? (
                  <div className="mt-4 rounded-2xl border border-[#1a73e8]/15 bg-[#e8f0fe] p-4 text-sm font-semibold leading-relaxed text-[#1a73e8] dark:border-[#8ab4f8]/20 dark:bg-[#1a73e8]/15 dark:text-[#8ab4f8]">
                    Semua divisi bisa membaca dan membalas pesan di ruang publik ini.
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <p className="px-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih Divisi</p>
                    <div className="max-h-[360px] space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100dvh-250px)]">
                      {privateChatPartners.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Belum ada akun divisi lain.
                        </p>
                      )}
                      {privateChatPartners.map((partner) => {
                        const latest = privateChatMessages
                          .filter((message) => message.senderUid === partner.uid || message.recipientUid === partner.uid)
                          .slice(-1)[0];
                        return (
                          <button
                            key={partner.uid}
                            type="button"
                            onClick={() => {
                              setSelectedPrivateUid(partner.uid);
                              setChatMode('private');
                            }}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${activePrivateUid === partner.uid ? 'border-m-blue bg-[#e8f0fe] text-[#1a73e8] dark:border-[#8ab4f8] dark:bg-[#1a73e8]/15 dark:text-[#8ab4f8]' : 'border-slate-200 bg-white text-slate-700 hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800'}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-sm font-black text-white">
                                {partner.name ? partner.name[0].toUpperCase() : 'D'}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black">{partner.name || getDivisionLabel(partner.division)}</span>
                                <span className="block truncate text-xs font-semibold opacity-70">
                                  D. {getDivisionLabel(partner.division)}{latest?.text ? ` · ${latest.text}` : ''}
                                </span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>

              <div className="flex min-h-[520px] min-w-0 flex-col bg-[#f8fafd] dark:bg-[#090d16] lg:min-h-0">
                <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {chatMode === 'public' ? 'Ruang Publik' : 'Chat Pribadi'}
                    </p>
                    <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                      {chatMode === 'public' ? 'Semua Divisi' : selectedPrivateProfile ? getDivisionLabel(selectedPrivateProfile.division) : 'Pilih divisi'}
                    </h3>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 dark:bg-red-950/30 dark:text-red-300">
                      {unreadChatCount} baru
                    </span>
                  )}
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
                  {visibleChatMessages.length === 0 && (
                    <div className="flex h-full min-h-[260px] items-center justify-center">
                      <div className="max-w-sm text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/15 dark:text-[#8ab4f8]">
                          <MessageSquare size={26} />
                        </div>
                        <p className="mt-4 font-black text-slate-900 dark:text-white">Belum ada pesan</p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                          Mulai koordinasi dengan divisi lain dari sini.
                        </p>
                      </div>
                    </div>
                  )}
                  {visibleChatMessages.map((message) => {
                    const mine = message.senderUid === profile.uid;
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-m-blue text-white' : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100'}`}>
                          <p className={`mb-1 text-[11px] font-black uppercase tracking-wider ${mine ? 'text-white/80' : 'text-[#1a73e8] dark:text-[#8ab4f8]'}`}>
                            {getChatSenderLabel(message.senderName, message.senderDivision)}
                          </p>
                          <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">{message.text}</p>
                          <p className={`mt-2 text-[10px] font-bold ${mine ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                            {message.date}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatMessagesEndRef} />
                </div>

                {chatError && (
                  <p className="mx-4 mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">
                    {chatError}
                  </p>
                )}

                <form onSubmit={sendDivisionChat} className="shrink-0 flex items-end gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1320]">
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value.slice(0, 800))}
                    rows={2}
                    placeholder={chatMode === 'public' ? 'Tulis pesan untuk semua divisi...' : selectedPrivateProfile ? `Tulis pesan untuk ${getDivisionLabel(selectedPrivateProfile.division)}...` : 'Pilih divisi tujuan dulu...'}
                    disabled={chatSending || (chatMode === 'private' && !selectedPrivateProfile)}
                    className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-m-blue focus:bg-white focus:ring-4 focus:ring-m-blue/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#111827] dark:text-white dark:focus:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim() || (chatMode === 'private' && !selectedPrivateProfile)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-m-blue text-white shadow-sm shadow-m-blue/20 transition-colors hover:bg-m-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Kirim pesan"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {dashboardView === 'notes' && (
          <section className="order-1 grid gap-3 lg:col-span-2 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] md:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Daftar</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{notes.length} catatan</h3>
                </div>
                <button
                  type="button"
                  onClick={resetNoteForm}
                  className="shrink-0 border border-slate-200 bg-[#f8fafd] px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#151c30]"
                >
                  Baru
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="mt-4 flex min-h-[240px] flex-col items-center justify-center bg-[#f8fafd] px-4 text-center dark:bg-[#111827]">
                  <StickyNote size={30} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">Belum ada catatan</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-500">
                    Catatan yang disimpan akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-slate-100 border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => editNote(note)}
                      className={`group block w-full px-3 py-3 text-left transition-colors hover:bg-[#f8fafd] dark:hover:bg-[#111827] ${
                        editingNote.id === note.id ? 'bg-[#e8f0fe] dark:bg-[#12325f]/45' : 'bg-white dark:bg-[#0d1320]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-black text-slate-950 dark:text-white">{note.title || 'Tanpa judul'}</h4>
                          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{note.date}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNote(note);
                          }}
                          className="shrink-0 px-2 py-1 text-[11px] font-black text-red-500 opacity-70 transition hover:bg-red-50 hover:opacity-100 dark:hover:bg-red-950/30"
                        >
                          Hapus
                        </button>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                        {note.content || 'Tidak ada isi catatan.'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <form onSubmit={saveNote} className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] md:p-5">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Catatan Divisi</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Tulis Catatan</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Simpan pengingat, agenda, ide program, atau poin penting divisi.
                </p>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Judul Catatan</span>
                  <input
                    value={editingNote.title}
                    onChange={(event) => setEditingNote((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Contoh: Agenda koordinasi warga"
                    className={googleInputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Isi Catatan</span>
                  <textarea
                    value={editingNote.content}
                    onChange={(event) => setEditingNote((current) => ({ ...current, content: event.target.value }))}
                    placeholder="Tulis catatan divisi di sini..."
                    rows={15}
                    className={`${googleInputClass} min-h-[420px] resize-y leading-relaxed`}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={noteSaving || (!editingNote.title.trim() && !editingNote.content.trim())}
                  className={`${googlePrimaryButtonClass} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Save size={16} />
                  {noteSaving ? 'Menyimpan...' : editingNote.id.startsWith('note_') && !notes.some((note) => note.id === editingNote.id) ? 'Simpan Catatan' : 'Update Catatan'}
                </button>
                <button
                  type="button"
                  onClick={resetNoteForm}
                  className="inline-flex min-h-[44px] items-center justify-center border border-slate-200 bg-[#f8fafd] px-5 py-2.5 text-sm font-black text-slate-700 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#151c30]"
                >
                  Catatan Baru
                </button>
              </div>
            </form>
          </section>
        )}

        {isReportDashboardView(dashboardView) && (
        <>
        {!isFinancialReadOnly && (
        <form id="form-laporan" onSubmit={saveReport} className="order-2 space-y-5 border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] md:p-5 lg:order-1">
          <div className="grid gap-5 border-b border-slate-100 dark:border-slate-800/60 pb-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-2xl">
                <h2 className="text-2xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
                  Isi {reportPageTitle}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {editingIsTreasurerOutput
                    ? 'Khusus bendahara: data ini masuk ke tabel pengeluaran belanja dan total otomatis dijumlahkan.'
                    : editingIsTreasurerIncome
                      ? 'Khusus bendahara: data ini masuk ke tabel pemasukan dana dan total otomatis dijumlahkan.'
                    : editingIsGroupMatrix
                      ? 'Khusus sekretaris: data ini masuk ke format matrik program kerja kelompok.'
                      : editingIsIndividualMatrix
                        ? 'Data ini masuk ke format matrik program kerja individu sesuai bidang keilmuan.'
                        : 'Data ini akan masuk ke template laporan mingguan PDF A4 secara langsung.'}
                </p>
              </div>
              <div className="flex min-h-[32px] items-start xl:justify-end">
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
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => createNewReport(reportPageType)}
                className="min-h-[44px] rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-5 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-emerald-200/60 dark:border-emerald-800/60"
              >
                <Plus size={16} />
                {reportPageTitle} Baru
              </button>
              {(editing.reportType === 'weekly' || editingIsMatrix) && (
                <button
                  type="button"
                  onClick={() => generateReportWithOllama()}
                  disabled={aiReportGenerating}
                  className="min-h-[44px] rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition-all duration-200 hover:bg-violet-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/50 inline-flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {aiReportGenerating ? 'AI Mengisi...' : 'Bantu Isi AI'}
                </button>
              )}
              <button className="min-h-[44px] rounded-full bg-m-blue hover:bg-m-blue-dark text-white px-6 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-sm shadow-m-blue/15">
                <Save size={18} />
                {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
              </button>
            </div>
            {aiReportMessage && (
              <p className="rounded-xl border border-slate-200 bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200">
                {aiReportMessage}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Minggu Ke" value={editing.week} onChange={(value) => setEditing({ ...editing, week: value })} />
            <Field label="NIM" value={editing.nim} onChange={(value) => setEditing({ ...editing, nim: value })} />
            <Field label="Prodi" value={editing.prodi} onChange={(value) => setEditing({ ...editing, prodi: value })} />
            <Field label="Fakultas" value={editing.faculty} onChange={(value) => setEditing({ ...editing, faculty: value })} />
            <Field label="Desa/Kelurahan" value={editing.desa} onChange={(value) => setEditing({ ...editing, desa: value })} />
            <Field label="Kecamatan" value={editing.kecamatan} onChange={(value) => setEditing({ ...editing, kecamatan: value })} />
            <Field label="Kode DPL" value={editing.kodeDpl} onChange={(value) => setEditing({ ...editing, kodeDpl: value })} />
            {editingIsMatrix && (
              <>
                <Field label={editingIsGroupMatrix ? 'Nama Ketua Kelompok' : 'Nama Mahasiswa'} value={editing.signerName} onChange={(value) => setEditing({ ...editing, signerName: value })} />
                <Field label={editingIsGroupMatrix ? 'NIM Ketua Kelompok' : 'NIM Mahasiswa'} value={editing.signerNim} onChange={(value) => setEditing({ ...editing, signerNim: value })} />
              </>
            )}
            {(editing.reportType === 'weekly' || editingIsMatrix) && (
              <SignaturePad
                value={editing.signatureDataUrl || ''}
                signerName={editing.signerName || editing.name}
                onChange={(value) => setEditing({ ...editing, signatureDataUrl: value })}
              />
            )}
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
                className={`${googleInputClass} dark:[color-scheme:dark]`}
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
              <h3 className="font-bold text-lg tracking-tight">{editingIsTreasurerOutput ? 'Tabel Pengeluaran Bendahara' : editingIsTreasurerIncome ? 'Tabel Pemasukan Bendahara' : editingIsGroupMatrix ? 'Matriks Program Kerja Kelompok' : editingIsIndividualMatrix ? 'Matriks Program Kerja Individu' : 'Kegiatan Mingguan'}</h3>
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
              {editing.entries.map((entry, index) => (
                editingIsTreasurerFinancial ? (
                  <div key={entry.id} className="relative space-y-5 border border-slate-200 bg-[#f8fafd] p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-[#0d1320]">
                    <div className="grid gap-5 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)]">
                      <Field label="No" value={entry.dayNumber} onChange={(value) => updateEntry(entry.id, { dayNumber: value })} />
                      <Field label="Tanggal" value={entry.dateText} onChange={(value) => updateEntry(entry.id, { dateText: value })} />
                      <Field label={editingIsTreasurerIncome ? 'Sumber Pemasukan' : 'Barang Dibeli'} value={entry.activityName} onChange={(value) => updateEntry(entry.id, { activityName: value })} />
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                      <Field label={editingIsTreasurerIncome ? 'Keterangan' : 'Deskripsi'} rows={3} value={entry.activityTime} onChange={(value) => updateEntry(entry.id, { activityTime: value })} />
                      <Field label={editingIsTreasurerIncome ? 'Metode / Status' : 'Perunit'} value={entry.evidenceUrl} onChange={(value) => updateEntry(entry.id, { evidenceUrl: value })} />
                      <Field label={editingIsTreasurerIncome ? 'Jumlah Masuk' : 'Harga'} value={entry.responsibleName || ''} onChange={(value) => updateEntry(entry.id, { responsibleName: value })} />
                    </div>
                  </div>
                ) : editingIsMatrix ? (
                  <div key={entry.id} className="relative space-y-5 border border-slate-200 bg-[#f8fafd] p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-[#0d1320]">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => generateReportWithOllama(index)}
                        disabled={aiReportGenerating}
                        className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
                      >
                        <Sparkles size={13} />
                        {hasAiProtectedContent(entry) ? `AI Edit Baris ${index + 1}` : `AI Isi Baris ${index + 1}`}
                      </button>
                    </div>
                    <div className="grid gap-5 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          No
                        </span>
                        <div className={`${googleInputClass} flex items-center bg-slate-100 font-black text-slate-500 dark:bg-slate-900/70 dark:text-slate-400`}>
                          {index + 1}
                        </div>
                      </div>
                      <Field label="Nama Kegiatan" rows={3} value={entry.activityName} onChange={(value) => updateEntry(entry.id, { activityName: value })} />
                      <Field label="Tujuan Kegiatan" rows={3} value={entry.dateText} onChange={(value) => updateEntry(entry.id, { dateText: value })} />
                    </div>
                    <div className={`grid gap-5 ${editingIsGroupMatrix ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      <Field label="Sasaran Kegiatan" rows={3} value={entry.activityTime} onChange={(value) => updateEntry(entry.id, { activityTime: value })} />
                      <Field label="Jadwal Kegiatan" rows={3} value={entry.evidenceUrl} onChange={(value) => updateEntry(entry.id, { evidenceUrl: value })} />
                      {editingIsGroupMatrix && (
                        <Field label="Penanggung Jawab" rows={3} value={entry.responsibleName || ''} onChange={(value) => updateEntry(entry.id, { responsibleName: value })} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={entry.id} className="relative grid gap-5 border border-slate-200 bg-[#f8fafd] p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-[#0d1320] md:grid-cols-[100px_1fr_1fr]">
                    <div className="flex justify-end md:col-span-3">
                      <button
                        type="button"
                        onClick={() => generateReportWithOllama(index)}
                        disabled={aiReportGenerating}
                        className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
                      >
                        <Sparkles size={13} />
                        {hasAiProtectedContent(entry) ? `AI Edit Baris ${index + 1}` : `AI Isi Baris ${index + 1}`}
                      </button>
                    </div>
                    <div className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Hari Ke
                      </span>
                      <div className={`${googleInputClass} flex items-center bg-slate-100 font-black text-slate-500 dark:bg-slate-900/70 dark:text-slate-400`}>
                        {index + 1}
                      </div>
                    </div>
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
                        className={`${googleInputClass} dark:[color-scheme:dark]`}
                      />
                      {entry.dateText && parseIndonesianDateToIso(entry.dateText) && (
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
                        className={googleInputClass}
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
                          className={`${googleInputClass} mt-2`}
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
                        <label className="block flex-1 cursor-pointer border border-dashed border-slate-300 bg-white px-3 py-2 text-center shadow-none transition-colors hover:border-m-blue dark:border-slate-700 dark:bg-slate-900">
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
                            className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      {entry.evidenceUrl && (
                        <div className="group relative mt-2 overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                          <img
                            src={entry.evidenceUrl}
                            alt="Preview bukti"
                            className="h-24 w-full object-contain p-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </form>
        )}

        <aside className={`order-1 space-y-3 lg:order-2 ${isFinancialReadOnly ? 'lg:col-span-2' : ''}`}>
          <div id="laporan-tersimpan" className="space-y-4 border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] md:p-5">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800/60">
              <h2 className="font-bold text-lg tracking-tight">{isFinancialReadOnly ? `${reportPageTitle} Bendahara` : `${reportPageTitle} Tersimpan`}</h2>
              {isFinancialReadOnly && (
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Mode baca saja. Semua divisi bisa melihat riwayat dan template laporan bendahara, tanpa akses edit.
                </p>
              )}
            </div>
            <div className="space-y-3">
              {pageReports.map((report) => (
                <div key={report.id} className="border border-slate-200 bg-[#f8fafd] p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-[#0d1320]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white">
                        {isTreasurerOutputReport(report) ? `Laporan Pengeluaran ${report.week}` : isTreasurerIncomeReport(report) ? `Laporan Pemasukan ${report.week}` : isGroupMatrixReport(report) ? `Matriks Kelompok ${report.week}` : isIndividualMatrixReport(report) ? `Matriks Individu ${report.week}` : `Minggu ${report.week}`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{report.entries.length} baris {isTreasurerOutputReport(report) ? 'pengeluaran' : isTreasurerIncomeReport(report) ? 'pemasukan' : isMatrixReport(report) ? 'program kerja' : 'kegiatan'}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {isFinancialReadOnly ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFinancialReportId(report.id)}
                        className="rounded-full bg-white dark:bg-[#0f1322] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2 text-xs font-bold text-center text-slate-700 dark:text-slate-300 transition-all duration-200"
                      >
                        Lihat Template
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditing(report)}
                        className="rounded-full bg-white dark:bg-[#0f1322] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2 text-xs font-bold text-center text-slate-700 dark:text-slate-300 transition-all duration-200"
                      >
                        Edit
                      </button>
                    )}
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
                    {!isFinancialReadOnly && (
                      <button
                        onClick={() => deleteReport(report)}
                        disabled={downloadingPdf !== null}
                        className="rounded-full bg-[#fce8e6] text-[#c5221f] dark:bg-red-950/40 dark:text-red-400 hover:bg-[#f9d2ce] dark:hover:bg-red-900/60 border border-red-200/50 dark:border-red-800/40 py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-200"
                        title="Hapus laporan"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pageReports.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada {reportPageTitle.toLowerCase()} tersimpan.</p>
                </div>
              )}
            </div>
          </div>

          <div id="pratinjau-pdf" className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
              Pratinjau Cetak PDF A4
            </span>
            <div className="overflow-x-auto border border-slate-300 bg-slate-200 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900">
              {previewReport ? (
                <PreviewReportTemplate report={previewReport} />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center bg-white px-6 text-center text-sm font-bold text-slate-500">
                  Belum ada laporan bendahara yang tersimpan.
                </div>
              )}
            </div>
          </div>
        </aside>
        </>
        )}
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
        #putra-ai-chat-widget {
          position: fixed !important;
          right: 24px !important;
          bottom: 72px !important;
          z-index: 2147483647 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-end !important;
          visibility: visible !important;
          opacity: 1 !important;
          transform: none !important;
          pointer-events: auto !important;
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
  const groupMatrixTemplate = isGroupMatrixReport(report);
  const individualMatrixTemplate = isIndividualMatrixReport(report);
  const treasurerOutputTemplate = isTreasurerOutputReport(report);
  const treasurerIncomeTemplate = isTreasurerIncomeReport(report);
  const treasurerFinancialTemplate = isTreasurerFinancialReport(report);
  const matrixTemplate = isMatrixReport(report);
  const customTableTemplate = matrixTemplate || treasurerFinancialTemplate;
  const entriesPerPage = customTableTemplate ? 5 : 4;
  const entries = report?.entries?.length
    ? report.entries
    : [{ id: 'empty', dayNumber: report?.week || '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '', responsibleName: '' }];
  const pages = entries.reduce<WeeklyReportEntry[][]>((acc, entry, index) => {
    const pageIndex = Math.floor(index / entriesPerPage);
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
                      {treasurerFinancialTemplate ? (
                        <>
                          {treasurerIncomeTemplate ? 'LAPORAN PEMASUKAN BENDAHARA' : 'LAPORAN PENGELUARAN BENDAHARA'}<br />
                          KKN REGULER ANGKATAN KE 66 TAHUN 2026
                        </>
                      ) : matrixTemplate ? (
                        <>
                          FORMAT MATRIK <span className="bg-[#00ff66] px-[1mm]">{groupMatrixTemplate ? 'PROGRAM KERJA KELOMPOK' : 'PROGRAM KERJA INDIVIDU'}</span> MAHASISWA KKN
                          {individualMatrixTemplate && (
                            <>
                              <br />
                              DISESUAIKAN DENGAN BIDANG KEILMUAN MASING-MASING
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          Laporan Mingguan (Logbook)<br />
                          KKN Reguler - Angkatan Ke 66<br />
                          Universitas Muhammadiyah Palembang<br />
                          Tahun 2026<br />
                          Buku Profil dan Potensi Desa
                        </>
                      )}
                    </h3>
                  )}
                </div>

                {pageIndex === 0 && !customTableTemplate && (
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

                {treasurerFinancialTemplate ? (
                  <table className="mt-[5mm] w-full border-collapse text-[10px] leading-tight table-fixed text-black">
                    <colgroup>
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontWeight: 'bold' }}>
                        {(treasurerIncomeTemplate
                          ? ['No', 'Tanggal', 'Sumber Pemasukan', 'Keterangan', 'Metode / Status', 'Jumlah Masuk']
                          : ['No', 'Tanggal', 'Barang Dibeli', 'Deskripsi', 'Perunit', 'Harga']
                        ).map((heading) => (
                          <th key={heading} className="border border-black px-1 py-2 text-center align-middle">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageEntries.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="border border-black px-1 py-3 text-center align-top h-[18mm]">{entry.dayNumber}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.dateText}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityName}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityTime}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.evidenceUrl}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap text-right">{entry.responsibleName}</td>
                        </tr>
                      ))}
                      {pageIndex === pages.length - 1 && (
                        <tr>
                          <td colSpan={5} className="border border-black px-2 py-2 text-right font-bold">{treasurerIncomeTemplate ? 'Jumlah Pemasukan' : 'Jumlah Pengeluaran'}</td>
                          <td className="border border-black px-2 py-2 text-right font-bold">{formatRupiah(getTreasurerOutputTotal(entries))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : matrixTemplate ? (
                  <table className="mt-[5mm] w-full border-collapse text-[10px] leading-tight table-fixed text-black">
                    <colgroup>
                      {groupMatrixTemplate ? (
                        <>
                          <col style={{ width: '7%' }} />
                          <col style={{ width: '24%' }} />
                          <col style={{ width: '19%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '14%' }} />
                        </>
                      ) : (
                        <>
                          <col style={{ width: '7%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '22%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '21%' }} />
                        </>
                      )}
                    </colgroup>
                    <thead>
                      <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontWeight: 'bold' }}>
                        {(groupMatrixTemplate
                          ? ['No', 'Nama Kegiatan', 'Tujuan Kegiatan', 'Sasaran Kegiatan', 'Jadwal Kegiatan', 'Penanggung Jawab Kegiatan']
                          : ['No', 'Nama Kegiatan', 'Tujuan Kegiatan', 'Sasaran Kegiatan', 'Jadwal Kegiatan']
                        ).map((heading) => (
                          <th key={heading} className="border border-black px-1 py-2 text-center align-middle">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageEntries.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="border border-black px-1 py-3 text-center align-top h-[20mm]">{entry.dayNumber}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityName}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.dateText}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityTime}</td>
                          <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.evidenceUrl}</td>
                          {groupMatrixTemplate && <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.responsibleName}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
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
                          <td className={`border border-black px-1 py-2 text-center align-middle ${index === 0 ? 'h-[38mm]' : 'h-[30mm]'}`}>{entry.dayNumber}.</td>
                          <td className="border border-black px-1 py-2 whitespace-pre-wrap">{entry.dateText}</td>
                          <td className="border border-black px-1 py-2 whitespace-pre-wrap">
                            {entry.activityName}
                            {entry.activityTime && <><br /><br />{entry.activityTime}</>}
                          </td>
                          <td className="border border-black p-1 text-center align-middle">
                            {(/^https?:\/\/.+\.(png|jpg|jpeg|webp)$/i.test(entry.evidenceUrl) || /^data:image\//i.test(entry.evidenceUrl)) ? (
                              <div className="mx-auto h-[34mm] w-[34mm] overflow-hidden bg-white">
                                <img src={entry.evidenceUrl} alt="Bukti kegiatan" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <span className="break-all">{entry.evidenceUrl}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {pageIndex === pages.length - 1 && (
                  customTableTemplate ? (
                    <div className="mt-[10mm] grid grid-cols-[1fr_0.8fr_1fr] items-start gap-[8mm] text-[9px] leading-tight text-black">
                      <div className="text-left">
                        <p>Dosen Pembimbing Lapangan</p>
                        <div className="h-[18mm]"></div>
                        <p>(Nama Lengkap dan gelar)</p>
                        <p>NIDN dan NBM</p>
                      </div>
                      <div className="text-center">
                        <p>Mengetahui,</p>
                      </div>
                      <div className="ml-auto w-[54mm] text-center">
                        <p>{report.desa || 'Palembang'}, &nbsp;&nbsp; {report.villageDate || 'Juli'} 2026</p>
                        <p className="mt-[4mm]">{groupMatrixTemplate ? 'Ketua Kelompok' : 'Mahasiswa'}</p>
                        <div className="mx-auto flex h-[16mm] w-[44mm] items-center justify-center">
                          {report.signatureDataUrl && (
                            <img src={report.signatureDataUrl} alt="Tanda tangan" className="max-h-[15mm] max-w-[42mm] object-contain" />
                          )}
                        </div>
                        <p>({report.signerName || 'Nama Lengkap'})</p>
                        <p>{report.signerNim || (groupMatrixTemplate ? 'NIM' : 'NIM.')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-[8mm] ml-auto w-[60mm] text-center text-[9px]">
                      <p>{report.desa || 'Desa/Kelurahan'}, {report.villageDate || '................'} 2026</p>
                      <div className="flex h-[18mm] items-center justify-center">
                        {report.signatureDataUrl && (
                          <img src={report.signatureDataUrl} alt="Tanda tangan" className="max-h-[16mm] max-w-[45mm] object-contain" />
                        )}
                      </div>
                      <p>({report.signerName || 'Nama'} &nbsp; {report.signerNim || 'NIM'})</p>
                    </div>
                  )
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
  const groupMatrixTemplate = isGroupMatrixReport(report);
  const individualMatrixTemplate = isIndividualMatrixReport(report);
  const treasurerOutputTemplate = isTreasurerOutputReport(report);
  const treasurerIncomeTemplate = isTreasurerIncomeReport(report);
  const treasurerFinancialTemplate = isTreasurerFinancialReport(report);
  const matrixTemplate = isMatrixReport(report);
  const customTableTemplate = matrixTemplate || treasurerFinancialTemplate;
  const entriesPerPage = customTableTemplate ? 5 : 4;
  const entries = report.entries.length
    ? report.entries
    : [{ id: 'empty', dayNumber: report.week || '1', dateText: '', activityName: '', activityTime: '', evidenceUrl: '', responsibleName: '' }];
  const pages = entries.reduce<WeeklyReportEntry[][]>((acc, entry, index) => {
    const pageIndex = Math.floor(index / entriesPerPage);
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
                    {treasurerFinancialTemplate ? (
                      <>
                        {treasurerIncomeTemplate ? 'LAPORAN PEMASUKAN BENDAHARA' : 'LAPORAN PENGELUARAN BENDAHARA'}<br />
                        KKN REGULER ANGKATAN KE 66 TAHUN 2026
                      </>
                    ) : matrixTemplate ? (
                      <>
                        FORMAT MATRIK <span className="bg-[#00ff66] px-[1mm]">{groupMatrixTemplate ? 'PROGRAM KERJA KELOMPOK' : 'PROGRAM KERJA INDIVIDU'}</span> MAHASISWA KKN
                        {individualMatrixTemplate && (
                          <>
                            <br />
                            DISESUAIKAN DENGAN BIDANG KEILMUAN MASING-MASING
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Laporan Mingguan (Logbook)<br />
                        KKN Reguler - Angkatan Ke 66<br />
                        Universitas Muhammadiyah Palembang<br />
                        Tahun 2026<br />
                        Buku Profil dan Potensi Desa
                      </>
                    )}
                  </h3>
                )}
              </div>

              {pageIndex === 0 && !customTableTemplate && (
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

              {treasurerFinancialTemplate ? (
                <table className="mt-[5mm] w-full border-collapse text-[10px] leading-tight table-fixed text-black">
                  <colgroup>
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontWeight: 'bold' }}>
                      {(treasurerIncomeTemplate
                        ? ['No', 'Tanggal', 'Sumber Pemasukan', 'Keterangan', 'Metode / Status', 'Jumlah Masuk']
                        : ['No', 'Tanggal', 'Barang Dibeli', 'Deskripsi', 'Perunit', 'Harga']
                      ).map((heading) => (
                        <th key={heading} className="border border-black px-1 py-2 text-center align-middle">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="border border-black px-1 py-3 text-center align-top h-[18mm]">{entry.dayNumber}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.dateText}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityName}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityTime}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.evidenceUrl}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap text-right">{entry.responsibleName}</td>
                      </tr>
                    ))}
                    {pageIndex === pages.length - 1 && (
                      <tr>
                        <td colSpan={5} className="border border-black px-2 py-2 text-right font-bold">{treasurerIncomeTemplate ? 'Jumlah Pemasukan' : 'Jumlah Pengeluaran'}</td>
                        <td className="border border-black px-2 py-2 text-right font-bold">{formatRupiah(getTreasurerOutputTotal(entries))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : matrixTemplate ? (
                <table className="mt-[5mm] w-full border-collapse text-[10px] leading-tight table-fixed text-black">
                  <colgroup>
                    {groupMatrixTemplate ? (
                      <>
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '24%' }} />
                        <col style={{ width: '19%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '14%' }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '21%' }} />
                      </>
                    )}
                  </colgroup>
                  <thead>
                    <tr style={{ fontFamily: "'Aptos Display', Aptos, sans-serif", fontWeight: 'bold' }}>
                      {(groupMatrixTemplate
                        ? ['No', 'Nama Kegiatan', 'Tujuan Kegiatan', 'Sasaran Kegiatan', 'Jadwal Kegiatan', 'Penanggung Jawab Kegiatan']
                        : ['No', 'Nama Kegiatan', 'Tujuan Kegiatan', 'Sasaran Kegiatan', 'Jadwal Kegiatan']
                      ).map((heading) => (
                        <th key={heading} className="border border-black px-1 py-2 text-center align-middle">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="border border-black px-1 py-3 text-center align-top h-[20mm]">{entry.dayNumber}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityName}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.dateText}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.activityTime}</td>
                        <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.evidenceUrl}</td>
                        {groupMatrixTemplate && <td className="border border-black px-1 py-3 whitespace-pre-wrap">{entry.responsibleName}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                        <td className={`border border-black px-1 py-2 text-center align-middle ${index === 0 ? 'h-[38mm]' : 'h-[30mm]'}`}>{entry.dayNumber}.</td>
                        <td className="border border-black px-1 py-2 whitespace-pre-wrap">{entry.dateText}</td>
                        <td className="border border-black px-1 py-2 whitespace-pre-wrap">
                          {entry.activityName}
                          {entry.activityTime && <><br /><br />{entry.activityTime}</>}
                        </td>
                        <td className="border border-black p-1 text-center align-middle">
                          {(/^https?:\/\/.+\.(png|jpg|jpeg|webp)$/i.test(entry.evidenceUrl) || /^data:image\//i.test(entry.evidenceUrl)) ? (
                            <div className="mx-auto h-[34mm] w-[34mm] overflow-hidden bg-white">
                              <img src={entry.evidenceUrl} alt="Bukti kegiatan" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <span className="break-all">{entry.evidenceUrl}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {pageIndex === pages.length - 1 && (
                customTableTemplate ? (
                  <div className="mt-[10mm] grid grid-cols-[1fr_0.8fr_1fr] items-start gap-[8mm] text-[9px] leading-tight text-black">
                    <div className="text-left">
                      <p>Dosen Pembimbing Lapangan</p>
                      <div className="h-[18mm]"></div>
                      <p>(Nama Lengkap dan gelar)</p>
                      <p>NIDN dan NBM</p>
                    </div>
                    <div className="text-center">
                      <p>Mengetahui,</p>
                    </div>
                    <div className="ml-auto w-[54mm] text-center">
                      <p>{report.desa || 'Palembang'}, &nbsp;&nbsp; {report.villageDate || 'Juli'} 2026</p>
                      <p className="mt-[4mm]">{groupMatrixTemplate ? 'Ketua Kelompok' : 'Mahasiswa'}</p>
                      <div className="mx-auto flex h-[16mm] w-[44mm] items-center justify-center">
                        {report.signatureDataUrl && (
                          <img src={report.signatureDataUrl} alt="Tanda tangan" className="max-h-[15mm] max-w-[42mm] object-contain" />
                        )}
                      </div>
                      <p>({report.signerName || 'Nama Lengkap'})</p>
                      <p>{report.signerNim || (groupMatrixTemplate ? 'NIM' : 'NIM.')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-[8mm] ml-auto w-[60mm] text-center text-[9px]">
                    <p>{report.desa || 'Desa/Kelurahan'}, {report.villageDate || '................'} 2026</p>
                    <div className="flex h-[18mm] items-center justify-center">
                      {report.signatureDataUrl && (
                        <img src={report.signatureDataUrl} alt="Tanda tangan" className="max-h-[16mm] max-w-[45mm] object-contain" />
                      )}
                    </div>
                    <p>({report.signerName || 'Nama'} &nbsp; {report.signerNim || 'NIM'})</p>
                  </div>
                )
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
  const [resetMessage, setResetMessage] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpMessageType, setOtpMessageType] = useState<'info' | 'success'>('info');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerifiedUid, setOtpVerifiedUid] = useState('');
  const [otpSendStartedAt, setOtpSendStartedAt] = useState(0);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState(0);
  const [otpCooldownNow, setOtpCooldownNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDivisionDashboard, setShowDivisionDashboard] = useState(false);
  const [divisionStartView, setDivisionStartView] = useState<DivisionDashboardView>('home');

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
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [competitionRegistrations, setCompetitionRegistrations] = useState<CompetitionRegistration[]>([]);

  useEffect(() => {
    const unsubscribeAuth = storage.onAuthChange((user) => {
      setAdminUser(user?.email || null);
      setCurrentUid(user?.uid || '');
      if (!user) {
        setOtpVerifiedUid('');
        setOtpCode('');
        setOtpMessage('');
        setOtpEmail('');
        setOtpResendAvailableAt(0);
      }
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
      storage.subscribeCompetitions(setCompetitions),
      storage.subscribeCompetitionRegistrations(setCompetitionRegistrations),
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

  useEffect(() => {
    if (!currentUid) return;

    const otpVerifiedAt = Number(localStorage.getItem(getOtpVerifiedKey(currentUid)) || 0);
    setOtpVerifiedUid(otpVerifiedAt && Date.now() - otpVerifiedAt < LOGIN_SESSION_TIMEOUT_MS ? currentUid : '');
  }, [currentUid, currentProfile?.role]);

  useEffect(() => {
    if (!currentUid) return;

    const activityKey = getSessionActivityKey(currentUid);
    const expireSession = () => {
      localStorage.removeItem(activityKey);
      localStorage.removeItem(getOtpVerifiedKey(currentUid));
      setOtpVerifiedUid('');
      setOtpCode('');
      setOtpMessage('');
      setOtpResendAvailableAt(0);
      storage.logout();
    };
    const lastActivity = Number(localStorage.getItem(activityKey) || 0);
    if (lastActivity && Date.now() - lastActivity > LOGIN_SESSION_TIMEOUT_MS) {
      expireSession();
      return;
    }

    const touchSession = () => localStorage.setItem(activityKey, String(Date.now()));
    touchSession();

    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, touchSession, { passive: true }));
    const timer = window.setInterval(() => {
      const last = Number(localStorage.getItem(activityKey) || 0);
      if (last && Date.now() - last > LOGIN_SESSION_TIMEOUT_MS) {
        expireSession();
      }
    }, 60 * 1000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, touchSession));
      window.clearInterval(timer);
    };
  }, [currentUid]);

  const unreadMessages = messages.filter((message) => message.status === 'unread').length;
  const pendingReviews = reviewSubmissions.length;
  const isAdmin = adminUser === ADMIN_EMAIL || currentProfile?.role === 'admin';
  const currentDivisionAccessGroup = currentProfile ? getDivisionAccessGroup(currentProfile.division) : '';
  const isPddOperator = currentDivisionAccessGroup === 'pdd';
  const isAcaraOperator = currentDivisionAccessGroup === 'acara';
  const requiresDivisionOtp = currentProfile?.role === 'division' && otpVerifiedUid !== currentUid;
  const allowedTabs: Tab[] = isAdmin
    ? ['overview', 'accounts', 'content', 'maintenance', 'event', 'team', 'programs', 'gallery', 'testimonials', 'reviews', 'messages', 'competitions', 'competition-registrations']
    : isPddOperator
      ? ['content', 'team', 'gallery']
      : isAcaraOperator
        ? ['event', 'competitions', 'competition-registrations']
        : [];
  const canUseAdminPanel = allowedTabs.length > 0;

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

  useEffect(() => {
    if (canUseAdminPanel && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs, canUseAdminPanel]);

  useEffect(() => {
    if (!otpSending || !otpSendStartedAt) return;

    const timer = window.setTimeout(() => {
      setOtpMessageType('info');
      setOtpMessage('OTP sedang dikirim lewat Gmail. Biasanya 3-10 detik; kalau belum masuk, cek Inbox/Spam atau tekan Kirim ulang OTP.');
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [otpSending, otpSendStartedAt]);

  useEffect(() => {
    if (!otpResendAvailableAt) return;

    const timer = window.setInterval(() => setOtpCooldownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpResendAvailableAt]);

  const otpResendRemainingSeconds = Math.max(0, Math.ceil((otpResendAvailableAt - otpCooldownNow) / 1000));
  const canResendOtp = !otpSending && otpResendRemainingSeconds <= 0;

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setResetMessage('');
    setOtpMessage('');
    setOtpMessageType('info');
    setOtpCode('');

    try {
      const credential = await storage.login(email, password);
      await storage.init();
      localStorage.setItem(getSessionActivityKey(credential.user.uid), String(Date.now()));
      localStorage.removeItem(getOtpVerifiedKey(credential.user.uid));

      const profile = await storage.getUserProfile(credential.user.uid);
      if (profile?.role === 'division') {
        setOtpSending(true);
        setOtpSendStartedAt(Date.now());
        setOtpCooldownNow(Date.now());
        setOtpResendAvailableAt(Date.now() + OTP_RESEND_COOLDOWN_MS);
        try {
          const otp = await storage.requestLoginOtp();
          setOtpEmail(otp.email || credential.user.email || email.trim());
          setOtpMessageType('success');
          setOtpMessage(`Kode OTP sudah dikirim ke ${otp.email || credential.user.email || email.trim()}. Cek inbox atau spam.`);
        } catch (error: any) {
          setOtpMessage('');
          setLoginError(error?.message || 'Kode OTP belum berhasil dikirim. Cek SMTP Gmail dan coba kirim ulang.');
        } finally {
          setOtpSending(false);
          setOtpSendStartedAt(0);
        }
      } else {
        setOtpVerifiedUid(credential.user.uid);
      }
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

      setLoginError(error?.message || 'Login belum berhasil. Cek koneksi, akun Firebase Auth, dan konfigurasi project.');
    }
  };

  const resendLoginOtp = async () => {
    if (!canResendOtp) return;

    setLoginError('');
    setOtpMessage('');
    setOtpMessageType('info');
    setOtpSending(true);
    setOtpSendStartedAt(Date.now());
    setOtpCooldownNow(Date.now());
    setOtpResendAvailableAt(Date.now() + OTP_RESEND_COOLDOWN_MS);
    try {
      const otp = await storage.requestLoginOtp();
      setOtpEmail(otp.email || otpEmail);
      setOtpMessageType('success');
      setOtpMessage(`Kode OTP baru sudah dikirim ke ${otp.email || otpEmail}.`);
    } catch (error: any) {
      setOtpMessage('');
      setLoginError(error?.message || 'Kode OTP belum berhasil dikirim.');
    } finally {
      setOtpSending(false);
      setOtpSendStartedAt(0);
    }
  };

  const verifyLoginOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setOtpMessage('');
    setOtpMessageType('info');

    const cleanCode = otpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setLoginError('Masukkan kode OTP 6 digit.');
      return;
    }

    setOtpVerifying(true);
    try {
      await storage.verifyLoginOtp(cleanCode);
      if (currentUid) {
        localStorage.setItem(getOtpVerifiedKey(currentUid), String(Date.now()));
        localStorage.setItem(getSessionActivityKey(currentUid), String(Date.now()));
        setOtpVerifiedUid(currentUid);
      }
      setOtpCode('');
      setOtpMessage('');
      setOtpResendAvailableAt(0);
    } catch (error: any) {
      setLoginError(error?.message || 'Kode OTP belum cocok.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const sendPasswordReset = async () => {
    const trimmedEmail = email.trim();
    setLoginError('');
    setResetMessage('');

    if (!trimmedEmail) {
      setLoginError('Isi email akun yang terdaftar dulu, lalu klik Lupa password.');
      return;
    }

    setResetSending(true);
    try {
      await storage.sendPasswordReset(trimmedEmail);
      setResetMessage(`Link reset password sudah dikirim ke ${trimmedEmail}. Cek inbox atau spam email tersebut.`);
    } catch (error: any) {
      const code = error?.code || '';

      if (code === 'auth/invalid-email') {
        setLoginError('Format email belum benar.');
        return;
      }

      if (code === 'auth/user-not-found') {
        setLoginError('Email ini belum terdaftar di Firebase Auth.');
        return;
      }

      if (code === 'auth/operation-not-allowed') {
        setLoginError('Reset password Email/Password belum diaktifkan di Firebase Authentication.');
        return;
      }

      setLoginError('Link reset belum bisa dikirim. Cek koneksi dan konfigurasi Firebase Authentication.');
    } finally {
      setResetSending(false);
    }
  };

  const logout = async () => {
    if (currentUid) {
      localStorage.removeItem(getOtpVerifiedKey(currentUid));
      localStorage.removeItem(getSessionActivityKey(currentUid));
    }
    setOtpVerifiedUid('');
    setOtpCode('');
    setOtpMessage('');
    setOtpResendAvailableAt(0);
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
    { id: 'competitions', label: 'Perlombaan', icon: Trophy },
    { id: 'competition-registrations', label: 'Pendaftar Lomba', icon: ClipboardList, badge: competitionRegistrations.filter(r => r.status === 'pending').length },
    { id: 'gallery', label: 'Galeri', icon: ImageIcon },
    { id: 'testimonials', label: 'Testimoni', icon: MessageSquare },
    { id: 'reviews', label: 'Verifikasi Ulasan', icon: Check, badge: pendingReviews },
    { id: 'messages', label: 'Pesan Masuk', icon: Mail, badge: unreadMessages },
  ] as const;
  const visibleNavItems = navItems.filter((item) => allowedTabs.includes(item.id));
  const openDivisionDashboard = (view: DivisionDashboardView) => {
    setDivisionStartView(view);
    setShowDivisionDashboard(true);
    setIsSidebarOpen(false);
  };
  const openAdminTask = (tab: Tab) => {
    setActiveTab(tab);
    setShowDivisionDashboard(false);
    setIsSidebarOpen(false);
  };
  const operatorDivisionNavItems = currentProfile
    ? [
      { label: 'Home', icon: Home, action: () => openDivisionDashboard('home') },
      { label: 'Live Maps', icon: MapPinned, action: () => openDivisionDashboard('maps') },
      { label: 'Laporan Mingguan', icon: FileText, action: () => openDivisionDashboard('weekly') },
      { label: 'Matriks Individu', icon: ClipboardCheck, action: () => openDivisionDashboard('individualMatrix') },
      ...(getDivisionAccessGroup(currentProfile.division) === 'sekretaris'
        ? [{ label: 'Matriks Kelompok', icon: ClipboardList, action: () => openDivisionDashboard('groupMatrix') }]
        : []),
      { label: 'Riwayat Pengeluaran', icon: Briefcase, action: () => openDivisionDashboard('treasurerOutput') },
      { label: 'Riwayat Pemasukan', icon: Download, action: () => openDivisionDashboard('treasurerIncome') },
    ]
    : [];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="font-semibold">Memeriksa sesi admin...</div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className={`${googleSurfaceClass} w-full max-w-md overflow-hidden`}>
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#e8f0fe] via-white to-white px-8 py-7 dark:border-slate-800 dark:from-[#1a73e8]/15 dark:via-[#111827] dark:to-[#111827]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/80 bg-white p-2 shadow-[0_4px_18px_rgba(60,64,67,0.16)] dark:border-slate-700 dark:bg-slate-950">
                <img
                  src="/report-assets/logokknv1.png"
                  alt="Logo KKN"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#1a73e8] dark:text-[#8ab4f8]">Admin KKN 35</p>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Login</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Masuk untuk melanjutkan.</p>
              </div>
            </div>
          </div>

          <form onSubmit={login} className="space-y-4 px-8 pt-7">
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
                  className={`${googleInputClass} pr-12`}
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

            {resetMessage && (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                {resetMessage}
              </p>
            )}

            <button className={`${googlePrimaryButtonClass} w-full py-3`}>
              Masuk
            </button>

            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={resetSending}
              className="w-full rounded-full px-4 py-2 text-sm font-bold text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#8ab4f8] dark:hover:bg-[#1a73e8]/15"
            >
              {resetSending ? 'Mengirim link reset...' : 'Lupa password? Kirim link reset'}
            </button>
          </form>

          <button
            onClick={onClose}
            className="mx-8 mb-8 mt-4 w-[calc(100%-4rem)] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Website
          </button>
        </div>
      </div>
    );
  }

  if (requiresDivisionOtp) {
    return (
      <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className={`${googleSurfaceClass} w-full max-w-lg overflow-hidden`}>
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#e8f0fe] via-white to-white px-6 py-6 dark:border-slate-800 dark:from-[#1a73e8]/15 dark:via-[#111827] dark:to-[#111827] sm:px-8 sm:py-7">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/80 bg-white p-2 shadow-[0_4px_18px_rgba(60,64,67,0.16)] dark:border-slate-700 dark:bg-slate-950">
                <Mail size={30} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#1a73e8] dark:text-[#8ab4f8]">Verifikasi OTP</p>
                <h1 className="text-3xl font-black tracking-normal text-slate-900 dark:text-white">Cek Email</h1>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Akun divisi wajib verifikasi kode sebelum masuk.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={verifyLoginOtp} className="space-y-5 px-6 pt-7 sm:px-8">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Kode OTP 6 Digit
              </span>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className={`${googleInputClass} h-16 rounded-2xl text-center text-2xl font-black tracking-[0.45em] placeholder:text-slate-300 dark:placeholder:text-slate-600`}
              />
              <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                Masukkan 6 angka dari email. Kode berlaku 10 menit.
              </p>
            </label>

            {otpMessage && (
              <p className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
                otpMessageType === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/15 dark:text-[#8ab4f8]'
              }`}>
                {otpMessage}
              </p>
            )}

            {loginError && (
              <p className="rounded-2xl bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold leading-6 text-red-600 dark:text-red-300">
                {loginError}
              </p>
            )}

            <button className={`${googlePrimaryButtonClass} w-full py-4 text-base`} disabled={otpVerifying || otpCode.length !== 6}>
              {otpVerifying ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
            </button>

            <button
              type="button"
              onClick={resendLoginOtp}
              disabled={!canResendOtp}
              className="w-full rounded-full border border-[#1a73e8]/15 bg-white px-4 py-3 text-sm font-black text-[#1a73e8] transition-all hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#8ab4f8]/20 dark:bg-slate-900 dark:text-[#8ab4f8] dark:hover:bg-[#1a73e8]/15 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-500"
            >
              {otpSending
                ? 'Mengirim OTP...'
                : otpResendRemainingSeconds > 0
                  ? `Kirim ulang dalam ${otpResendRemainingSeconds} detik`
                  : 'Kirim ulang kode OTP'}
            </button>
          </form>

          <button
            onClick={logout}
            className="mx-8 mb-8 mt-4 w-[calc(100%-4rem)] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Ganti Akun
          </button>
        </div>
      </div>
    );
  }

  if (!canUseAdminPanel) {
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

  if (showDivisionDashboard && currentProfile) {
    return (
      <DivisionDashboard
        profile={currentProfile}
        onLogout={logout}
        onClose={onClose}
        initialView={divisionStartView}
        adminNavItems={visibleNavItems.map((item) => ({
          label: item.label,
          icon: item.icon,
          action: () => openAdminTask(item.id),
        }))}
        onAdminPanel={() => setShowDivisionDashboard(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-[#f8fafd] text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 flex flex-col md:flex-row">
      {/* Backdrop for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fadeIn cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Drawer (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-dvh w-72 bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800/80 p-4 md:p-5 flex flex-col justify-between overflow-y-auto overscroll-contain shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div>
          {/* Drawer Header */}
          <div className="mb-6 flex items-start justify-between gap-3 px-1">
            <div className="min-w-0 flex-1">
              <p className="inline-flex bg-[#e8f0fe] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
                {!isAdmin && currentProfile ? `Divisi ${getDivisionLabel(currentProfile.division)}` : 'KKN 35'}
              </p>
              <h2 className="mt-2 truncate text-2xl font-black leading-tight tracking-normal text-slate-950 dark:text-white">
                {!isAdmin && currentProfile ? 'Dashboard Divisi' : 'Admin Panel'}
              </h2>
            </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
                aria-label="Tutup panel admin"
              >
                <X size={22} />
              </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {!isAdmin && currentProfile && operatorDivisionNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.action();
                  }}
                  className="flex w-full items-center gap-3.5 px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-[#f1f3f4] dark:text-slate-300 dark:hover:bg-[#1f2937]"
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            {!isAdmin && currentProfile && visibleNavItems.length > 0 && (
              <div className="my-3 border-t border-slate-100 dark:border-slate-800" />
            )}

            {visibleNavItems.map((item) => {
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
                  className={`w-full px-4 py-3 text-sm font-bold flex items-center justify-between transition-all ${!isAdmin && currentProfile ? '' : 'rounded-full'} ${selected
                      ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-[#f1f3f4] dark:hover:bg-[#1f2937]'
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
        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800/80">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              setIsSidebarOpen(false);
            }}
            className="w-full rounded-full px-4 py-3 text-sm font-bold flex items-center gap-3.5 text-slate-600 dark:text-slate-300 hover:bg-[#f1f3f4] dark:hover:bg-[#1f2937] transition-colors"
          >
            <ArrowLeft size={18} />
            Lihat Website
          </button>
          <div className="mt-3 flex items-center gap-3 border border-slate-200 bg-[#f8fafd] px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#151c30]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-m-blue to-blue-500 text-sm font-black text-white shadow-sm">
              {!isAdmin && currentProfile?.name ? currentProfile.name[0].toUpperCase() : adminUser ? adminUser[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-black leading-tight text-slate-900 dark:text-white">
                {!isAdmin && currentProfile ? currentProfile.name : 'Admin'}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">{adminUser}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-red-200 bg-[#fce8e6] px-4 py-3 text-sm font-black text-[#c5221f] transition-colors hover:bg-[#f9d2ce] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
        {/* Google Style Fixed/Sticky App Bar */}
        <header className="fixed top-0 left-0 right-0 md:sticky md:relative md:left-auto md:right-auto z-30 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
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
              className="flex items-center gap-1.5 text-xs font-bold bg-[#f1f3f4] dark:bg-[#1f2937] text-slate-700 dark:text-slate-300 border border-transparent px-3 py-2 sm:px-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Kembali ke Web"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
              <span className="hidden sm:inline"> ke Web</span>
            </button>
            <div className="h-9 w-9 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm select-none shadow-sm shadow-[#1a73e8]/20">
              {adminUser ? adminUser[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        {/* Spacer for fixed header on mobile */}
        <div className="h-[68px] shrink-0 md:hidden" />

        {/* Scrollable Content Container */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
            activeTab === 'accounts' ||
            activeTab === 'content' ||
            activeTab === 'maintenance' ||
            activeTab === 'event' ||
            activeTab === 'team' ||
            activeTab === 'programs' ||
            activeTab === 'gallery' ||
            activeTab === 'testimonials' ||
            activeTab === 'reviews' ||
            activeTab === 'competitions' ||
            activeTab === 'competition-registrations'
              ? 'p-0'
              : activeTab === 'overview'
                ? 'p-2 md:p-3 lg:p-4'
              : 'p-4 md:p-6 lg:p-8'
          }`}
        >
          {activeTab === 'overview' && (
            <div className="min-h-full space-y-3">

              {/* Page Header */}
              <div className="flex flex-col gap-3 border border-slate-200 bg-white px-4 py-3 shadow-none dark:border-slate-800 dark:bg-[#0d1320] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1a73e8] dark:text-[#8ab4f8]">Monitoring</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">Ringkasan Operasional Website</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Pantau konten, akun divisi, ulasan, dan pesan pengunjung secara realtime.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    LIVE DATABASE
                  </div>
                  <div className="inline-flex items-center gap-2 border border-slate-200 bg-[#f8fafd] px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300">
                    {stats.reduce((total, stat) => total + stat.value, 0)} data terpantau
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  const colors = [
                    { bg: 'rgba(59,130,246,0.12)', icon: '#60a5fa', glow: 'rgba(59,130,246,0.20)' },
                    { bg: 'rgba(168,85,247,0.12)', icon: '#c084fc', glow: 'rgba(168,85,247,0.20)' },
                    { bg: 'rgba(20,184,166,0.12)', icon: '#2dd4bf', glow: 'rgba(20,184,166,0.20)' },
                    { bg: 'rgba(245,158,11,0.12)', icon: '#fbbf24', glow: 'rgba(245,158,11,0.20)' },
                    { bg: 'rgba(239,68,68,0.12)', icon: '#f87171', glow: 'rgba(239,68,68,0.20)' },
                    { bg: 'rgba(34,197,94,0.12)', icon: '#4ade80', glow: 'rgba(34,197,94,0.20)' },
                  ];
                  const c = colors[i % colors.length];
                  const hasAlert = stat.value > 0 && (stat.label === 'Ulasan Pending' || stat.label === 'Pesan Baru');
                  return (
                    <div
                      key={stat.label}
                      className="group relative overflow-hidden border border-slate-200 bg-white p-4 shadow-none transition-colors duration-200 hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#0d1320] dark:hover:bg-[#111827]"
                    >
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="h-11 w-11 flex shrink-0 items-center justify-center"
                            style={{ background: c.bg, color: c.icon, boxShadow: `0 0 16px ${c.glow}` }}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-3xl font-black leading-none tracking-tight text-slate-950 dark:text-white">{stat.value}</div>
                          <div className="mt-1 truncate text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</div>
                        </div>
                        <div className="ml-auto">
                          {hasAlert && (
                            <span className="block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monitoring Panels */}
              <div className="grid gap-2 xl:grid-cols-[360px_minmax(0,1fr)]">
                {/* Event Aktif — wider */}
                <div className="relative overflow-hidden border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <CalendarClock size={16} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Event Aktif</span>
                      </div>
                      <span className="border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">Website</span>
                    </div>
                    <p className="text-xl font-black text-slate-950 dark:text-white leading-tight">{eventContent.title || '—'}</p>
                    <p className="text-sm text-blue-300/80 mt-2 font-medium">{formatDateTimeDisplay(eventContent.date)}</p>
                    <div className="mt-4 flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {eventContent.location || 'Lokasi belum diatur'}
                    </div>
                  </div>
                </div>

                {/* Pesan Terbaru — wider */}
                <div className="relative overflow-hidden border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pesan Terbaru</span>
                    </div>
                    {unreadMessages > 0 && (
                      <span className="rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-0.5 border border-blue-500/30">
                        {unreadMessages} baru
                      </span>
                    )}
                  </div>

                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                      <Mail size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">Belum ada pesan masuk.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.slice(0, 4).map((message) => (
                        <div key={message.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 hover:bg-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8] flex items-center justify-center font-bold text-xs shrink-0">
                              {message.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{message.name}</p>
                              <p className="text-xs text-slate-500 truncate">{message.message}</p>
                            </div>
                          </div>
                          {message.status === 'unread' && (
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <AccountManager profiles={userProfiles} />
          )}

          {activeTab === 'content' && (
            <div className="w-full">
              <div className="space-y-3">
                  <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-950 dark:text-white">Hero Section</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Konten utama di bagian pertama website.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Badge" value={siteContent.heroBadge} onChange={(value) => setSiteContent({ ...siteContent, heroBadge: value })} />
                      <Field label="Judul" value={siteContent.heroTitle} onChange={(value) => setSiteContent({ ...siteContent, heroTitle: value })} />
                      <Field label="Highlight Judul" value={siteContent.heroHighlight} onChange={(value) => setSiteContent({ ...siteContent, heroHighlight: value })} />
                      <div className="lg:row-span-2">
                        <ImageField label="Gambar Hero" value={siteContent.heroImage} onChange={(value) => setSiteContent({ ...siteContent, heroImage: value })} />
                      </div>
                      <div className="lg:col-span-2">
                        <Field label="Subtitle" rows={3} value={siteContent.heroSubtitle} onChange={(value) => setSiteContent({ ...siteContent, heroSubtitle: value })} />
                      </div>
                    </div>
                  </section>

                  <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-950 dark:text-white">Tentang & Visi</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Narasi profil KKN dan visi kegiatan.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Judul Tentang" value={siteContent.aboutTitle} onChange={(value) => setSiteContent({ ...siteContent, aboutTitle: value })} />
                      <Field label="Highlight Tentang" value={siteContent.aboutHighlight} onChange={(value) => setSiteContent({ ...siteContent, aboutHighlight: value })} />
                      <Field label="Deskripsi" rows={3} value={siteContent.aboutDescription} onChange={(value) => setSiteContent({ ...siteContent, aboutDescription: value })} />
                      <Field label="Detail" rows={3} value={siteContent.aboutDetail} onChange={(value) => setSiteContent({ ...siteContent, aboutDetail: value })} />
                      <ImageField label="Gambar Tentang" value={siteContent.aboutImage} onChange={(value) => setSiteContent({ ...siteContent, aboutImage: value })} />
                      <Field label="Poin Highlight (pisahkan dengan enter)" rows={4} value={siteContent.aboutHighlights.join('\n')} onChange={(value) => setSiteContent({ ...siteContent, aboutHighlights: value.split('\n').filter(Boolean) })} />
                      <Field label="Visi" value={siteContent.visionTitle} onChange={(value) => setSiteContent({ ...siteContent, visionTitle: value })} />
                      <Field label="Deskripsi Visi" rows={2} value={siteContent.visionDescription} onChange={(value) => setSiteContent({ ...siteContent, visionDescription: value })} />
                    </div>
                  </section>

                  <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-950 dark:text-white">Profil Desa</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Informasi desa dan embed peta publik.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Judul Profil Desa" value={siteContent.villageTitle} onChange={(value) => setSiteContent({ ...siteContent, villageTitle: value })} />
                      <Field label="Deskripsi Profil Desa" rows={2} value={siteContent.villageDescription} onChange={(value) => setSiteContent({ ...siteContent, villageDescription: value })} />
                      <Field label="Gambaran Umum" rows={4} value={siteContent.villageOverview} onChange={(value) => setSiteContent({ ...siteContent, villageOverview: value })} />
                      <Field label="Google Maps Embed URL" rows={4} value={siteContent.villageMapUrl} onChange={(value) => setSiteContent({ ...siteContent, villageMapUrl: value })} />
                    </div>
                  </section>

                  <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-950 dark:text-white">Kontak</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Data kontak yang tampil di website.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Alamat" rows={2} value={siteContent.contactAddress} onChange={(value) => setSiteContent({ ...siteContent, contactAddress: value })} />
                      <Field label="Email" value={siteContent.contactEmail} onChange={(value) => setSiteContent({ ...siteContent, contactEmail: value })} />
                      <Field label="Instagram" value={siteContent.contactInstagram} onChange={(value) => setSiteContent({ ...siteContent, contactInstagram: value })} />
                      <Field label="WhatsApp" value={siteContent.contactWhatsapp} onChange={(value) => setSiteContent({ ...siteContent, contactWhatsapp: value })} />
                    </div>
                  </section>

                  <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-950 dark:text-white">Video Dokumentasi</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Poster dan tautan video dokumentasi kegiatan.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Judul Video" value={siteContent.videoTitle} onChange={(value) => setSiteContent({ ...siteContent, videoTitle: value })} />
                      <Field label="Subtitle Video" value={siteContent.videoSubtitle} onChange={(value) => setSiteContent({ ...siteContent, videoSubtitle: value })} />
                      <Field label="Deskripsi Section" rows={2} value={siteContent.videoDescription} onChange={(value) => setSiteContent({ ...siteContent, videoDescription: value })} />
                      <ImageField label="Poster Video" value={siteContent.videoPoster} onChange={(value) => setSiteContent({ ...siteContent, videoPoster: value })} />
                      <div className="lg:col-span-2">
                        <VideoField label="Link YouTube Video" value={siteContent.videoSrc} onChange={(value) => setSiteContent({ ...siteContent, videoSrc: value })} />
                      </div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-[#f8fafd]/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95">
                    <button onClick={saveSite} className={`${googlePrimaryButtonClass} w-full min-w-[210px] md:w-auto`}>
                      <Save size={16} />
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="w-full">
              <div className="space-y-3">
                <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <p className="text-sm font-black text-slate-950 dark:text-white">Status Halaman Publik</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Atur halaman maintenance dan jadwal akses website publik.
                    </p>
                  </div>

                  <label className="mb-5 flex items-center justify-between gap-4 border border-slate-200 bg-[#f8fafd] px-4 py-4 dark:border-slate-800 dark:bg-[#111827]">
                    <div>
                      <span className="block font-black text-slate-900 dark:text-white">Aktifkan halaman maintenance</span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        Saat aktif, pengunjung akan diarahkan ke halaman status sesuai jadwal.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={siteContent.maintenanceEnabled}
                      onChange={(event) => setSiteContent({ ...siteContent, maintenanceEnabled: event.target.checked })}
                      className="h-5 w-5 shrink-0 accent-m-blue"
                    />
                  </label>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Judul Halaman"
                      value={siteContent.maintenanceTitle}
                      onChange={(value) => setSiteContent({ ...siteContent, maintenanceTitle: value })}
                    />
                    <div className="lg:row-span-2">
                      <Field
                        label="Pesan Halaman"
                        rows={5}
                        value={siteContent.maintenanceMessage}
                        onChange={(value) => setSiteContent({ ...siteContent, maintenanceMessage: value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>
                </section>

                <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Mulai</p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTimeDisplay(siteContent.maintenanceStart)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Selesai</p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTimeDisplay(siteContent.maintenanceEnd)}</p>
                    </div>
                  </div>
                </section>

                <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-[#f8fafd]/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95">
                  <button onClick={saveMaintenance} className={`${googlePrimaryButtonClass} w-full min-w-[210px] md:w-auto`}>
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'event' && (
            <div className="w-full space-y-3">
              <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <p className="text-sm font-black text-slate-950 dark:text-white">Data Event</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Atur event utama dan countdown yang tampil di website.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Nama Event" value={eventContent.title} onChange={(value) => setEventContent({ ...eventContent, title: value })} />
                  <Field label="Peserta" value={eventContent.audience} onChange={(value) => setEventContent({ ...eventContent, audience: value })} />
                  <div className="lg:col-span-2">
                    <Field label="Deskripsi" rows={3} value={eventContent.description} onChange={(value) => setEventContent({ ...eventContent, description: value })} />
                  </div>
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
                  <div className="lg:col-span-2">
                    <Field label="Lokasi" value={eventContent.location} onChange={(value) => setEventContent({ ...eventContent, location: value })} />
                  </div>
                  <div className="lg:col-span-2">
                    <ImageField label="Gambar Event" value={eventContent.image} onChange={(value) => setEventContent({ ...eventContent, image: value })} />
                  </div>
                </div>
              </section>

              <section className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Jadwal Event</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTimeDisplay(eventContent.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Lokasi</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{eventContent.location || 'Belum diatur'}</p>
                  </div>
                </div>
              </section>

              <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-[#f8fafd]/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95">
                <button onClick={saveEvent} className={`${googlePrimaryButtonClass} w-full min-w-[210px] md:w-auto`}>
                  <Save size={16} />
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
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
            <div className="w-full space-y-3">
              {reviewSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white py-20 text-center shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                    <Check size={32} />
                  </div>
                  <p className="font-black text-lg text-slate-700 dark:text-slate-300">Semua ulasan sudah diverifikasi</p>
                  <p className="text-sm text-slate-400 mt-1">Belum ada ulasan baru yang menunggu persetujuan.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reviewSubmissions.map((review) => (
                    <div key={review.id} className="border border-slate-200 bg-white p-4 shadow-none transition-colors hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#0d1320] dark:hover:bg-[#111827]">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex gap-4 min-w-0">
                          {review.avatar ? (
                            <img src={review.avatar} alt={review.name} className="h-12 w-12 rounded-full object-cover bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-800 shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-m-blue/20 to-purple-500/20 text-m-blue dark:text-[#7fcfff] flex items-center justify-center font-black text-lg shrink-0 ring-2 ring-white dark:ring-slate-800">
                              {review.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white">{review.name}</h3>
                            <p className="text-sm text-m-blue dark:text-[#7fcfff] font-semibold">{review.role}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            onClick={() => setEditingReview(review)}
                            className="rounded-full bg-[#f1f3f4] px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-[#1f2937] dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => approveReview(review)}
                            className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Check size={15} />
                            Setujui
                          </button>
                          <button
                            onClick={() => rejectReview(review.id)}
                            className="rounded-full bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 size={15} />
                            Hapus
                          </button>
                        </div>
                      </div>
                      <blockquote className="mt-4 rounded-2xl bg-[#f8fafd] dark:bg-[#0f172a]/70 border-l-4 border-[#1a73e8]/40 px-4 py-3 text-slate-700 dark:text-slate-300 text-sm italic leading-relaxed">
                        "{review.quote}"
                      </blockquote>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4 w-full">
              {unreadMessages > 0 && (
                <div className="flex justify-end">
                  {unreadMessages > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 w-fit">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                      {unreadMessages} belum dibaca
                    </div>
                  )}
                </div>
              )}

              {messages.length === 0 ? (
                <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 flex min-h-[calc(100dvh-4.5rem)] w-auto flex-col items-center justify-center border-t border-slate-200 bg-[#f8fafd] text-center dark:border-slate-800 dark:bg-[#0b0f19]">
                  <p className="font-black text-xl text-slate-800 dark:text-slate-100">Belum ada pesan masuk</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Pesan dari pengunjung akan muncul di sini.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`border rounded-[24px] p-5 shadow-[0_1px_2px_rgba(60,64,67,0.10)] transition-colors ${
                        message.status === 'unread'
                          ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800/60 dark:bg-blue-950/10'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                            message.status === 'unread'
                              ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {message.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-slate-900 dark:text-white">{message.name}</h3>
                              {message.status === 'unread' && (
                                <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">Baru</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{message.email} · {message.date}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {message.status === 'unread' && (
                            <button
                              onClick={() => storage.markMessageAsRead(message.id)}
                              className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <Check size={15} />
                              Dibaca
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem('messages', message.id)}
                            className="rounded-full bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 size={15} />
                            Hapus
                          </button>
                        </div>
                      </div>
                      <p className="mt-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-[#f8fafd] dark:bg-[#0f172a]/70 rounded-2xl px-4 py-3">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitions' && (
            <CompetitionManager competitions={competitions} />
          )}

          {activeTab === 'competition-registrations' && (
            <CompetitionRegistrationManager
              registrations={competitionRegistrations}
              competitions={competitions}
            />
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

/* ─────────────────────────────────────────────────
   Competition Manager (Admin)
───────────────────────────────────────────────── */

const ICON_OPTIONS = [
  'Palette', 'BookOpen', 'Music', 'Dumbbell', 'Mic2', 'Trophy', 'Star',
  'Gamepad2', 'Scissors', 'Heart', 'Leaf', 'Camera', 'Bike', 'Zap', 'Flame',
  'Shield', 'Gift', 'Globe', 'Coffee', 'Smile',
];

const COLOR_OPTIONS = [
  { value: 'blue',    label: '🔵 Biru' },
  { value: 'pink',    label: '🩷 Pink' },
  { value: 'violet',  label: '🟣 Ungu' },
  { value: 'green',   label: '🟢 Hijau' },
  { value: 'amber',   label: '🟡 Amber' },
  { value: 'default', label: '⚪ Default' },
];

const CATEGORY_OPTIONS = [
  'Anak-anak', 'Pelajar', 'Remaja', 'Umum', 'Olahraga', 'Seni & Budaya', 'Hiburan', 'Akademik',
];

const MAX_PARTICIPANTS_OPTIONS = [
  '10 Peserta', '20 Peserta', '25 Peserta', '30 Peserta', '40 Peserta',
  '50 Peserta', '16 Tim', '20 Tim', '32 Tim', 'Tidak dibatasi',
];

const FEE_OPTIONS = [
  'Gratis', 'Rp 5.000', 'Rp 10.000', 'Rp 15.000', 'Rp 20.000',
  'Rp 25.000', 'Rp 50.000/Tim', 'Rp 100.000/Tim',
];

const EMPTY_COMPETITION = (): CompetitionItem => ({
  id: `comp_${Date.now()}`,
  title: '',
  category: CATEGORY_OPTIONS[0],
  description: '',
  requirements: '',
  prizes: '',
  registrationStart: '',
  registrationEnd: '',
  maxParticipants: MAX_PARTICIPANTS_OPTIONS[2],
  fee: FEE_OPTIONS[0],
  iconName: 'Trophy',
  color: 'blue',
  isOpen: true,
  order: 0,
});

const CompetitionManager: React.FC<{ competitions: CompetitionItem[] }> = ({ competitions }) => {
  const [form, setForm] = useState<CompetitionItem>(EMPTY_COMPETITION());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (comp: CompetitionItem) => {
    setForm({ ...comp });
    setEditingId(comp.id);
    setMsg('');
    document.getElementById('comp-form-top')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setForm(EMPTY_COMPETITION());
    setEditingId(null);
    setMsg('');
  };

  const setF = <K extends keyof CompetitionItem>(key: K, val: CompetitionItem[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setMsg('Judul lomba wajib diisi.'); return; }
    setSaving(true);
    setMsg('');
    try {
      await storage.upsertCompetition({ ...form, id: editingId || form.id });
      setMsg(editingId ? 'Lomba berhasil diperbarui.' : 'Lomba berhasil ditambahkan.');
      cancelEdit();
    } catch {
      setMsg('Gagal menyimpan, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus lomba "${title}"?`)) return;
    await storage.deleteCompetition(id);
  };

  const PreviewIcon = (LucideIcons as Record<string, React.FC<{ size?: number; className?: string }>>)[form.iconName] ?? LucideIcons.Trophy;

  return (
    <div className="w-full space-y-3">
      {/* Form */}
      <div id="comp-form-top" className="border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy size={17} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
            {editingId ? 'Edit Lomba' : 'Tambah Lomba Baru'}
          </h2>
          {editingId && (
            <button onClick={cancelEdit} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
              <X size={14} /> Batal
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Judul + Kategori */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Judul Lomba *" value={form.title} onChange={(v) => setF('title', v)} />
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Kategori</span>
              <select
                value={form.category}
                onChange={(e) => setF('category', e.target.value)}
                className={googleInputClass}
              >
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {/* Deskripsi */}
          <Field label="Deskripsi" rows={3} value={form.description} onChange={(v) => setF('description', v)} />

          {/* Syarat + Hadiah */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Syarat Peserta (satu per baris)" rows={4} value={form.requirements} onChange={(v) => setF('requirements', v)} />
            <Field label="Hadiah (satu per baris)" rows={4} value={form.prizes} onChange={(v) => setF('prizes', v)} />
          </div>

          {/* Tanggal pendaftaran */}
          <div className="space-y-3 border border-slate-200 bg-[#f8fafd] p-4 dark:border-slate-800 dark:bg-[#111827]">
            <p className="text-xs font-black uppercase tracking-widest text-[#1a73e8] dark:text-[#8ab4f8]">Periode Pendaftaran</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tanggal Mulai</span>
                <input
                  type="date"
                  value={form.registrationStart}
                  onChange={(e) => setF('registrationStart', e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                  onKeyDown={(e) => e.preventDefault()}
                  lang="id-ID"
                  className={`${googleInputClass} dark:[color-scheme:dark]`}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tanggal Berakhir / Deadline</span>
                <input
                  type="date"
                  value={form.registrationEnd}
                  onChange={(e) => setF('registrationEnd', e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                  onKeyDown={(e) => e.preventDefault()}
                  min={form.registrationStart || undefined}
                  lang="id-ID"
                  className={`${googleInputClass} dark:[color-scheme:dark]`}
                />
              </label>
            </div>
            {form.registrationStart && form.registrationEnd && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Pendaftaran:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(form.registrationStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' '}&rarr;{' '}
                  {new Date(form.registrationEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            )}
          </div>

          {/* Maks. Peserta + Biaya */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Maks. Peserta</span>
              <select
                value={form.maxParticipants}
                onChange={(e) => setF('maxParticipants', e.target.value)}
                className={googleInputClass}
              >
                {MAX_PARTICIPANTS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Biaya Pendaftaran</span>
              <select
                value={form.fee}
                onChange={(e) => setF('fee', e.target.value)}
                className={googleInputClass}
              >
                {FEE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
          </div>

          {/* Ikon + Warna + Urutan */}
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Icon */}
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Ikon</span>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-[#e8f0fe] text-[#1a73e8] dark:border-slate-800 dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8] flex items-center justify-center shrink-0">
                  <PreviewIcon size={20} />
                </div>
                <select
                  value={form.iconName}
                  onChange={(e) => setF('iconName', e.target.value)}
                  className={googleInputClass}
                >
                  {ICON_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </label>

            {/* Warna */}
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Warna Aksen</span>
              <select
                value={form.color}
                onChange={(e) => setF('color', e.target.value)}
                className={googleInputClass}
              >
                {COLOR_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>

            {/* Urutan + Toggle */}
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Urutan Tampil</span>
                <select
                  value={String(form.order ?? 0)}
                  onChange={(e) => setF('order', Number(e.target.value))}
                  className={googleInputClass}
                >
                  {[0,1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n === 0 ? '0 (pertama)' : n}</option>)}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 border border-slate-200 px-3 py-3 transition-colors hover:bg-[#f8fafd] dark:border-slate-800 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setF('isOpen', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-m-blue"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pendaftaran Dibuka</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${form.isOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {form.isOpen ? 'Buka' : 'Tutup'}
                </span>
              </label>
            </div>
          </div>

          {msg && (
            <p className="border border-slate-200 bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{msg}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`${googlePrimaryButtonClass} w-full sm:w-auto`}
          >
            <Save size={16} />
            {saving ? 'Menyimpan...' : editingId ? 'Perbarui Lomba' : 'Simpan Lomba'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h2 className="font-black text-base text-slate-900 dark:text-white">{competitions.length} Lomba Terdaftar</h2>
        {competitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#0d1320]">
            <Trophy size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-black text-slate-500 dark:text-slate-400">Belum ada lomba ditambahkan</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {competitions.map((comp) => {
              const IconComp = (LucideIcons as Record<string, React.FC<{ size?: number; className?: string }>>)[comp.iconName] ?? LucideIcons.Trophy;
              return (
                <div key={comp.id} className="flex items-start gap-4 border border-slate-200 bg-white p-4 shadow-none transition-colors hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#0d1320] dark:hover:bg-[#111827]">
                  <div className="w-11 h-11 rounded-2xl border border-slate-200 bg-[#e8f0fe] text-[#1a73e8] dark:border-slate-800 dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8] flex items-center justify-center shrink-0">
                    <IconComp size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-900 dark:text-white">{comp.title}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comp.isOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {comp.isOpen ? 'Buka' : 'Tutup'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {comp.category} · {comp.fee}
                      {comp.registrationEnd
                        ? ` · Deadline: ${new Date(comp.registrationEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : ''}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => startEdit(comp)}
                        className="rounded-full bg-[#f1f3f4] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comp.id, comp.title)}
                        className="rounded-full bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 px-3 py-1.5 text-xs font-bold transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────
   Competition Registration Manager (Admin)
───────────────────────────────────────────────── */
const STATUS_LABELS: Record<CompetitionRegistration['status'], { label: string; cls: string }> = {
  pending:   { label: 'Pending',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  confirmed: { label: 'Diterima',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected:  { label: 'Ditolak',    cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const CompetitionRegistrationManager: React.FC<{
  registrations: CompetitionRegistration[];
  competitions: CompetitionItem[];
}> = ({ registrations, competitions }) => {
  const PAGE_SIZE = 10;

  // Active competition tab — default ke yang pertama ada pendaftarnya, atau semua
  const compTitles = Array.from(new Set(registrations.map((r) => r.competitionTitle)));
  const [activeComp, setActiveComp] = useState<string>('__all__');
  const [filterStatus, setFilterStatus] = useState<'semua' | CompetitionRegistration['status']>('semua');
  const [page, setPage] = useState(1);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Reset halaman ketika filter berubah
  const handleCompChange = (val: string) => { setActiveComp(val); setPage(1); };
  const handleStatusChange = (val: typeof filterStatus) => { setFilterStatus(val); setPage(1); };

  const filtered = registrations.filter((r) => {
    const matchComp = activeComp === '__all__' || r.competitionTitle === activeComp;
    const matchStatus = filterStatus === 'semua' || r.status === filterStatus;
    return matchComp && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pending = registrations.filter((r) => r.status === 'pending').length;

  const setStatus = async (id: string, status: CompetitionRegistration['status']) => {
    await storage.updateCompetitionRegistrationStatus(id, status);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus data pendaftar ini?')) return;
    await storage.deleteCompetitionRegistration(id);
  };

  // ── Download PDF rekap per lomba ──────────────────────────────────
  const downloadPdf = async (compTitle: string) => {
    const list = registrations.filter((r) => r.competitionTitle === compTitle);
    if (!list.length) return;
    setDownloadingPdf(compTitle);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = 210;
      const margin = 14;
      const colW = pageW - margin * 2;
      let y = margin;

      const addText = (text: string, x: number, yPos: number, opts: { size?: number; bold?: boolean; color?: [number,number,number] } = {}) => {
        pdf.setFontSize(opts.size ?? 10);
        pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        if (opts.color) pdf.setTextColor(...opts.color);
        else pdf.setTextColor(30, 30, 30);
        pdf.text(text, x, yPos);
      };

      // Header
      pdf.setFillColor(26, 115, 232);
      pdf.rect(0, 0, pageW, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rekap Pendaftar Lomba`, margin, 11);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(compTitle, margin, 20);
      pdf.setFontSize(8);
      pdf.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}  ·  Total: ${list.length} pendaftar`, margin, 26);
      y = 36;

      // Table header
      const cols = [
        { label: 'No',    w: 10 },
        { label: 'Nama',  w: 45 },
        { label: 'No HP', w: 35 },
        { label: 'Usia',  w: 15 },
        { label: 'Alamat / RT', w: 45 },
        { label: 'Status', w: 22 },
        { label: 'Tgl Daftar', w: 28 },
      ];

      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y - 4, colW, 8, 'F');
      pdf.setDrawColor(200, 210, 220);
      pdf.rect(margin, y - 4, colW, 8, 'S');

      let cx = margin;
      cols.forEach((col) => {
        addText(col.label, cx + 1, y + 0.5, { size: 8, bold: true, color: [60, 80, 110] });
        cx += col.w;
      });
      y += 7;

      // Rows
      list.forEach((reg, idx) => {
        if (y > 270) {
          pdf.addPage();
          y = margin;
        }
        const rowBg = idx % 2 === 0;
        if (rowBg) {
          pdf.setFillColor(249, 250, 252);
          pdf.rect(margin, y - 4, colW, 8, 'F');
        }
        pdf.setDrawColor(220, 228, 236);
        pdf.line(margin, y + 4, margin + colW, y + 4);

        const statusColor: [number, number, number] =
          reg.status === 'confirmed' ? [22, 163, 74] :
          reg.status === 'rejected'  ? [220, 38, 38] : [180, 120, 0];

        cx = margin;
        const cells: { text: string; color?: [number,number,number] }[] = [
          { text: String(idx + 1) },
          { text: reg.name },
          { text: reg.phone },
          { text: reg.age || '—' },
          { text: reg.address || '—' },
          { text: reg.status === 'confirmed' ? 'Diterima' : reg.status === 'rejected' ? 'Ditolak' : 'Pending', color: statusColor },
          { text: reg.date.split(',')[0] ?? reg.date },
        ];
        cells.forEach((cell, ci) => {
          const text = pdf.splitTextToSize(cell.text, cols[ci].w - 2)[0] ?? '';
          addText(text, cx + 1, y + 0.5, { size: 8, color: cell.color });
          cx += cols[ci].w;
        });
        y += 8;
      });

      // Footer line
      y += 4;
      pdf.setDrawColor(200, 210, 220);
      pdf.line(margin, y, margin + colW, y);
      y += 5;
      addText(`Total pendaftar: ${list.length}  ·  Diterima: ${list.filter(r => r.status === 'confirmed').length}  ·  Pending: ${list.filter(r => r.status === 'pending').length}  ·  Ditolak: ${list.filter(r => r.status === 'rejected').length}`, margin, y, { size: 8, bold: true, color: [80, 100, 130] });

      const safeName = compTitle.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Rekap_${safeName}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat PDF, coba lagi.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Stats global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: registrations.length, cls: 'text-[#1a73e8] dark:text-[#8ab4f8]', bar: 'bg-[#1a73e8]' },
          { label: 'Pending',  value: registrations.filter(r => r.status === 'pending').length, cls: 'text-[#f29900] dark:text-[#fdd663]', bar: 'bg-[#fbbc04]' },
          { label: 'Diterima', value: registrations.filter(r => r.status === 'confirmed').length, cls: 'text-[#34a853] dark:text-[#81c995]', bar: 'bg-[#34a853]' },
          { label: 'Ditolak',  value: registrations.filter(r => r.status === 'rejected').length, cls: 'text-[#ea4335] dark:text-[#f28b82]', bar: 'bg-[#ea4335]' },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden border border-slate-200 bg-white p-4 text-center shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
            <div className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1 text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Slide tab per lomba */}
      <div className="border border-slate-200 bg-white p-3 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => handleCompChange('__all__')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeComp === '__all__' ? 'bg-[#1a73e8] text-white shadow-md shadow-[#1a73e8]/20' : 'bg-[#f1f3f4] dark:bg-slate-800 border border-transparent text-slate-600 dark:text-slate-300 hover:bg-[#e8f0fe] hover:text-[#1a73e8] dark:hover:bg-[#1a73e8]/20 dark:hover:text-[#8ab4f8]'}`}
          >
            Semua ({registrations.length})
          </button>
          {compTitles.map((title) => {
            const count = registrations.filter(r => r.competitionTitle === title).length;
            const pend  = registrations.filter(r => r.competitionTitle === title && r.status === 'pending').length;
            return (
              <button
                key={title}
                onClick={() => handleCompChange(title)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeComp === title ? 'bg-[#1a73e8] text-white shadow-md shadow-[#1a73e8]/20' : 'bg-[#f1f3f4] dark:bg-slate-800 border border-transparent text-slate-600 dark:text-slate-300 hover:bg-[#e8f0fe] hover:text-[#1a73e8] dark:hover:bg-[#1a73e8]/20 dark:hover:text-[#8ab4f8]'}`}
              >
                {title} ({count})
                {pend > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-black ${activeComp === title ? 'bg-white/25 text-white' : 'bg-amber-400 text-amber-900'}`}>{pend}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: status filter + download PDF */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => handleStatusChange(e.target.value as typeof filterStatus)}
            className="rounded-full border border-slate-200 bg-[#f8fafd] px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-all focus:border-[#1a73e8] focus:ring-4 focus:ring-[#1a73e8]/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-white"
          >
            <option value="semua">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Diterima</option>
            <option value="rejected">Ditolak</option>
          </select>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{filtered.length} peserta</span>
        </div>

        {/* Download PDF — muncul hanya kalau filter satu lomba */}
        {activeComp !== '__all__' && (
          <button
            onClick={() => downloadPdf(activeComp)}
            disabled={downloadingPdf !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e6f4ea] dark:bg-[#34a853]/10 hover:bg-emerald-100 dark:hover:bg-[#34a853]/20 text-[#137333] dark:text-[#81c995] border border-emerald-200 dark:border-emerald-800 text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Download size={15} className={downloadingPdf ? 'animate-bounce' : ''} />
            {downloadingPdf ? 'Membuat PDF...' : `Unduh Rekap PDF`}
          </button>
        )}

        {/* Download semua lomba — satu PDF per tombol */}
        {activeComp === '__all__' && compTitles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {compTitles.map((title) => (
              <button
                key={title}
                onClick={() => downloadPdf(title)}
                disabled={downloadingPdf !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#f1f3f4] dark:bg-slate-800 hover:bg-[#e6f4ea] dark:hover:bg-[#34a853]/10 text-slate-600 dark:text-slate-300 hover:text-[#137333] dark:hover:text-[#81c995] border border-transparent text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                PDF {title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#0d1320]">
          <ClipboardList size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-black text-slate-500 dark:text-slate-400">Belum ada pendaftar</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
          {paginated.map((reg, idx) => {
            const no = (page - 1) * PAGE_SIZE + idx + 1;
            const isLast = idx === paginated.length - 1;

            // Avatar background — hash sederhana dari nama
            const avatarBg = [
              '#1a73e8','#34a853','#ea4335','#fbbc04',
              '#9c27b0','#00acc1','#ff7043','#5c6bc0',
            ][(reg.name.charCodeAt(0) || 65) % 8];

            return (
              <div
                key={reg.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-[#f8fafd] dark:hover:bg-white/[0.03] transition-colors duration-150 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/60' : ''}`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
                  style={{ background: avatarBg }}
                >
                  {reg.name.slice(0, 1).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{reg.name}</span>
                    {activeComp === '__all__' && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">{reg.competitionTitle}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{reg.phone}</span>
                    {reg.age && <span className="text-xs text-slate-400 dark:text-slate-500">{reg.age} thn</span>}
                    {reg.address && <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{reg.address}</span>}
                    {reg.notes && <span className="text-xs text-slate-400 dark:text-slate-500 italic truncate max-w-[120px]">"{reg.notes}"</span>}
                  </div>
                  <div className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">{reg.date}</div>
                </div>

                {/* Status chip */}
                <div className="shrink-0">
                  {reg.status === 'confirmed' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#34a853] bg-[#e6f4ea] dark:bg-[#34a853]/10 dark:text-[#81c995] px-2.5 py-1 rounded-full">
                      <Check size={11} strokeWidth={2.5} /> Diterima
                    </span>
                  )}
                  {reg.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#ea4335] bg-[#fce8e6] dark:bg-[#ea4335]/10 dark:text-[#f28b82] px-2.5 py-1 rounded-full">
                      <X size={11} strokeWidth={2.5} /> Ditolak
                    </span>
                  )}
                  {reg.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#f29900] bg-[#fef7e0] dark:bg-[#fbbc04]/10 dark:text-[#fdd663] px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f29900] dark:bg-[#fdd663]" /> Pending
                    </span>
                  )}
                </div>

                {/* Aksi */}
                <div className="shrink-0 flex items-center gap-0.5">
                  {/* Tombol Terima — hanya muncul jika belum confirmed */}
                  {reg.status !== 'confirmed' && (
                    <button
                      onClick={() => setStatus(reg.id, 'confirmed')}
                      title="Terima"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#34a853] hover:bg-[#e6f4ea] dark:hover:bg-[#34a853]/10 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {/* Tombol Tolak — hanya muncul jika belum rejected */}
                  {reg.status !== 'rejected' && (
                    <button
                      onClick={() => setStatus(reg.id, 'rejected')}
                      title="Tolak"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#ea4335] hover:bg-[#fce8e6] dark:hover:bg-[#ea4335]/10 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {/* Tombol Hapus */}
                  <button
                    onClick={() => handleDelete(reg.id)}
                    title="Hapus"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-[#ea4335] hover:bg-[#fce8e6] dark:hover:bg-[#ea4335]/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Halaman <span className="font-bold text-slate-700 dark:text-slate-300">{page}</span> dari <span className="font-bold">{totalPages}</span>
            {' · '}Menampilkan {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#e8f0fe] hover:text-[#1a73e8] dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="h-8 w-8 flex items-center justify-center text-slate-400 text-sm">…</span>
                  : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`h-8 w-8 rounded-full text-sm font-bold transition-colors ${page === p ? 'bg-[#1a73e8] text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#e8f0fe] hover:text-[#1a73e8] dark:hover:bg-slate-700'}`}
                    >
                      {p}
                    </button>
                  )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#e8f0fe] hover:text-[#1a73e8] dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Header = ({ title, action, saving }: { title: string; action: () => void; saving: boolean }) => (
  <div className="flex flex-col gap-4 border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320] sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#1a73e8] dark:text-[#8ab4f8] mb-1">Admin</p>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Perubahan langsung tersimpan ke Firebase.</p>
    </div>
    <button
      onClick={action}
      className={`${googlePrimaryButtonClass} w-fit`}
    >
      <Save size={16} />
      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
    </button>
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4 border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
      <div className="h-2 w-2 rounded-full bg-[#1a73e8]" />
      <h2 className="font-black text-base text-slate-900 dark:text-white">{title}</h2>
    </div>
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
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-end border border-slate-200 bg-white p-3 shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
        <button
          onClick={onAdd}
          className={`${googlePrimaryButtonClass} w-fit`}
        >
          <Plus size={16} />
          Tambah Data
        </button>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white py-20 text-center shadow-none dark:border-slate-800 dark:bg-[#0d1320]">
          <div className="h-16 w-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8] flex items-center justify-center mb-4">
            <Plus size={28} />
          </div>
          <p className="font-black text-lg text-slate-700 dark:text-slate-300">Belum ada data</p>
          <p className="text-sm text-slate-400 mt-1">Klik tombol "Tambah Data" untuk memulai.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => {
            const image = 'image' in item ? item.image : 'url' in item ? item.url : 'avatar' in item ? item.avatar : '';
            const title = 'title' in item ? item.title : item.name;
            const subtitle = 'category' in item ? item.category : 'role' in item ? item.role : '';
            const description = 'description' in item ? item.description : 'quote' in item ? item.quote : '';

            return (
              <article key={item.id} className="group overflow-hidden border border-slate-200 bg-white shadow-none transition-colors duration-200 hover:bg-[#f8fafd] dark:border-slate-800 dark:bg-[#0d1320] dark:hover:bg-[#111827]">
                {image && (
                  <div className="relative overflow-hidden h-44 bg-slate-100 dark:bg-slate-800">
                    <img src={image} alt={title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                )}
                <div className="p-5">
                  {subtitle && (
                    <span className="inline-block rounded-lg bg-m-blue/10 dark:bg-m-blue/20 text-m-blue dark:text-[#7fcfff] text-xs font-bold px-2.5 py-1 mb-2">
                      {subtitle}
                    </span>
                  )}
                  <h3 className="font-black text-base text-slate-900 dark:text-white leading-snug">{title || 'Tanpa judul'}</h3>
                  {description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">{description}</p>
                  )}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onEdit(item)}
                      className="flex-1 rounded-full bg-[#f1f3f4] px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-[#1f2937] dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="rounded-full bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-2 transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
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

  const titleMap: Record<EditableType, string> = {
    team: 'Data Anggota',
    programs: 'Program Kerja',
    gallery: 'Foto Galeri',
    testimonials: 'Testimoni',
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={saveEditing}
        className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#111827] sm:rounded-[28px] rounded-t-[28px] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#111827]/95 backdrop-blur px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Form</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{titleMap[editing.type]}</h2>
          </div>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
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

          <button className={`${googlePrimaryButtonClass} w-full py-3`}>
            <Save size={16} />
            {saving ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
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
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={onSave}
        className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#111827] sm:rounded-[28px] rounded-t-[28px] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#111827]/95 backdrop-blur px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-m-blue dark:text-[#7fcfff]">Moderasi</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Edit Ulasan</h2>
          </div>
          <button
            type="button"
            onClick={() => setReview(null)}
            className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Nama" value={review.name} onChange={(value) => updateReview({ name: value })} />
          <Field label="Peran / Jabatan" value={review.role} onChange={(value) => updateReview({ role: value })} />
          <Field label="Isi Ulasan" rows={5} value={review.quote} onChange={(value) => updateReview({ quote: value })} />
          <ImageField label="Avatar" value={review.avatar} onChange={(value) => updateReview({ avatar: value })} />

          <button className={`${googlePrimaryButtonClass} w-full py-3`}>
            <Save size={16} />
            {saving ? 'Menyimpan...' : 'Simpan Ulasan'}
          </button>
        </div>
      </form>
    </div>
  );
};
