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
    <section id="about" className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-m-blue/10 dark:bg-m-blue/5 rounded-3xl transform -rotate-3"></div>
              <img 
                src={content.aboutImage} 
                alt="Ilustrasi Kegiatan KKN" 
                className="relative rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-m-green/20 rounded-full flex items-center justify-center text-m-green font-bold text-xl">
                    40
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Hari</p>
                    <p className="font-bold text-slate-900 dark:text-white">Pengabdian</p>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m-blue/10 text-m-blue dark:bg-m-blue/20 dark:text-m-blue-300 text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-m-blue"></span>
              Tentang Program
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-white">
              {content.aboutTitle} <br />
              <span className="text-m-blue dark:text-m-blue-400">{content.aboutHighlight}</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-lg">
              {content.aboutDescription}
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {content.aboutDetail}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.aboutHighlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="text-m-green shrink-0 mt-0.5" size={20} />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
