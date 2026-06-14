import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  isLoggedIn?: boolean;
}

const NAV_LINKS = [
  { name: 'Beranda', href: '#home' },
  { name: 'Tentang', href: '#about' },
  { name: 'Profil Desa', href: '#village' },
  { name: 'Tim', href: '#team' },
  { name: 'Program', href: '#programs' },
  { name: 'Event', href: '#event' },
  { name: 'Perlombaan', href: '#competition' },
  { name: 'Galeri', href: '#gallery' },
  { name: 'Kontak', href: '#contact' },
];

// Light-bg sections (light mode only)
const LIGHT_SECTIONS = new Set(['about', 'team', 'event', 'gallery', 'village', 'programs', 'contact']);

export const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, isLoggedIn }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOverLight, setIsOverLight] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.replace('#', ''));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsOverLight(!darkMode && LIGHT_SECTIONS.has(entry.target.id));
          }
        });
      },
      { rootMargin: '-64px 0px -85% 0px', threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [darkMode]);

  // onLight: only in light mode over white/slate sections
  const onLight = !darkMode && isOverLight;

  // ── DARK MODE: solid dark glass, always visible regardless of content behind ──
  // ── LIGHT MODE on hero (dark bg): semi-transparent dark glass ──
  // ── LIGHT MODE on light sections: semi-transparent white glass ──

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-500
        ${isScrolled ? 'py-2.5' : 'py-4'}
        ${darkMode
          ? 'bg-slate-950/75 shadow-[0_8px_40px_rgba(0,0,0,0.55)]'
          : onLight
            ? 'shadow-[0_4px_24px_rgba(0,0,0,0.07)]'
            : 'shadow-[0_4px_28px_rgba(0,0,0,0.20)]'
        }
      `}
      style={!darkMode ? {
        background: onLight
          ? 'linear-gradient(135deg,rgba(255,255,255,0.62) 0%,rgba(241,245,249,0.52) 100%)'
          : 'linear-gradient(135deg,rgba(0,0,0,0.36) 0%,rgba(10,18,35,0.26) 100%)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
      } : {
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      }}
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">

        {/* Logo */}
        <a href="#home" className="flex items-center gap-3 group">
          <img
            src="/report-assets/logokknv1.png"
            alt="Logo KKN Kelompok 35"
            className="w-9 h-9 object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
          />
          <div className={`font-semibold text-sm leading-tight transition-colors duration-300 ${onLight ? 'text-slate-900' : 'text-white drop-shadow-sm'}`}>
            KKN Kelompok 35
            <span className={`block text-xs font-medium ${onLight ? 'text-slate-500' : 'text-white/60'}`}>UMP</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-3">

          {/* Nav pill */}
          <ul
            className={`flex gap-0.5 rounded-full px-2 py-1.5 transition-all duration-300 ${
              darkMode
                ? 'bg-white/5'
                : ''
            }`}
            style={!darkMode ? {
              background: onLight
                ? 'linear-gradient(135deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.35) 100%)'
                : 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.06) 100%)',
              boxShadow: onLight
                ? '0 2px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.85)'
                : '0 2px 16px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.18)',
            } : {
              boxShadow: '0 2px 14px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className={`block rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    onLight
                      ? 'text-slate-700 hover:text-slate-950 hover:bg-black/8'
                      : 'text-white/88 hover:text-white hover:bg-white/15 drop-shadow-sm'
                  }`}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-all duration-300 ${
                darkMode
                  ? 'bg-white/8 text-slate-200 hover:bg-white/14 hover:text-white'
                  : onLight
                    ? 'bg-black/6 text-slate-700 hover:bg-black/10 hover:text-slate-950'
                    : 'bg-white/12 text-white/85 hover:bg-white/20 hover:text-white'
              }`}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Dashboard button */}
            <a
              href="#admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white border border-blue-400/35 hover:border-blue-300/55 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg,rgba(59,130,246,0.85) 0%,rgba(37,99,235,0.80) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 18px rgba(59,130,246,0.38),inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              <ShieldAlert size={14} />
              {isLoggedIn ? 'Dashboard' : 'Login'}
            </a>
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {[
            { action: toggleDarkMode, icon: darkMode ? <Sun size={20} /> : <Moon size={20} />, label: 'Toggle Dark Mode' },
          ].map(({ action, icon, label }) => (
            <button
              key={label}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); action(); }}
              className={`p-2 rounded-full transition-all duration-300 ${onLight ? 'text-slate-700 hover:bg-black/8' : 'text-white/85 hover:bg-white/15'}`}
              aria-label={label}
            >
              {icon}
            </button>
          ))}
          <a
            href="#admin"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.hash = '#admin'; }}
            className={`p-2 rounded-full transition-all duration-300 ${onLight ? 'text-slate-700 hover:bg-black/8' : 'text-white/85 hover:bg-white/15'}`}
            aria-label="Admin"
          >
            <ShieldAlert size={20} />
          </a>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMobileMenuOpen((p) => !p); }}
            className={`p-2.5 rounded-full flex items-center justify-center min-w-[40px] min-h-[40px] transition-all duration-300 ${onLight ? 'text-slate-900 hover:bg-black/8' : 'text-white hover:bg-white/15'}`}
            aria-label={isMobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className={`md:hidden overflow-hidden border-t ${darkMode ? 'bg-slate-950/95 border-white/8' : ''}`}
            style={!darkMode ? {
              borderColor: onLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
              background: onLight
                ? 'linear-gradient(135deg,rgba(255,255,255,0.92) 0%,rgba(248,250,252,0.88) 100%)'
                : 'linear-gradient(135deg,rgba(5,10,22,0.88) 0%,rgba(15,25,45,0.84) 100%)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            } : undefined}
          >
            <ul className="flex flex-col py-4 px-6 gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      setTimeout(() => {
                        const el = document.getElementById(link.href.replace('#', ''));
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 220);
                    }}
                    className={`block py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 ${
                      onLight
                        ? 'text-slate-700 hover:text-slate-950 hover:bg-black/6'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li className={`pt-3 mt-1 border-t ${darkMode ? 'border-white/8' : ''}`}
                style={!darkMode ? { borderColor: onLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)' } : undefined}>
                <a
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    setTimeout(() => { window.location.hash = '#admin'; }, 220);
                  }}
                  className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-blue-400 hover:bg-blue-500/10 font-bold transition-all duration-200"
                >
                  <ShieldAlert size={18} />
                  {isLoggedIn ? 'Dashboard Admin' : 'Login'}
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
