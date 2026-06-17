import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeIntroProps {
  onComplete: () => void;
}

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Prevent scrolling while intro is active
    document.body.style.overflow = 'hidden';

    // Cinematic slow-motion duration: auto-complete after 4.2 seconds
    const completeTimer = setTimeout(() => {
      handleComplete();
    }, 4200);

    return () => {
      clearTimeout(completeTimer);
      document.body.style.overflow = '';
    };
  }, []);

  const handleComplete = () => {
    setIsActive(false);
    document.body.style.overflow = '';
    // Call the parent onComplete after the slow exit transition finishes (1.4 seconds)
    setTimeout(() => {
      onComplete();
    }, 1400);
  };

  const welcomeText = "SELAMAT DATANG";

  // Pre-generate particles positions for visual consistency (slower particles)
  const particleSeeds = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${(i * 23) % 100}%`,
    top: `${(i * 19) % 100}%`,
    size: (i % 2) * 1.5 + 2, // 2px, 3.5px
    delay: (i % 3) * 2,
    duration: 14 + (i % 3) * 5, // Slower: 14s to 24s
  }));

  // Slower, smoother easing curves [0.16, 1, 0.3, 1] (easeOutExpo) and [0.25, 1, 0.5, 1]
  const smoothEase = [0.16, 1, 0.3, 1];

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.03,
            filter: 'blur(15px)',
          }}
          transition={{ duration: 1.4, ease: smoothEase }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050814] text-white select-none overflow-hidden"
        >
          {/* Custom style for clean glowing text and background grid */}
          <style dangerouslySetInnerHTML={{ __html: `
            .bg-grid {
              background-size: 60px 60px;
              background-image: 
                linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px);
            }
            .glow-text-neon {
              color: #ffffff;
              text-shadow: 
                0 0 12px rgba(255, 255, 255, 0.95),
                0 0 24px rgba(0, 113, 227, 0.5),
                0 0 48px rgba(0, 113, 227, 0.25);
            }
          `}} />

          {/* Minimalist grid and vignette background */}
          <div className="absolute inset-0 bg-grid opacity-35 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050814] via-transparent to-[#050814] pointer-events-none" />

          {/* Soft Background Glowing Orbs - drifting slower */}
          <motion.div
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 40, 0],
              opacity: [0.15, 0.22, 0.15]
            }}
            transition={{
              repeat: Infinity,
              duration: 20,
              ease: 'easeInOut',
            }}
            className="absolute top-[-15%] left-[-15%] w-[65vw] h-[65vw] max-w-[500px] max-h-[500px] rounded-full bg-[#0071E3] blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{
              x: [0, -30, 40, 0],
              y: [0, 40, -30, 0],
              opacity: [0.10, 0.18, 0.10]
            }}
            transition={{
              repeat: Infinity,
              duration: 24,
              ease: 'easeInOut',
            }}
            className="absolute bottom-[-15%] right-[-15%] w-[65vw] h-[65vw] max-w-[500px] max-h-[500px] rounded-full bg-[#30D158] blur-[120px] pointer-events-none"
          />

          {/* Soft floating stars - slow speed */}
          {particleSeeds.map((pt) => (
            <motion.div
              key={pt.id}
              initial={{ 
                x: pt.left, 
                y: '110vh', 
                opacity: 0, 
                scale: 0.5 
              }}
              animate={{ 
                y: ['110vh', '-10vh'], 
                opacity: [0, 0.5, 0.5, 0],
                scale: [0.5, 1.1, 0.8, 0.5],
              }}
              transition={{
                duration: pt.duration,
                repeat: Infinity,
                ease: 'linear',
                delay: pt.delay,
              }}
              style={{
                position: 'absolute',
                width: pt.size,
                height: pt.size,
                borderRadius: '50%',
                background: '#FFFFFF',
                opacity: 0.2,
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
          ))}

          {/* Main Content Area */}
          <div className="relative z-10 flex flex-col items-center px-6 max-w-xl text-center">
            
            {/* Logo with gentle floating & slow fade-in */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 1.8,
                delay: 0.2,
                ease: smoothEase,
              }}
              className="relative mb-8 flex items-center justify-center"
            >
              <div className="absolute inset-0 -m-6 bg-[#0071E3]/15 blur-2xl rounded-full" />
              
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 5, // Slower bobbing
                  ease: 'easeInOut',
                }}
                className="relative z-10"
              >
                <img
                  src="/report-assets/logokknv1.png"
                  alt="Logo KKN Kelompok 35"
                  className="h-20 w-20 md:h-24 md:w-24 object-contain filter drop-shadow-[0_8px_16px_rgba(0,113,227,0.3)]"
                />
              </motion.div>
            </motion.div>

            {/* Clean Neon Welcome Text - Slower staggered glide-in */}
            <h1 className="text-4xl md:text-5xl font-black tracking-[0.28em] flex flex-wrap justify-center gap-x-[0.2em] uppercase font-sans mb-8 glow-text-neon select-none">
              {welcomeText.split(" ").map((word, wordIndex) => (
                <span key={wordIndex} className="flex no-wrap">
                  {word.split("").map((char, charIndex) => {
                    const absoluteIndex = 
                      wordIndex === 0 
                        ? charIndex 
                        : welcomeText.split(" ")[0].length + 1 + charIndex;
                    return (
                      <motion.span
                        key={charIndex}
                        initial={{ opacity: 0, y: 25, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 1.2,
                          delay: 0.4 + absoluteIndex * 0.08,
                          ease: smoothEase,
                        }}
                        className="inline-block"
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </span>
              ))}
            </h1>

            {/* Cinematic Subtext Hierarchy - Slower reveal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 1.8, 
                duration: 1.5, 
                ease: smoothEase 
              }}
              className="flex flex-col items-center mt-2 w-full"
            >
              {/* KKN Header - clean light caps in premium blue */}
              <span className="text-[10px] md:text-[11px] font-semibold tracking-[0.35em] text-[#60A5FA] uppercase">
                KKN KELOMPOK 35
              </span>
              
              {/* Village Name - prominent bold white with soft blue glow */}
              <h2 className="text-xl md:text-2xl font-black tracking-[0.18em] text-white uppercase mt-2" style={{ textShadow: '0 0 12px rgba(0,113,227,0.3)' }}>
                DESA TANJUNG GELAM
              </h2>
              
              {/* Elegant Centered Divider */}
              <div className="h-[1px] w-28 bg-gradient-to-r from-transparent via-white/15 to-transparent my-4" />
              
              {/* University Details - guaranteed single line credit */}
              <p className="text-[9px] md:text-[10px] font-semibold tracking-[0.2em] text-slate-400 uppercase whitespace-nowrap">
                Universitas Muhammadiyah Palembang
              </p>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
