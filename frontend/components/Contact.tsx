import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Mail, Camera, Phone, Send, CheckCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

export const Contact: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setIsSending(true);
    await storage.addMessage({ name, email, message });
    setIsSending(false);
    setIsSubmitted(true);

    // Reset form
    setName('');
    setEmail('');
    setMessage('');

    setTimeout(() => {
      setIsSubmitted(false);
    }, 4000);
  };

  return (
    <section id="contact" className="py-20 bg-slate-50 dark:bg-slate-800/30 relative overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-m-blue/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">Hubungi Kami</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-m-blue to-m-green mx-auto rounded-full mb-6"></div>
            <p className="text-slate-650 dark:text-slate-350 text-lg font-medium leading-relaxed">
              Punya pertanyaan atau ingin berkolaborasi? Jangan ragu untuk menghubungi kami.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-stretch">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col h-full"
          >
            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between h-full hover:shadow-2xl transition-all duration-350">
              <div>
                <h3 className="text-2xl font-extrabold mb-6 text-slate-900 dark:text-white">Informasi Kontak</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-500/20 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Alamat Posko</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{content.contactAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-500/20 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Email</h4>
                      <a href={`mailto:${content.contactEmail}`} className="text-xs text-slate-600 dark:text-slate-400 hover:text-m-blue font-medium transition-colors">{content.contactEmail}</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-500/20 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Camera size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Instagram</h4>
                      <a href="#" className="text-xs text-slate-600 dark:text-slate-400 hover:text-m-blue font-medium transition-colors">{content.contactInstagram}</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-500/20 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">WhatsApp</h4>
                      <a href="#" className="text-xs text-slate-600 dark:text-slate-400 hover:text-m-blue font-medium transition-colors">{content.contactWhatsapp}</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <form className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800/80 space-y-6 flex flex-col justify-between h-full hover:shadow-2xl transition-all duration-350" onSubmit={handleSubmit}>
              <div>
                <h3 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">Kirim Pesan</h3>
                <p className="text-slate-500 dark:text-slate-550 text-xs font-bold uppercase tracking-wider mb-6">Kami akan membalas pesan Anda secepatnya.</p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nama Lengkap</label>
                    <input 
                      type="text" 
                      id="name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-m-blue/15 focus:border-m-blue outline-none transition-all duration-300 font-medium"
                      placeholder="Masukkan nama Anda"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-m-blue/15 focus:border-m-blue outline-none transition-all duration-300 font-medium"
                      placeholder="Masukkan email Anda"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Pesan</label>
                    <textarea 
                      id="message" 
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-m-blue/15 focus:border-m-blue outline-none transition-all duration-300 resize-none font-medium"
                      placeholder="Tulis pesan Anda di sini..."
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                <button 
                  type="submit"
                  disabled={isSending}
                  className="btn-glass btn-glass-blue w-full py-4 text-white rounded-full font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-60 border border-white/10 shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {isSending ? 'Mengirim...' : 'Kirim Pesan'}
                  <Send size={14} />
                </button>

                <AnimatePresence>
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300"
                    >
                      <CheckCircle size={20} className="shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Pesan Berhasil Dikirim!</p>
                        <p className="text-xs opacity-90">Pesan Anda telah masuk ke dashboard admin KKN Kelompok 35.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
