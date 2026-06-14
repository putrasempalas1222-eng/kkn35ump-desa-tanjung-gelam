import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <div className="flex justify-center items-center gap-3 mb-6">
          <img 
            src="/report-assets/logokknv1.png" 
            alt="Logo KKN Kelompok 35" 
            className="w-12 h-12 object-contain filter drop-shadow-md"
          />
          <div className="text-left">
            <h3 className="font-bold text-xl leading-tight">KKN UMP</h3>
            <p className="text-m-green text-sm">Kelompok 35 • Desa Tanjung Gelam</p>
          </div>
        </div>
        
        <h4 className="text-lg font-medium mb-2">KKN Kelompok 35 Universitas Muhammadiyah Palembang</h4>
        <p className="text-slate-400 italic mb-8 max-w-md mx-auto">
          "Mengabdi Untuk Negeri, Berkarya Untuk Masyarakat"
        </p>
        
        <div className="h-px w-full max-w-md mx-auto bg-slate-800 mb-8"></div>
        
        <p className="text-slate-500 text-sm">
          Copyright &copy; {currentYear} KKN Kelompok 35 UMP. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
