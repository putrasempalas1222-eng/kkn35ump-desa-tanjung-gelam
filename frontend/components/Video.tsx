import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { storage } from '../services/storage';
import { SiteContent } from '../types';

const getYouTubeEmbedUrl = (value: string) => {
  if (!value) return '';

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) return value;

      const id = url.searchParams.get('v') || url.pathname.split('/shorts/')[1]?.split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }

  return '';
};

export const Video: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(storage.defaults.siteContent);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  const title = content.videoTitle || 'After Movie KKN Kelompok 35 UMP';
  const subtitle = content.videoSubtitle || 'Desa Tanjung Gelam, Ogan Ilir';
  const description = content.videoDescription || 'Saksikan rangkuman perjalanan dan kegiatan kami di Desa Tanjung Gelam.';
  const poster = content.videoPoster || 'https://picsum.photos/seed/kknvideo/1280/720';
  const hasVideo = Boolean(content.videoSrc);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(content.videoSrc);

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Dokumentasi Video</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">{description}</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 relative aspect-video bg-slate-900 group"
        >
          <img
            src={poster}
            alt="Video Thumbnail"
            className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => hasVideo && setIsOpen(true)}
              disabled={!hasVideo}
              className="w-20 h-20 bg-m-blue/95 hover:bg-m-blue disabled:bg-white/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center pl-1 shadow-lg shadow-m-blue/40 transform group-hover:scale-110 transition-all duration-300 backdrop-blur-sm"
              aria-label="Putar video"
            >
              <Play size={38} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h3 className="text-white text-2xl font-bold">{title}</h3>
            <p className="text-white/80 text-sm mt-1">{hasVideo ? subtitle : 'Video belum diunggah dari admin'}</p>
          </div>
        </motion.div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Tutup video"
          >
            <X size={24} />
          </button>
          {youtubeEmbedUrl ? (
            <iframe
              src={`${youtubeEmbedUrl}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="aspect-video w-full max-w-6xl rounded-2xl bg-black shadow-2xl"
            />
          ) : (
            <video
              src={content.videoSrc}
              controls
              autoPlay
              className="max-h-[86vh] w-full max-w-6xl rounded-2xl bg-black shadow-2xl"
            />
          )}
        </div>
      )}
    </section>
  );
};
