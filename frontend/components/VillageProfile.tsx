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
    <section id="village" className="py-20 bg-slate-50 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">{content.villageTitle}</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              {content.villageDescription}
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Gambaran Umum</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {content.villageOverview}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-lg">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Lokasi</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Kec. Indralaya, Ogan Ilir</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 text-m-green dark:text-green-400 rounded-lg">
                    <Sprout size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Potensi</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pertanian & UMKM</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Sosial</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Masyarakat Agamis & Ramah</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                    <Home size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Fasilitas</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sekolah, Masjid, Poskesdes</p>
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
            className="h-full min-h-[400px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative group"
          >
            {/* Placeholder for Google Maps - Using a generic embed for Indralaya area as example */}
            <iframe 
              src={content.villageMapUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 0, minHeight: '400px' }} 
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
