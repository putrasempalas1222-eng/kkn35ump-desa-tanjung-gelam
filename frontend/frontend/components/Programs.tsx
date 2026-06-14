import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { storage } from '../services/storage';
import { Program } from '../types';

export const Programs: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    return storage.subscribePrograms(setPrograms);
  }, []);

  const categories = Array.from(new Set(programs.map(p => p.category)));

  return (
    <section id="programs" className="py-20 bg-slate-50 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Program Kerja</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Berbagai inisiatif dan kegiatan yang kami laksanakan untuk memajukan Desa Tanjung Gelam.
            </p>
          </motion.div>
        </div>

        <div className="space-y-16">
          {categories.map((category) => {
            const categoryPrograms = programs.filter(p => p.category === category);
            
            return (
              <div key={category} className="relative">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 mb-8"
                >
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{category}</h3>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow"></div>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryPrograms.map((program, pIdx) => {
                    // Dynamically get icon component
                    const IconComponent = (Icons as any)[program.iconName] || Icons.CheckCircle;
                    
                    return (
                      <motion.div
                        key={program.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: pIdx * 0.1 }}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700 group"
                      >
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-m-blue group-hover:text-white transition-all duration-300">
                          <IconComponent size={24} />
                        </div>
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{program.title}</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {program.description}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
