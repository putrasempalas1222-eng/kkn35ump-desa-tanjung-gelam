import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Briefcase, Calendar, Map } from 'lucide-react';

const StatItem = ({ 
  icon: Icon, 
  endValue, 
  label, 
  suffix = '',
  gradientClass,
  textGradient,
  iconColor,
  glowColor
}: { 
  icon: any, 
  endValue: number, 
  label: string, 
  suffix?: string,
  gradientClass: string,
  textGradient: string,
  iconColor: string,
  glowColor: string
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000; // 2 seconds
      const increment = endValue / (duration / 16); // 60fps

      const timer = setInterval(() => {
        start += increment;
        if (start >= endValue) {
          setCount(endValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isInView, endValue]);

  return (
    <motion.div 
      ref={ref}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 ${glowColor}`}
    >
      {/* Accent glow corner */}
      <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full bg-gradient-to-tr ${gradientClass} opacity-10 dark:opacity-20 blur-xl pointer-events-none`} />

      <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center mb-5 bg-gradient-to-tr ${gradientClass} border border-slate-200/30 dark:border-slate-700/30 shadow-sm`}>
        <Icon size={28} className={iconColor} />
      </div>

      <div className={`text-4xl md:text-5xl font-black mb-2 flex items-center tracking-tight ${textGradient} select-none`}>
        {count}
        {suffix && <span className="text-2xl font-bold ml-0.5 select-none">{suffix}</span>}
      </div>

      <div className="text-slate-500 dark:text-slate-400 font-bold text-xs tracking-wider uppercase">{label}</div>
    </motion.div>
  );
};

export const Stats: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 border-y border-slate-100/80 dark:border-slate-800/40">
      {/* Background soft glow spots */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-m-blue/5 dark:bg-m-blue/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-m-green/5 dark:bg-m-green/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m-blue/10 text-m-blue dark:bg-m-blue/20 dark:text-m-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-m-blue animate-pulse" />
            Statistik KKN
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">
            Masa Pengabdian Dalam Angka
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-m-blue to-m-green mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatItem 
            icon={Users} 
            endValue={12} 
            label="Anggota Kelompok" 
            gradientClass="from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20"
            iconColor="text-blue-600 dark:text-blue-400"
            textGradient="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent"
            glowColor="hover:shadow-[0_20px_50px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_20px_50px_rgba(59,130,246,0.06)]"
          />
          <StatItem 
            icon={Briefcase} 
            endValue={10} 
            label="Program Kerja" 
            suffix="+" 
            gradientClass="from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            textGradient="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent"
            glowColor="hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)] dark:hover:shadow-[0_20px_50px_rgba(16,185,129,0.06)]"
          />
          <StatItem 
            icon={Calendar} 
            endValue={40} 
            label="Hari Pengabdian" 
            gradientClass="from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20"
            iconColor="text-amber-600 dark:text-amber-400"
            textGradient="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent"
            glowColor="hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)] dark:hover:shadow-[0_20px_50px_rgba(245,158,11,0.06)]"
          />
          <StatItem 
            icon={Map} 
            endValue={1} 
            label="Desa Binaan" 
            gradientClass="from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20"
            iconColor="text-purple-600 dark:text-purple-400"
            textGradient="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
            glowColor="hover:shadow-[0_20px_50px_rgba(168,85,247,0.12)] dark:hover:shadow-[0_20px_50px_rgba(168,85,247,0.06)]"
          />
        </div>
      </div>
    </section>
  );
};
