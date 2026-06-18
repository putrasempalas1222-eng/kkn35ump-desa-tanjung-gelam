import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

export const About: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  return (
    <section id="about" className="py-20 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-1/4 left-0 w-[300px] h-[300px] bg-m-blue/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-m-blue/10 dark:bg-m-blue/5 rounded-[2rem] transform -rotate-3"></div>
              <img 
                src={content.aboutImage} 
                alt="Ilustrasi Kegiatan KKN" 
                className="relative rounded-3xl shadow-xl w-full object-cover aspect-[4/3] border border-slate-200/40 dark:border-slate-800/40"
              />
              <div className="absolute -bottom-6 -right-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-xl border border-slate-250/50 dark:border-slate-800/80 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#30D158]/20 to-[#30D158]/40 flex items-center justify-center text-m-green font-black text-2xl shadow-[0_8px_20px_rgba(48,209,88,0.2)]">
                    40
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Hari</p>
                    <p className="font-extrabold text-slate-950 dark:text-white text-base">Pengabdian</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-m-blue/10 text-m-blue dark:bg-m-blue/20 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-5 border border-m-blue/20">
              <span className="w-2 h-2 rounded-full bg-m-blue animate-pulse"></span>
              Tentang Program
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white leading-tight tracking-tight">
              {content.aboutTitle} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-m-blue to-blue-400 font-black">{content.aboutHighlight}</span>
            </h2>
            <p className="text-slate-650 dark:text-slate-350 mb-6 leading-relaxed text-lg font-medium">
              {content.aboutDescription}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {content.aboutDetail}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.aboutHighlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-sm p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                  <CheckCircle2 className="text-m-green shrink-0 mt-0.5" size={20} />
                  <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
