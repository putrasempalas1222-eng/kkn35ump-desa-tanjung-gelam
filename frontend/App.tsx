import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { VillageProfile } from './components/VillageProfile';
import { Team } from './components/Team';
import { Programs } from './components/Programs';
import { Event } from './components/Event';
import { Gallery } from './components/Gallery';
import { Stats } from './components/Stats';
import { Video } from './components/Video';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminDashboard } from './components/AdminDashboard';
import { storage } from './services/storage';
import { SiteContent } from './types';

const formatSchedule = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum diatur';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    timeZoneName: 'short',
  }).format(date);
};

const getPublicGateStatus = (content: SiteContent, now: number) => {
  if (!content.maintenanceEnabled) return null;

  const start = content.maintenanceStart ? new Date(content.maintenanceStart).getTime() : NaN;
  const end = content.maintenanceEnd ? new Date(content.maintenanceEnd).getTime() : NaN;

  if (!Number.isNaN(start) && now < start) return 'not-started';
  if (!Number.isNaN(end) && now > end) return null;

  return 'maintenance';
};

const StatusPage = ({ content, status }: { content: SiteContent; status: 'maintenance' | 'not-started' }) => {
  const title = status === 'not-started' ? 'Website belum dimulai' : content.maintenanceTitle || 'Website sedang maintenance';
  const message =
    status === 'not-started'
      ? 'Website akan dibuka sesuai jadwal yang sudah ditentukan.'
      : content.maintenanceMessage || 'Silakan kembali lagi beberapa saat lagi.';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050814] text-white flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-m-blue/30 blur-3xl"></div>
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-m-green/20 blur-3xl"></div>
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="absolute inset-x-10 -top-8 h-20 rounded-full bg-white/20 blur-3xl"></div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/14 bg-white/[0.08] shadow-2xl backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-white/[0.06] to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

          <div className="relative grid lg:grid-cols-[0.9fr_1.1fr] gap-0">
            <div className="min-h-[320px] p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/80">
                  <span className="h-2 w-2 rounded-full bg-m-green shadow-[0_0_18px_rgba(52,168,83,0.9)]"></span>
                  {status === 'not-started' ? 'Belum Dibuka' : 'Maintenance'}
                </div>

                <div className="mt-10 h-28 w-28 rounded-[28px] bg-gradient-to-br from-white/22 to-white/5 border border-white/16 p-3 shadow-2xl">
                  <div className="h-full w-full rounded-[22px] bg-m-blue flex items-center justify-center text-4xl font-black shadow-[0_20px_60px_rgba(26,115,232,0.45)]">
                    35
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <p className="text-sm font-bold text-white/55">KKN Kelompok 35 UMP</p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Sistem sedang disiapkan agar pengalaman akses website tetap lancar dan rapi.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <h1 className="text-4xl md:text-6xl font-black leading-[1.02] tracking-normal">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-base md:text-lg leading-relaxed text-white/72">{message}</p>

              <div className="mt-10 grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/12 bg-black/18 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">Dibuka</p>
                  <p className="mt-3 text-base font-bold leading-snug">{formatSchedule(content.maintenanceStart)}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-black/18 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">Selesai</p>
                  <p className="mt-3 text-base font-bold leading-snug">{formatSchedule(content.maintenanceEnd)}</p>
                </div>
              </div>

              <div className="mt-8 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-m-blue via-m-green to-g-yellow animate-pulse"></div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <a
                  href="#admin"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-black text-slate-950 hover:bg-slate-100"
                >
                  Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'public' | 'admin'>('public');
  const [siteContent, setSiteContent] = useState<SiteContent>(storage.defaults.siteContent);
  const [now, setNow] = useState(Date.now());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Initialize storage with default constants if empty
    storage.init().catch((error) => {
      console.error('Firebase seed failed:', error);
    });

    // Subscribe to auth changes to know if user is logged in
    const unsubscribeAuth = storage.onAuthChange((user) => {
      setIsLoggedIn(!!user);
    });

    // Check system preference or local storage for dark mode
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    // Check hash for direct admin access
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setView('admin');
      } else {
        setView('public');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load

    // Simulate loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    const clock = window.setInterval(() => setNow(Date.now()), 30000);
    const unsubscribeSite = storage.subscribeSiteContent(setSiteContent);

    return () => {
      clearTimeout(timer);
      clearInterval(clock);
      unsubscribeSite();
      unsubscribeAuth();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (loading) {
    return (
      <div
        className="bg-white dark:bg-slate-950 z-[100]"
        style={{
          position: 'fixed',
          inset: 0,
          minHeight: '100dvh',
          width: '100vw',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div className="text-center px-6">
          <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white leading-none">KKN 35</h2>
          <div className="mt-8 mx-auto h-1 w-36 rounded-full bg-slate-200 dark:bg-white/12 overflow-hidden">
            <span className="loading-bar block h-full rounded-full bg-m-blue"></span>
          </div>
        </div>
        <style>{`
          .loading-bar {
            width: 42%;
            animation: loading-bar-slide 1.15s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          @keyframes loading-bar-slide {
            0% { transform: translateX(-120%); opacity: 0.55; }
            50% { opacity: 1; }
            100% { transform: translateX(260%); opacity: 0.55; }
          }
        `}</style>
      </div>
    );
  }

  if (view === 'admin') {
    return <AdminDashboard onClose={() => { window.location.hash = ''; setView('public'); }} />;
  }

  const gateStatus = getPublicGateStatus(siteContent, now);
  if (gateStatus) {
    return <StatusPage content={siteContent} status={gateStatus} />;
  }

  return (
    <div className="min-h-screen font-sans selection:bg-m-blue selection:text-white">
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} isLoggedIn={isLoggedIn} />
      <main>
        <Hero />
        <About />
        <VillageProfile />
        <Team />
        <Programs />
        <Event />
        <Gallery />
        <Stats />
        <Video />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default App;
