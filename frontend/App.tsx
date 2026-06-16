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
import { Competition } from './components/Competition';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminDashboard } from './components/AdminDashboard';
import { storage } from './services/storage';
import { SiteContent } from './types';

type ThemeMode = 'light' | 'dark';
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const THEME_COOKIE_NAME = 'kkn_theme';
const THEME_STORAGE_KEY = 'kkn_theme';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return '';

  return document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
};

const saveThemePreference = (theme: ThemeMode) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

const applyThemePreference = (theme: ThemeMode) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const getInitialThemePreference = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) || getCookieValue(THEME_COOKIE_NAME);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

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

const hasMaintenanceLoginToken = () => {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('kknlogin35');
};

const shouldOpenAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hash === '#admin' || hasMaintenanceLoginToken();
};

const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
};

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
};

const InstallAppPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    localStorage.removeItem('kkn_install_prompt_closed');
    if (isStandaloneApp() || sessionStorage.getItem('kkn_install_prompt_closed') === '1') return;

    const timer = window.setTimeout(() => setVisible(true), 2200);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleAppInstalled = () => {
      setVisible(false);
      sessionStorage.setItem('kkn_install_prompt_closed', '1');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!visible || isStandaloneApp()) return null;

  const closePrompt = () => {
    setVisible(false);
    sessionStorage.setItem('kkn_install_prompt_closed', '1');
  };

  const installApp = async () => {
    if (!installPrompt) {
      setShowIosHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') closePrompt();
    setInstallPrompt(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-4 z-[90] mx-auto max-w-md rounded-[24px] border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-white">
      <div className="flex items-start gap-3">
        <img src="/report-assets/logokknv1.png" alt="" className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Jadikan Website Ini App</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            Rekomendasi: pasang KKN 35 di Android atau PC agar lebih cepat dibuka seperti aplikasi.
          </p>
          {showIosHelp || (!installPrompt && isIosDevice()) ? (
            <p className="mt-2 rounded-xl bg-[#e8f0fe] px-3 py-2 text-xs font-bold text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
              Di iPhone/iPad: tekan tombol Bagikan, lalu pilih Tambah ke Layar Utama.
            </p>
          ) : null}
          {showIosHelp && !isIosDevice() ? (
            <p className="mt-2 rounded-xl bg-[#e8f0fe] px-3 py-2 text-xs font-bold text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
              {isAndroidDevice()
                ? 'Di Android Chrome: buka menu titik tiga, lalu pilih Tambahkan ke layar utama atau Install app.'
                : 'Di PC Chrome/Edge: klik ikon install di address bar, atau buka menu browser lalu pilih Install app.'}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={installApp}
              className="rounded-full bg-m-blue px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-m-blue-dark"
            >
              Pasang App
            </button>
            <button
              type="button"
              onClick={closePrompt}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusPage = ({ content, status }: { content: SiteContent; status: 'maintenance' | 'not-started' }) => {
  const title = status === 'not-started' ? 'Belum dibuka' : content.maintenanceTitle || 'Segera kembali';
  const message =
    status === 'not-started'
      ? 'Website akan dibuka sesuai jadwal yang sudah ditentukan.'
      : content.maintenanceMessage || 'Kami sedang merapikan beberapa bagian agar website bisa digunakan dengan lebih baik.';

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-950 dark:bg-[#0b0f19] dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[auto_1fr_auto] px-5 py-6 md:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/report-assets/logokknv1.png"
              alt="Logo KKN Kelompok 35"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-950 dark:text-white">
                KKN Kelompok 35
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Universitas Muhammadiyah Palembang
              </p>
            </div>
          </div>
        </header>

        <main className="flex items-center py-10 md:py-12">
          <div className="w-full">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {status === 'not-started' ? 'Belum dibuka' : 'Maintenance'}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-normal text-slate-950 dark:text-white md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-normal leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
              {message}
            </p>

            <div className="mt-9 h-px w-full bg-slate-200 dark:bg-slate-800" />

            <div className="mt-7 grid max-w-4xl gap-6 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Dimulai
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">{formatSchedule(content.maintenanceStart)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Selesai
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">{formatSchedule(content.maintenanceEnd)}</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 pt-4 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Website sedang disiapkan. Terima kasih sudah menunggu.
        </footer>
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

    const initialTheme = getInitialThemePreference();
    setDarkMode(initialTheme === 'dark');
    applyThemePreference(initialTheme);
    saveThemePreference(initialTheme);

    const handleAdminRouteChange = () => {
      if (shouldOpenAdminRoute()) {
        setView('admin');
      } else {
        setView('public');
      }
    };

    window.addEventListener('hashchange', handleAdminRouteChange);
    window.addEventListener('popstate', handleAdminRouteChange);
    handleAdminRouteChange();

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
      window.removeEventListener('hashchange', handleAdminRouteChange);
      window.removeEventListener('popstate', handleAdminRouteChange);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((current) => {
      const nextTheme: ThemeMode = current ? 'light' : 'dark';
      applyThemePreference(nextTheme);
      saveThemePreference(nextTheme);
      return nextTheme === 'dark';
    });
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

  const closeAdmin = () => {
    if (hasMaintenanceLoginToken()) {
      window.history.replaceState(null, '', '/');
    } else {
      window.location.hash = '';
    }
    setView('public');
  };

  if (view === 'admin') {
    return <AdminDashboard onClose={closeAdmin} />;
  }

  const gateStatus = getPublicGateStatus(siteContent, now);
  if (gateStatus && hasMaintenanceLoginToken()) {
    return <AdminDashboard onClose={closeAdmin} />;
  }

  if (gateStatus) {
    return <StatusPage content={siteContent} status={gateStatus} />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden font-sans selection:bg-m-blue selection:text-white">
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} isLoggedIn={isLoggedIn} />
      <main className="w-full max-w-full overflow-x-hidden">
        <Hero />
        <About />
        <VillageProfile />
        <Team />
        <Programs />
        <Event />
        <Competition />
        <Gallery />
        <Stats />
        <Video />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
      <InstallAppPrompt />
    </div>
  );
};

export default App;
