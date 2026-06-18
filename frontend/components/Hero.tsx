import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

interface HeroProps {
  introCompleted?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ introCompleted = true }) => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={content.heroImage}
          alt="Kegiatan KKN"
          initial={{ scale: 1.15, opacity: 0 }}
          animate={introCompleted ? { scale: 1, opacity: 0.8 } : { scale: 1.15, opacity: 0 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.18),transparent_28rem)]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/36 to-black/84"></div>
      </div>

      <div className="container mx-auto px-4 z-10 text-center text-white pt-24 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={introCompleted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 1.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block py-2 px-5 rounded-full bg-white/10 backdrop-blur-md text-sm font-semibold mb-5 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-slate-100">
              {content.heroBadge}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 35 }}
            animate={introCompleted ? { opacity: 1, y: 0 } : { opacity: 0, y: 35 }}
            transition={{ duration: 1.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-5 leading-[0.94] tracking-normal"
          >
            {content.heroTitle} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-[#60a5fa] to-emerald-400 font-extrabold">{content.heroHighlight}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={introCompleted ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
            transition={{ duration: 1.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl md:text-2xl text-white/72 mb-8 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            {content.heroSubtitle.split('\n').map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </motion.p>
          
          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={introCompleted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 1.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href="#about"
              className="btn-glass btn-glass-blue w-full sm:w-auto px-7 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
            >
              Tentang KKN
              <ArrowRight size={18} />
            </a>
            <a
              href="#gallery"
              className="btn-glass btn-glass-white w-full sm:w-auto px-7 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] transition-all"
            >
              Dokumentasi Kegiatan
              <ImageIcon size={18} />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={introCompleted ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.3, duration: 1.2 }}
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
