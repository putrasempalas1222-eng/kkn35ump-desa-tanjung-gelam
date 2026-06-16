import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

export const Hero: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={content.heroImage}
          alt="Kegiatan KKN"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.18),transparent_28rem)]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/36 to-black/84"></div>
      </div>

      <div className="container mx-auto px-4 z-10 text-center text-white pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto"
        >
          <span className="inline-block py-2 px-5 rounded-full bg-white/12 backdrop-blur-2xl text-sm font-semibold mb-7 border border-white/16">
            {content.heroBadge}
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[0.94] tracking-normal">
            {content.heroTitle} <br className="hidden md:block" />
            <span className="text-white/78">{content.heroHighlight}</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/72 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
            {content.heroSubtitle.split('\n').map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#about"
              className="btn-glass btn-glass-blue w-full sm:w-auto px-7 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2"
            >
              Tentang KKN
              <ArrowRight size={18} />
            </a>
            <a
              href="#gallery"
              className="btn-glass btn-glass-white w-full sm:w-auto px-7 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2"
            >
              Dokumentasi Kegiatan
              <ImageIcon size={18} />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/70 sm:flex"
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-[1px] h-12 bg-white/30 relative overflow-hidden">
          <motion.div 
            animate={{ y: [0, 48, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-1/2 bg-white"
          />
        </div>
      </motion.div>
    </section>
  );
};
