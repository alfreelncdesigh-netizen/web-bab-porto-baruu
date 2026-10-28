import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface AppLoaderProps {
  onComplete?: () => void;
}

export default function AppLoader({ onComplete }: AppLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animasi progress memuat 20% konten awal secara bertahap & halus
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 20) {
          clearInterval(interval);
          return 20;
        }
        // Naik bertahap dari 0 ke 20% dalam rentang waktu ~1 detik
        return prev + 1;
      });
    }, 55);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[99999] bg-[#09090b] flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Efek pendaran cahaya ambient di latar belakang (halus & mewah) */}
      <div className="absolute w-[340px] sm:w-[480px] md:w-[560px] h-[340px] sm:h-[480px] md:h-[560px] rounded-full bg-gradient-to-tr from-purple-600/10 via-zinc-400/5 to-blue-600/10 blur-[90px] sm:blur-[120px] pointer-events-none" />

      {/* Kontainer Utama Terpusat */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md w-full px-4">
        
        {/* 1. Loading Berputar di Layar (Minimalist Aesthetic Dual-Ring Spinner) */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-8 sm:mb-10 flex items-center justify-center">
          {/* Cincin statis tipis latar belakang */}
          <div className="absolute inset-0 rounded-full border-[1.5px] border-white/10" />

          {/* Cincin berputar utama dengan gradasi perak putih */}
          <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-white border-r-zinc-300 animate-spin [animation-duration:0.9s] shadow-[0_0_15px_rgba(255,255,255,0.25)]" />

          {/* Cincin dalam dengan putaran berlawanan arah */}
          <div className="absolute inset-2 sm:inset-2.5 rounded-full border-[1.5px] border-transparent border-b-zinc-400 border-l-zinc-600 animate-spin [animation-duration:1.4s] [animation-direction:reverse] opacity-70" />

          {/* Angka persentase 20% di tengah cincin */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className="text-[12px] sm:text-[13px] font-mono font-bold tracking-tight text-white drop-shadow-sm">
              {progress}%
            </span>
          </div>
        </div>

        {/* 2. Logo Alfreelnc Berwarna Putih dengan Gradasi Hitam Silver yang Berjalan di Logonya */}
        <div className="relative w-full max-w-[240px] sm:max-w-[300px] md:max-w-[360px] aspect-[415/92] flex items-center justify-center mb-6">
          <svg viewBox="0 0 415 92" className="w-full h-auto drop-shadow-[0_4px_24px_rgba(255,255,255,0.12)]" fill="none">
            <defs>
              {/* Gradasi Hitam-Silver-Putih Metalik yang Berjalan Melintasi Teks Logo */}
              <linearGradient id="alfreelncSilverShine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#f4f4f5" />
                <stop offset="38%" stopColor="#18181b" />
                <stop offset="47%" stopColor="#a1a1aa" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="53%" stopColor="#d4d4d8" />
                <stop offset="62%" stopColor="#27272a" />
                <stop offset="75%" stopColor="#f4f4f5" />
                <stop offset="100%" stopColor="#ffffff" />
                <animate 
                  attributeName="x1" 
                  from="-140%" 
                  to="140%" 
                  dur="2.4s" 
                  repeatCount="indefinite" 
                />
                <animate 
                  attributeName="x2" 
                  from="-40%" 
                  to="240%" 
                  dur="2.4s" 
                  repeatCount="indefinite" 
                />
              </linearGradient>
            </defs>

            {/* Titik Aksen Ungu Khas Brand Alfreelnc (Kiri Atas) */}
            <circle cx="20" cy="26" r="15" fill="#6e2594" />

            {/* Teks ALFREELNC Berwarna Putih dengan Pantulan Gradasi Hitam Silver */}
            <text 
              x="44" 
              y="70" 
              fill="url(#alfreelncSilverShine)"
              fontFamily="'Outfit', 'Plus Jakarta Sans', sans-serif" 
              fontWeight="900" 
              fontSize="65" 
              letterSpacing="-2.5"
            >
              ALFREELNC
            </text>

            {/* Titik Aksen Biru Khas Brand Alfreelnc (Kanan Bawah) */}
            <circle cx="394" cy="58" r="15.5" fill="#0050a4" />
          </svg>
        </div>

        {/* 3. Bar Progres Indikator Memuat 20% Konten Website */}
        <div className="w-40 sm:w-48 h-[2.5px] bg-zinc-800/80 rounded-full overflow-hidden relative mb-3">
          <div 
            className="h-full bg-gradient-to-r from-zinc-500 via-white to-zinc-300 rounded-full transition-all duration-150 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
            style={{ width: `${(progress / 20) * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-zinc-400 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Memuat 20% konten website...</span>
        </div>

      </div>
    </motion.div>
  );
}
