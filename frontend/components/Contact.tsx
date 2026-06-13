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
    <section id="contact" className="py-20 bg-slate-50 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Hubungi Kami</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Punya pertanyaan atau ingin berkolaborasi? Jangan ragu untuk menghubungi kami.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Informasi Kontak</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Alamat Posko</h4>
                    <p className="text-slate-600 dark:text-slate-400">{content.contactAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Email</h4>
                    <a href={`mailto:${content.contactEmail}`} className="text-slate-600 dark:text-slate-400 hover:text-m-blue transition-colors">{content.contactEmail}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Instagram</h4>
                    <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-m-blue transition-colors">{content.contactInstagram}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-m-blue dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">WhatsApp</h4>
                    <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-m-blue transition-colors">{content.contactWhatsapp}</a>
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
          >
            <form className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6" onSubmit={handleSubmit}>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Kirim Pesan</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Kami akan membalas pesan Anda secepatnya.</p>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                <input 
                  type="text" 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-m-blue focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan nama Anda"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-m-blue focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan email Anda"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pesan</label>
                <textarea 
                  id="message" 
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-m-blue focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tulis pesan Anda di sini..."
                  required
                ></textarea>
              </div>
              
              <button 
                type="submit"
                disabled={isSending}
                className="w-full py-4 bg-m-blue hover:bg-m-blue-dark text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSending ? 'Mengirim...' : 'Kirim Pesan'}
                <Send size={18} />
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
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
