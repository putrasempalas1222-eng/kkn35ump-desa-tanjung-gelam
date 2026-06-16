import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  Gift,
  ChevronDown,
  Medal,
  Star,
  X,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  User,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { storage } from '../services/storage';
import { CompetitionItem, CompetitionRegistration } from '../types';

const ACCENT_COLORS: Record<string, { text: string; badge: string; btn: string; glow: string }> = {
  pink:   { text: 'text-pink-600 dark:text-pink-400',   badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',   btn: 'from-pink-500 to-rose-500',   glow: 'rgba(236,72,153,0.30)' },
  blue:   { text: 'text-blue-600 dark:text-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   btn: 'from-blue-500 to-indigo-600',  glow: 'rgba(59,130,246,0.30)' },
  violet: { text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', btn: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.30)' },
  green:  { text: 'text-green-600 dark:text-green-400',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',  btn: 'from-green-500 to-emerald-600', glow: 'rgba(16,185,129,0.30)' },
  amber:  { text: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',  btn: 'from-amber-500 to-orange-500',  glow: 'rgba(245,158,11,0.30)' },
  default:{ text: 'text-m-blue dark:text-blue-400',      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',      btn: 'from-m-blue to-indigo-600',   glow: 'rgba(26,115,232,0.30)' },
};
const getAccent = (color: string) => ACCENT_COLORS[color] ?? ACCENT_COLORS.default;

/** Ekstrak angka dari string seperti "30 Peserta", "16 Tim", "Tidak dibatasi" */
const parseMaxParticipants = (val: string): number => {
  if (!val || val.toLowerCase().includes('tidak')) return Infinity;
  const match = val.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
};

/** Hitung pendaftar aktif (pending + confirmed) untuk satu lomba */
const countActive = (regs: CompetitionRegistration[], compId: string) =>
  regs.filter((r) => r.competitionId === compId && r.status !== 'rejected').length;

const sanitizeName = (value: string) =>
  value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'.-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 80);
const sanitizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 14);
const sanitizeAge = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (!digits) return '';
  return String(Math.min(100, Math.max(1, Number(digits))));
};
const sanitizeShortText = (value: string, maxLength = 120) =>
  value.replace(/[<>]/g, '').replace(/\s{2,}/g, ' ').slice(0, maxLength);

/* ────────────────────────────────────────────────
   Registration Modal
──────────────────────────────────────────────── */
interface RegForm { name: string; phone: string; age: string; address: string; notes: string }
const EMPTY_FORM: RegForm = { name: '', phone: '', age: '', address: '', notes: '' };

const RegistrationModal: React.FC<{
  comp: CompetitionItem;
  registrationCount: number;
  maxCount: number;
  existingRegistrations: CompetitionRegistration[];
  onClose: () => void;
}> = ({ comp, registrationCount, maxCount, existingRegistrations, onClose }) => {
  const [form, setForm] = useState<RegForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isFull = registrationCount >= maxCount;

  // Cek duplikat nama secara real-time (saat user ketik)
  const isDuplicateName = useMemo(() => {
    const trimmed = form.name.trim().toLowerCase();
    if (!trimmed) return false;
    return existingRegistrations.some(
      (r) =>
        r.competitionId === comp.id &&
        r.name.trim().toLowerCase() === trimmed &&
        r.status !== 'rejected'
    );
  }, [form.name, existingRegistrations, comp.id]);

  const setField = (key: keyof RegForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeName(form.name).trim();
    const cleanPhone = sanitizePhone(form.phone);
    const cleanAge = sanitizeAge(form.age);
    const cleanAddress = sanitizeShortText(form.address, 120).trim();
    const cleanNotes = sanitizeShortText(form.notes, 160).trim();

    if (isFull) { setErrorMsg('Kuota pendaftaran sudah penuh.'); return; }
    if (!cleanName || !cleanPhone) {
      setErrorMsg('Nama lengkap dan nomor HP wajib diisi.');
      return;
    }
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]{3,80}$/.test(cleanName)) {
      setErrorMsg('Nama lengkap hanya boleh berisi huruf dan minimal 3 karakter.');
      return;
    }
    if (!/^(08|628)\d{8,12}$/.test(cleanPhone)) {
      setErrorMsg('Nomor HP harus angka saja, diawali 08 atau 628, minimal 10 digit dan maksimal 14 digit.');
      return;
    }
    if (cleanAge && (Number(cleanAge) < 1 || Number(cleanAge) > 100)) {
      setErrorMsg('Usia harus berada di antara 1 sampai 100.');
      return;
    }
    if (isDuplicateName) {
      setErrorMsg(`Nama "${cleanName}" sudah terdaftar di lomba ini.`);
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await storage.addCompetitionRegistration({
        competitionId: comp.id,
        competitionTitle: comp.title,
        name: cleanName,
        phone: cleanPhone,
        age: cleanAge,
        address: cleanAddress,
        notes: cleanNotes,
      });
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Pendaftaran gagal, coba lagi.');
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const accent = getAccent(comp.color);
  const IconComp = (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[comp.iconName] ?? Icons.Trophy;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-modal-title"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${accent.btn} p-6 text-white`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <IconComp size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Pendaftaran Lomba</p>
                <h2 id="reg-modal-title" className="text-xl font-black leading-tight">{comp.title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {comp.registrationEnd && (
              <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                <Calendar size={11} /> Deadline: {new Date(comp.registrationEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
              <Gift size={11} /> {comp.fee}
            </span>
            {maxCount < Infinity && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isFull ? 'bg-red-500/40' : 'bg-white/20'}`}>
                <Users size={11} /> {registrationCount}/{maxCount} Peserta
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-4 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Pendaftaran Berhasil!</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Terima kasih <strong>{form.name}</strong>, pendaftaran untuk <strong>{comp.title}</strong> telah kami terima.
                  Panitia akan menghubungi kamu via nomor HP yang kamu berikan.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 w-full rounded-xl py-3 font-bold text-white text-sm"
                style={{ background: `linear-gradient(135deg, #1a73e8, #1557b0)` }}
              >
                Tutup
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama */}
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <User size={12} /> Nama Lengkap <span className="text-red-400">*</span>
                </span>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name')(sanitizeName(e.target.value))}
                  minLength={3}
                  maxLength={80}
                  pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]{3,80}"
                  placeholder="Masukkan nama lengkap"
                  title="Nama lengkap hanya boleh berisi huruf, spasi, titik, apostrof, atau tanda hubung."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 transition-all"
                />
              </label>

              {/* No HP */}
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <Phone size={12} /> Nomor HP / WhatsApp <span className="text-red-400">*</span>
                </span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setField('phone')(sanitizePhone(e.target.value))}
                  minLength={10}
                  maxLength={14}
                  pattern="(08|628)\d{8,12}"
                  placeholder="Contoh: 081234567890"
                  title="Nomor HP hanya boleh angka, diawali 08 atau 628, minimal 10 digit dan maksimal 14 digit."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 transition-all"
                />
              </label>

              {/* Usia */}
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <Calendar size={12} /> Usia
                </span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.age}
                  onChange={(e) => setField('age')(sanitizeAge(e.target.value))}
                  placeholder="Usia peserta"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 transition-all"
                />
              </label>

              {/* Alamat */}
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <MapPin size={12} /> Alamat / RT
                </span>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField('address')(sanitizeShortText(e.target.value, 120))}
                  maxLength={120}
                  placeholder="Contoh: RT 03 Desa Tanjung Gelam"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 transition-all"
                />
              </label>

              {/* Catatan */}
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <FileText size={12} /> Catatan (opsional)
                </span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField('notes')(sanitizeShortText(e.target.value, 160))}
                  maxLength={160}
                  placeholder="Misal: nama tim, kategori usia, dll."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-m-blue focus:ring-4 focus:ring-m-blue/10 transition-all resize-none"
                />
              </label>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-300">
                  <AlertCircle size={15} />
                  {errorMsg}
                </div>
              )}

              {/* Kuota penuh banner */}
              {isFull ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Lock size={28} className="text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-800 dark:text-white">Kuota Penuh</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Pendaftaran lomba ini sudah mencapai batas {maxCount} peserta.
                    </p>
                  </div>
                  <button onClick={onClose} className="mt-1 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm">
                    Tutup
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full rounded-xl py-3.5 font-bold text-white text-sm flex items-center justify-center gap-2 bg-gradient-to-r ${accent.btn} shadow-md disabled:opacity-60 transition-all active:scale-[0.98]`}
                  style={{ boxShadow: `0 4px 18px ${accent.glow}` }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                  {submitting ? 'Mendaftar...' : 'Kirim Pendaftaran'}
                </button>
              )}

              {!isFull && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  Data yang kamu isi hanya digunakan untuk keperluan pendaftaran lomba.
                </p>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ────────────────────────────────────────────────
   Competition Card
──────────────────────────────────────────────── */
const CompetitionCard: React.FC<{
  comp: CompetitionItem;
  index: number;
  registrationCount: number;
  maxCount: number;
  onRegister: (comp: CompetitionItem) => void;
}> = ({ comp, index, registrationCount, maxCount, onRegister }) => {
  const [expanded, setExpanded] = useState(false);
  const accent = getAccent(comp.color);
  const IconComp = (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[comp.iconName] ?? Icons.Trophy;
  const requirements = comp.requirements.split('\n').filter(Boolean);
  const prizes = comp.prizes.split('\n').filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="relative rounded-[1.5rem] overflow-hidden border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
    >
      {/* subtle top gradient based on color */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent.btn}`} />

      <div className="relative p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 ${accent.text} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
            <IconComp size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${accent.badge} mb-1.5`}>
              {comp.category}
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{comp.title}</h3>
          </div>
          {!comp.isOpen && (
            <span className="shrink-0 text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-700">
              Tutup
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{comp.description}</p>

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(comp.registrationStart || comp.registrationEnd) && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/60 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-600">
              <Calendar size={12} />
              {comp.registrationStart && comp.registrationEnd
                ? `${new Date(comp.registrationStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${new Date(comp.registrationEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : comp.registrationEnd
                  ? `Deadline: ${new Date(comp.registrationEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : `Mulai: ${new Date(comp.registrationStart!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
              }
            </span>
          )}
          {comp.maxParticipants && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/60 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-600">
              <Users size={12} /> {comp.maxParticipants}
            </span>
          )}
          {comp.fee && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${comp.fee.toLowerCase() === 'gratis' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800'}`}>
              <Gift size={12} /> {comp.fee}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        {(requirements.length > 0 || prizes.length > 0) && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-expanded={expanded}
          >
            Lihat Detail
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.span>
          </button>
        )}

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {requirements.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-100 dark:border-slate-600/50">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Syarat</p>
                    <ul className="space-y-1.5">
                      {requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Star size={11} className="mt-1 shrink-0 text-m-blue" fill="currentColor" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {prizes.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-100 dark:border-slate-600/50">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Hadiah</p>
                    <ul className="space-y-1.5">
                      {prizes.map((prize, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Medal size={13} className={`mt-0.5 shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                          {prize}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <div className="mt-auto pt-5">
          <button
            disabled={!comp.isOpen}
            onClick={() => comp.isOpen && onRegister(comp)}
            className={`w-full rounded-xl py-3 px-5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] bg-gradient-to-r ${accent.btn} ${!comp.isOpen ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg'}`}
            style={comp.isOpen ? { boxShadow: `0 4px 18px ${accent.glow}` } : undefined}
            aria-label={comp.isOpen ? `Daftar ${comp.title}` : `${comp.title} sudah tutup`}
          >
            <Trophy size={15} />
            {comp.isOpen ? 'Daftar Sekarang' : 'Pendaftaran Ditutup'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────
   Main Section
──────────────────────────────────────────────── */
export const Competition: React.FC = () => {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [registrations, setRegistrations] = useState<CompetitionRegistration[]>([]);
  const [filter, setFilter] = useState('Semua');
  const [registering, setRegistering] = useState<CompetitionItem | null>(null);

  useEffect(() => {
    return storage.subscribeCompetitions(setCompetitions);
  }, []);

  useEffect(() => {
    return storage.subscribeCompetitionRegistrations(setRegistrations);
  }, []);

  const categories = ['Semua', ...Array.from(new Set(competitions.map((c) => c.category)))];
  const filtered = filter === 'Semua' ? competitions : competitions.filter((c) => c.category === filter);

  return (
    <>
      <section id="competition" className="py-20 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-m-blue/20 bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-m-blue dark:text-blue-400 mb-4">
              <Trophy size={13} />
              Perlombaan
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Daftar Perlombaan <span className="text-m-blue">KKN 35</span>
            </h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-5" />
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
              Ikuti berbagai lomba seru yang diadakan KKN Kelompok 35 UMP. Terbuka untuk seluruh warga!
            </p>
          </motion.div>

          {/* Filter */}
          {categories.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-2 mb-10"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    filter === cat
                      ? 'bg-m-blue text-white shadow-md shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-m-blue hover:text-m-blue'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((comp, idx) => {
                const maxCount = parseMaxParticipants(comp.maxParticipants);
                const registrationCount = countActive(registrations, comp.id);

                return (
                  <CompetitionCard
                    key={comp.id}
                    comp={comp}
                    index={idx}
                    registrationCount={registrationCount}
                    maxCount={maxCount}
                    onRegister={setRegistering}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {/* Empty state saat belum ada lomba dari admin */}
          {competitions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Trophy size={36} className="text-m-blue dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Segera Hadir!</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Daftar perlombaan sedang disiapkan oleh panitia. Pantau terus website ini ya!
                </p>
              </div>
              <a href="#contact" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-m-blue text-white text-sm font-bold hover:bg-m-blue-dark transition-colors shadow-md shadow-blue-500/25">
                Hubungi Panitia
              </a>
            </motion.div>
          )}

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            Pertanyaan? Hubungi panitia via{' '}
            <a href="#contact" className="font-semibold text-m-blue dark:text-blue-400 hover:underline">
              halaman Kontak
            </a>
            .
          </motion.p>
        </div>
      </section>

      {/* Registration Modal */}
      <AnimatePresence>
        {registering && (() => {
          const maxCount = parseMaxParticipants(registering.maxParticipants);
          const registrationCount = countActive(registrations, registering.id);

          return (
            <RegistrationModal
              comp={registering}
              registrationCount={registrationCount}
              maxCount={maxCount}
              existingRegistrations={registrations}
              onClose={() => setRegistering(null)}
            />
          );
        })()}
      </AnimatePresence>
    </>
  );
};
