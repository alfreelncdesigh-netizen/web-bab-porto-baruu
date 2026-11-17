import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const INTRO_LOGO_VIDEO_SRC = '/assets/aistudio/animasi_logo_4286200d.mp4';

interface IntroVideoSplashProps {
  onComplete: () => void;
}

const INTRO_DURATION_MS = 2000;
const SAFETY_TIMEOUT_MS = 3500;
const FADE_DURATION_MS = 220;
const REDUCED_MOTION_FADE_MS = 100;

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearResidualPageLocks() {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.touchAction = '';
  document.body.style.filter = '';
  document.body.style.pointerEvents = '';
}

export default function IntroVideoSplash({ onComplete }: IntroVideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<'playing' | 'fading'>('playing');
  const [reducedMotion, setReducedMotion] = useState<boolean>(getPrefersReducedMotion);
  const [showPromptHelper, setShowPromptHelper] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const playStartedAtRef = useRef<number | null>(null);
  const isFinishingRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (durationTimerRef.current !== null) {
      window.clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startFadeOut = useCallback((customFadeMs?: number) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    if (durationTimerRef.current !== null) {
      window.clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    clearResidualPageLocks();
    setPhase('fading');

    const durationMs =
      typeof customFadeMs === 'number'
        ? customFadeMs
        : getPrefersReducedMotion()
        ? REDUCED_MOTION_FADE_MS
        : FADE_DURATION_MS;

    fadeTimerRef.current = window.setTimeout(() => {
      fadeTimerRef.current = null;
      clearResidualPageLocks();
      onCompleteRef.current();
    }, durationMs);
  }, []);

  // Pastikan atribut HTML muted/playsinline terpasang sinkron sebelum browser mengevaluasi autoplay
  useLayoutEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.loop = false;
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');
    videoEl.setAttribute('autoplay', '');
  }, []);

  // Pantau preferensi prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    setReducedMotion(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Kunci scroll hanya selama intro aktif
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      clearAllTimers();
      clearResidualPageLocks();
    };
  }, [clearAllTimers]);

  // Putar video setiap kali website dimuat & siapkan durasi 2 detik + batas pengaman
  useEffect(() => {
    const videoEl = videoRef.current;

    safetyTimerRef.current = window.setTimeout(() => {
      startFadeOut();
    }, SAFETY_TIMEOUT_MS);

    if (!videoEl) {
      return () => {
        clearAllTimers();
      };
    }

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.loop = false;

    const attemptPlay = () => {
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setShowPromptHelper(true);
          if (durationTimerRef.current === null) {
            durationTimerRef.current = window.setTimeout(() => {
              startFadeOut();
            }, INTRO_DURATION_MS);
          }
        });
      }
    };

    if (videoEl.readyState >= 2) {
      attemptPlay();
    } else {
      attemptPlay();
      videoEl.addEventListener('canplay', attemptPlay, { once: true });
    }

    return () => {
      videoEl.removeEventListener('canplay', attemptPlay);
      clearAllTimers();
    };
  }, [startFadeOut, clearAllTimers]);

  const handleVideoPlaying = () => {
    if (playStartedAtRef.current !== null) return;
    playStartedAtRef.current = Date.now();
    if (durationTimerRef.current !== null) {
      window.clearTimeout(durationTimerRef.current);
    }
    durationTimerRef.current = window.setTimeout(() => {
      startFadeOut();
    }, INTRO_DURATION_MS);
  };

  const handleVideoEnded = () => {
    if (playStartedAtRef.current === null) {
      startFadeOut();
      return;
    }
    const elapsed = Date.now() - playStartedAtRef.current;
    const remaining = Math.max(0, INTRO_DURATION_MS - elapsed);
    if (remaining <= 150) {
      startFadeOut();
    }
  };

  const handleVideoError = () => {
    setShowPromptHelper(true);
    if (durationTimerRef.current === null) {
      durationTimerRef.current = window.setTimeout(() => {
        startFadeOut();
      }, INTRO_DURATION_MS);
    }
  };

  const handleSkipClick = () => {
    startFadeOut(reducedMotion ? 0 : 180);
  };

  const fadeMs = reducedMotion ? REDUCED_MOTION_FADE_MS : FADE_DURATION_MS;

  const splashContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Animasi Pembuka Logo Alfreelnc Design"
      style={{ transitionDuration: `${fadeMs}ms` }}
      className={`fixed inset-0 z-[200000] flex items-center justify-center bg-[#0f1015] overflow-hidden select-none transition-opacity ease-out ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Container 1:1 dengan dimensi eksplisit & batas viewport agar tampil jelas di semua perangkat */}
      <div className="relative flex items-center justify-center w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] lg:w-[440px] lg:h-[440px] max-w-[82vw] max-h-[82vh] aspect-square">
        <video
          ref={videoRef}
          src={INTRO_LOGO_VIDEO_SRC}
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onPlaying={handleVideoPlaying}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          className="w-full h-full object-contain block pointer-events-none"
        />
      </div>

      {/* Tombol Lewati */}
      {phase === 'playing' && (
        <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-10 flex items-center gap-3 pointer-events-auto">
          {showPromptHelper && (
            <span className="text-xs text-white/75">
              Ketuk untuk masuk ke beranda
            </span>
          )}
          <button
            type="button"
            onClick={handleSkipClick}
            className="min-h-[40px] px-4 py-2 rounded-full bg-white/12 hover:bg-white/22 border border-white/20 text-xs font-medium tracking-wide text-white transition-colors active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Lewati
          </button>
        </div>
      )}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(splashContent, document.body);
  }

  return splashContent;
}
