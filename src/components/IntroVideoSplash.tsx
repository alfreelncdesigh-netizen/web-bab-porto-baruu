import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const INTRO_LOGO_VIDEO_SRC = '/assets/aistudio/animasi_logo_cafcdb69.mp4';

interface IntroVideoSplashProps {
  onComplete: () => void;
  onThreeSecondsElapsed?: () => void;
  holdForCookieConsent?: boolean;
}

const INTRO_DURATION_MS = 3000;
const SAFETY_TRIGGER_MS = 3500;
const FADE_DURATION_MS = 280;
const REDUCED_MOTION_FADE_MS = 120;

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

export default function IntroVideoSplash({
  onComplete,
  onThreeSecondsElapsed,
  holdForCookieConsent = false,
}: IntroVideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<'playing' | 'awaiting_cookie' | 'fading'>('playing');
  const [threeSecondsDone, setThreeSecondsDone] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(getPrefersReducedMotion);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onThreeSecondsElapsedRef = useRef(onThreeSecondsElapsed);
  onThreeSecondsElapsedRef.current = onThreeSecondsElapsed;

  const holdForCookieConsentRef = useRef(holdForCookieConsent);
  holdForCookieConsentRef.current = holdForCookieConsent;

  const playStartedAtRef = useRef<number | null>(null);
  const isFinishingRef = useRef(false);
  const threeSecondsTriggeredRef = useRef(false);
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

  const handleThreeSecondsReached = useCallback(() => {
    if (threeSecondsTriggeredRef.current) return;
    threeSecondsTriggeredRef.current = true;

    if (durationTimerRef.current !== null) {
      window.clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    setThreeSecondsDone(true);
    onThreeSecondsElapsedRef.current?.();

    if (holdForCookieConsentRef.current) {
      setPhase('awaiting_cookie');
    } else {
      startFadeOut();
    }
  }, [startFadeOut]);

  // Saat cookie consent selesai diberikan ketika splash sedang menahan tampilan, segera fade-out ke beranda
  useEffect(() => {
    if (threeSecondsDone && !holdForCookieConsent) {
      startFadeOut();
    }
  }, [threeSecondsDone, holdForCookieConsent, startFadeOut]);

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

  // Putar video setiap kali website dimuat & siapkan durasi 3 detik + batas pengaman
  useEffect(() => {
    const videoEl = videoRef.current;

    safetyTimerRef.current = window.setTimeout(() => {
      handleThreeSecondsReached();
    }, SAFETY_TRIGGER_MS);

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
          if (durationTimerRef.current === null) {
            durationTimerRef.current = window.setTimeout(() => {
              handleThreeSecondsReached();
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
  }, [handleThreeSecondsReached, clearAllTimers]);

  const handleVideoPlaying = () => {
    if (playStartedAtRef.current !== null) return;
    playStartedAtRef.current = Date.now();
    if (durationTimerRef.current !== null) {
      window.clearTimeout(durationTimerRef.current);
    }
    durationTimerRef.current = window.setTimeout(() => {
      handleThreeSecondsReached();
    }, INTRO_DURATION_MS);
  };

  const handleVideoEnded = () => {
    if (playStartedAtRef.current === null) {
      handleThreeSecondsReached();
      return;
    }
    const elapsed = Date.now() - playStartedAtRef.current;
    const remaining = Math.max(0, INTRO_DURATION_MS - elapsed);
    if (remaining <= 150) {
      handleThreeSecondsReached();
    }
  };

  const handleVideoError = () => {
    if (durationTimerRef.current === null) {
      durationTimerRef.current = window.setTimeout(() => {
        handleThreeSecondsReached();
      }, INTRO_DURATION_MS);
    }
  };

  const fadeMs = reducedMotion ? REDUCED_MOTION_FADE_MS : FADE_DURATION_MS;
  const isAwaitingCookie = phase === 'awaiting_cookie';

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
      {/* Container 1:1 dengan posisi adaptif saat pop up cookie muncul setelah 3 detik */}
      <div
        className={`relative flex items-center justify-center w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px] max-w-[78vw] max-h-[60vh] aspect-square transition-transform duration-500 ease-out ${
          isAwaitingCookie ? '-translate-y-24 sm:-translate-y-20 scale-90 sm:scale-95' : 'translate-y-0 scale-100'
        }`}
      >
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
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(splashContent, document.body);
  }

  return splashContent;
}
