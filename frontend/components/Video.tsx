import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
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
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const videoFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return storage.subscribeSiteContent(setContent);
  }, []);

  useEffect(() => {
    const element = videoFrameRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsPlayerActive(entry.isIntersecting && entry.intersectionRatio >= 0.45),
      { threshold: [0, 0.45, 0.75] }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const title = content.videoTitle || 'After Movie KKN Kelompok 35 UMP';
  const subtitle = content.videoSubtitle || 'Desa Tanjung Gelam, Ogan Ilir';
  const description = content.videoDescription || 'Saksikan rangkuman perjalanan dan kegiatan kami di Desa Tanjung Gelam.';
  const poster = content.videoPoster || 'https://picsum.photos/seed/kknvideo/1280/720';
  const hasVideo = Boolean(content.videoSrc);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(content.videoSrc);
  const youtubeAutoplayUrl = useMemo(() => {
    if (!youtubeEmbedUrl) return '';
    try {
      const url = new URL(youtubeEmbedUrl);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('mute', '1');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('rel', '0');
      url.searchParams.set('modestbranding', '1');
      return url.toString();
    } catch {
      return `${youtubeEmbedUrl}${youtubeEmbedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&playsinline=1&rel=0`;
    }
  }, [youtubeEmbedUrl]);

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
          ref={videoFrameRef}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 relative aspect-video bg-slate-900 group"
        >
          {hasVideo && isPlayerActive ? (
            youtubeAutoplayUrl ? (
              <iframe
                src={youtubeAutoplayUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full bg-black"
              />
            ) : (
              <video
                src={content.videoSrc}
                controls
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />
            )
          ) : (
            <>
              <img
                src={poster}
                alt="Video Thumbnail"
                className="h-full w-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => hasVideo && setIsPlayerActive(true)}
                  disabled={!hasVideo}
                  className={`btn-glass flex h-20 w-20 items-center justify-center rounded-full pl-1 text-white transition-transform disabled:cursor-not-allowed group-hover:scale-110 ${hasVideo ? 'btn-glass-blue' : 'btn-glass-white opacity-50'}`}
                  aria-label="Putar video langsung di halaman"
                >
                  <Play size={38} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                <p className="mt-1 text-sm text-white/80">{hasVideo ? subtitle : 'Video belum diunggah dari admin'}</p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};
