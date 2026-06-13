import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Quote, Send } from 'lucide-react';
import { storage } from '../services/storage';
import { Testimonial } from '../types';

export const Testimonials: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRole, setReviewRole] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    return storage.subscribeTestimonials(setTestimonials);
  }, []);

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitStatus('sending');
    setSubmitMessage('');

    try {
      await storage.addReviewSubmission({
        name: reviewName,
        role: reviewRole || 'Pengunjung Website',
        quote: reviewText,
      });

      setReviewName('');
      setReviewRole('');
      setReviewText('');
      setSubmitStatus('success');
      setSubmitMessage('Ulasan terkirim dan akan tampil setelah diverifikasi admin.');
    } catch (error: any) {
      setSubmitStatus('error');
      setSubmitMessage(error?.message || 'Ulasan belum bisa dikirim. Silakan coba lagi.');
    }
  };

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Kata Mereka</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Tanggapan dan kesan masyarakat Desa Tanjung Gelam terhadap program KKN kami.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl relative border border-slate-100 dark:border-slate-700"
            >
              <Quote className="absolute top-6 right-6 text-m-blue/10 dark:text-m-blue/20" size={60} />
              <p className="text-slate-600 dark:text-slate-300 italic mb-8 relative z-10 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-4">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-m-blue"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-m-blue bg-m-blue/10 text-m-blue flex items-center justify-center font-black">
                    {testimonial.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{testimonial.name}</h4>
                  <p className="text-sm text-m-blue dark:text-m-blue-400 font-medium">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Berikan Ulasan</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Ulasan akan diperiksa terlebih dahulu sebelum tampil di website.
            </p>
          </div>

          <form onSubmit={submitReview} className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama</span>
                <input
                  value={reviewName}
                  onChange={(event) => setReviewName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-m-blue"
                  placeholder="Nama Anda"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Peran</span>
                <input
                  value={reviewRole}
                  onChange={(event) => setReviewRole(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-m-blue"
                  placeholder="Warga, siswa, perangkat desa..."
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ulasan</span>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-m-blue resize-none"
                placeholder="Tulis kesan atau masukan Anda..."
                required
              />
              <span className="mt-1 block text-xs text-slate-400">{reviewText.length}/500 karakter</span>
            </label>

            {submitMessage && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-start gap-2 ${
                  submitStatus === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                }`}
              >
                {submitStatus === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{submitMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitStatus === 'sending'}
              className="rounded-lg bg-m-blue hover:bg-m-blue-dark disabled:opacity-70 text-white px-5 py-3 font-bold flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {submitStatus === 'sending' ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
