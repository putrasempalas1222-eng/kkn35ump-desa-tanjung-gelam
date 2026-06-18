import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, UsersRound } from 'lucide-react';
import { storage } from '../services/storage';
import { EventContent } from '../types';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: 'upcoming' | 'ongoing' | 'finished' | 'invalid';
};

const getTimeLeft = (eventDate: Date): TimeLeft => {
  if (Number.isNaN(eventDate.getTime())) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      status: 'invalid',
    };
  }

  const now = Date.now();
  const difference = eventDate.getTime() - now;
  const eventDuration = 1000 * 60 * 60 * 8;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      status: now - eventDate.getTime() <= eventDuration ? 'ongoing' : 'finished',
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    status: 'upcoming',
  };
};

const getEventStatusText = (status: TimeLeft['status']) => {
  if (status === 'upcoming') return 'Menuju Hari Acara';
  if (status === 'ongoing') return 'Event sedang berlangsung';
  if (status === 'finished') return 'Event telah selesai';
  return 'Tanggal belum diatur';
};

const formatEventDate = (eventDate: Date) => {
  if (Number.isNaN(eventDate.getTime())) return 'Tanggal belum diatur';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    timeZoneName: 'short',
  }).format(eventDate);
};

export const Event: React.FC = () => {
  const [content, setContent] = useState<EventContent>(storage.defaults.eventContent);
  const eventDate = useMemo(() => new Date(content.date), [content.date]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(new Date(storage.defaults.eventContent.date)));
  const eventImage = content.image.trim();

  useEffect(() => {
    return storage.subscribeEventContent(setContent);
  }, []);

  useEffect(() => {
    setTimeLeft(getTimeLeft(eventDate));
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(eventDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [eventDate]);

  const countdownItems = useMemo(
    () => [
      { label: 'Hari', value: timeLeft.days },
      { label: 'Jam', value: timeLeft.hours },
      { label: 'Menit', value: timeLeft.minutes },
      { label: 'Detik', value: timeLeft.seconds },
    ],
    [timeLeft]
  );

  if (!content.title && !content.date && !content.description) {
    return null;
  }

  return (
    <section id="event" className="py-20 bg-white dark:bg-slate-900 overflow-hidden relative">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-m-blue/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative min-h-[460px] rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200/20 dark:border-slate-800/20"
          >
            {eventImage ? (
              <img
                src={eventImage}
                alt="Event KKN Kelompok 35"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <img src="/report-assets/logokknv1.png" alt="Logo KKN 35" className="h-32 w-32 object-contain opacity-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/55 to-m-blue/70"></div>
            <div className="relative z-10 h-full p-8 md:p-10 flex flex-col justify-between text-white">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-md border border-white/20">
                  <CalendarDays size={16} />
                  Event Terdekat
                </span>
                <h2 className="mt-8 text-3xl md:text-5xl font-bold leading-tight">{content.title}</h2>
                <p className="mt-5 max-w-xl text-base md:text-lg text-white/80 leading-relaxed font-medium">
                  {content.description}
                </p>
              </div>

              <div className="mt-10 grid sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur-md border border-white/15">
                  <Clock size={22} className="text-m-green shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">{formatEventDate(eventDate)}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur-md border border-white/15">
                  <MapPin size={22} className="text-m-green shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">{content.location}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur-md border border-white/15">
                  <UsersRound size={22} className="text-m-green shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">{content.audience}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/50 dark:border-slate-800/80 shadow-xl flex flex-col justify-center"
          >
            <div className="mb-8">
              <span className="text-xs font-black uppercase tracking-wider text-m-blue dark:text-m-green">
                Countdown Event
              </span>
              <h3 className="mt-3 text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {getEventStatusText(timeLeft.status)}
              </h3>
              <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Siapkan diri untuk ikut hadir dan merayakan hasil program kerja bersama masyarakat desa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {countdownItems.map((item) => (
                <div
                  key={item.label}
                  className="min-h-[120px] rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-m-blue/30 dark:hover:border-m-blue/30 hover:scale-[1.02] transition-all duration-300 group"
                >
                  <span className="font-mono text-4xl md:text-5xl font-black text-slate-900 dark:text-white tabular-nums group-hover:scale-105 transition-transform duration-300 select-none">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-550 select-none">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <a
              href="#contact"
              className="btn-glass btn-glass-blue mt-8 inline-flex items-center justify-center rounded-full px-6 py-4 text-white font-extrabold uppercase tracking-widest text-xs border border-white/10 shadow-lg hover:shadow-xl"
            >
              Hubungi Panitia
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
