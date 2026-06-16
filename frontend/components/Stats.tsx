import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Briefcase, Calendar, Map } from 'lucide-react';

const StatItem = ({ icon: Icon, endValue, label, suffix = '' }: { icon: any, endValue: number, label: string, suffix?: string }) => {
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
    <div ref={ref} className="flex flex-col items-center text-center p-6">
      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
        <Icon size={32} className="text-white" />
      </div>
      <div className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center">
        {count}
        {suffix && <span className="text-m-green ml-1">{suffix}</span>}
      </div>
      <div className="text-white/80 font-medium text-lg">{label}</div>
    </div>
  );
};

export const Stats: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-m-blue dark:bg-m-blue-dark">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10">
          <StatItem icon={Users} endValue={12} label="Anggota Kelompok" />
          <StatItem icon={Briefcase} endValue={10} label="Program Kerja" suffix="+" />
          <StatItem icon={Calendar} endValue={40} label="Hari Pengabdian" />
          <StatItem icon={Map} endValue={1} label="Desa Binaan" />
        </div>
      </div>
    </section>
  );
};
