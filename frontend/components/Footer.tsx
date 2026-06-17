import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
      {/* Background neon soft blur effects */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-m-blue/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-m-green/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
        {/* Branding & Logo */}
        <div className="inline-flex flex-col items-center group mb-6">
          <div className="w-16 h-16 rounded-[1.2rem] bg-slate-900 flex items-center justify-center shadow-lg border border-slate-800/80 mb-4 transition-transform duration-300 group-hover:scale-105">
            <img 
              src="/report-assets/logokknv1.png" 
              alt="Logo KKN Kelompok 35" 
              className="w-11 h-11 object-contain filter drop-shadow-sm"
            />
          </div>
          <h3 className="font-black text-2xl text-white leading-tight tracking-tight">
            KKN UMP
          </h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-m-green/20 text-m-green-400 text-xs font-bold mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-m-green" />
            Kelompok 35 • Desa Tanjung Gelam
          </span>
        </div>

        {/* Institution Info & Motto */}
        <div className="max-w-2xl mx-auto mb-8">
          <h4 className="text-base md:text-lg font-black text-slate-200 leading-relaxed mb-3">
            Kuliah Kerja Nyata (KKN) Universitas Muhammadiyah Palembang
          </h4>
          
          <div className="inline-block">
            <p className="inline-flex px-4 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md text-xs font-bold text-slate-400 border border-slate-800/60 italic shadow-sm">
              "Mengabdi Untuk Negeri, Berkarya Untuk Masyarakat"
            </p>
          </div>
        </div>

        {/* Quick Links Navigation */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
          <a href="#about" className="text-xs font-bold tracking-wider uppercase text-slate-500 hover:text-m-blue-400 transition-colors duration-200">
            Tentang Kami
          </a>
          <a href="#programs" className="text-xs font-bold tracking-wider uppercase text-slate-500 hover:text-m-blue-400 transition-colors duration-200">
            Program Kerja
          </a>
          <a href="#team" className="text-xs font-bold tracking-wider uppercase text-slate-500 hover:text-m-blue-400 transition-colors duration-200">
            Struktur Tim
          </a>
          <a href="#gallery" className="text-xs font-bold tracking-wider uppercase text-slate-500 hover:text-m-blue-400 transition-colors duration-200">
            Galeri Kegiatan
          </a>
          <a href="#contact" className="text-xs font-bold tracking-wider uppercase text-slate-500 hover:text-m-blue-400 transition-colors duration-200">
            Hubungi Kami
          </a>
        </div>

        {/* Divider with gradient edge fade */}
        <div className="h-px w-full max-w-xl mx-auto bg-gradient-to-r from-transparent via-slate-800/60 to-transparent mb-8"></div>

        {/* Copyright */}
        <p className="text-[11px] font-bold tracking-wide text-slate-600">
          Copyright &copy; {currentYear} KKN Kelompok 35 UMP. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
