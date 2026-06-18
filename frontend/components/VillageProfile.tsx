import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Sprout, Home } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

export const VillageProfile: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  return (
    <section id="village" className="py-20 bg-slate-50 dark:bg-slate-800/30 relative overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-m-green/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">{content.villageTitle}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-m-blue to-m-green mx-auto rounded-full mb-6"></div>
            <p className="text-slate-650 dark:text-slate-350 text-lg font-medium leading-relaxed">
              {content.villageDescription}
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col h-full"
          >
            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-2xl font-extrabold mb-4 text-slate-900 dark:text-white">Gambaran Umum</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                  {content.villageOverview}
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-500/20 transition-all duration-300">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl shrink-0">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Lokasi</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">Kec. Indralaya, Ogan Ilir</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-green-500/20 transition-all duration-300">
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 text-m-green dark:text-green-400 rounded-xl shrink-0">
                    <Sprout size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Potensi</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">Pertanian & UMKM</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-purple-500/20 transition-all duration-300">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                    <Users size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Sosial</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">Masyarakat Agamis & Ramah</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-orange-500/20 transition-all duration-300">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                    <Home size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Fasilitas</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">Sekolah, Masjid, Poskesdes</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="h-full min-h-[420px] rounded-[2rem] overflow-hidden shadow-xl border border-slate-200/50 dark:border-slate-800/80 relative group"
          >
            <iframe 
              src={content.villageMapUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 0, minHeight: '420px' }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Peta Desa Tanjung Gelam"
              className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500"
            ></iframe>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
