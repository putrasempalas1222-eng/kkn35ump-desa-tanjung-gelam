import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const NAV_LINKS = [
  { name: 'Beranda', href: '#home' },
  { name: 'Tentang', href: '#about' },
  { name: 'Profil Desa', href: '#village' },
  { name: 'Tim', href: '#team' },
  { name: 'Program', href: '#programs' },
  { name: 'Event', href: '#event' },
  { name: 'Galeri', href: '#gallery' },
  { name: 'Kontak', href: '#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/70 dark:bg-black/55 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 py-2'
          : 'bg-white/8 backdrop-blur-xl py-4'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
        <a href="#home" className="flex items-center gap-3 group rounded-full">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Logo_Universitas_Muhammadiyah_Palembang.png" 
            alt="Logo UMP" 
            className="w-9 h-9 object-contain group-hover:scale-105 transition-transform duration-500 filter drop-shadow-sm"
          />
          <div className={`font-semibold text-sm leading-tight ${isScrolled ? 'text-slate-900 dark:text-white' : 'text-white drop-shadow-md'}`}>
            KKN Kelompok 35
            <span className={`block text-xs font-medium ${isScrolled ? 'text-slate-500 dark:text-slate-400' : 'text-white/70'}`}>UMP</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-5">
          <ul className={`flex gap-1 rounded-full px-2 py-1 ${isScrolled ? 'bg-slate-100/70 dark:bg-white/10' : 'bg-white/10 backdrop-blur-xl'}`}>
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className={`block rounded-full px-3 py-2 text-xs font-semibold hover:bg-white/80 dark:hover:bg-white/10 transition-colors ${
                    isScrolled ? 'text-slate-700 dark:text-slate-200 hover:text-slate-950' : 'text-white/84 hover:text-white drop-shadow-sm'
                  }`}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors ${
                isScrolled
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15'
                  : 'bg-white/14 text-white hover:bg-white/24 backdrop-blur-sm'
              }`}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <a
              href="#admin"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                isScrolled
                  ? 'bg-m-blue text-white hover:bg-m-blue-dark'
                  : 'bg-white text-slate-950 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert size={14} />
              Login
            </a>
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleDarkMode();
            }}
            className={`p-2 rounded-full ${isScrolled ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.hash = '#admin';
            }}
            className={`p-2 rounded-full ${isScrolled ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}
            aria-label="Admin Login Link"
          >
            <ShieldAlert size={20} />
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileMenuOpen((prev) => !prev);
            }}
            className={`p-2.5 rounded-full flex items-center justify-center min-w-[40px] min-h-[40px] transition-all ${
              isScrolled ? 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10' : 'text-white hover:bg-white/10'
            }`}
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden bg-white/92 dark:bg-black/90 backdrop-blur-2xl border-t border-black/5 dark:border-white/10 shadow-lg overflow-hidden"
          >
            <ul className="flex flex-col py-4 px-6 gap-4">
              {NAV_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      setTimeout(() => {
                        const targetId = link.href.replace('#', '');
                        const element = document.getElementById(targetId);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 220); // Wait for menu exit animation (200ms) to complete
                    }}
                    className="block py-2.5 px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:text-m-blue dark:hover:text-m-green hover:bg-slate-50 dark:hover:bg-white/5 font-bold transition-all"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <a
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      window.location.hash = '#admin';
                    }, 220);
                  }}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-m-blue dark:text-blue-400 font-bold hover:bg-m-blue/5 transition-all"
                >
                  <ShieldAlert size={18} />
                  Login
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
