import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Jika sudah terpasang sebagai aplikasi mandiri (standalone), sembunyikan tombol
  if (isInstalled) {
    return null;
  }

  // Flow browser Chromium, Android, atau Desktop
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Pasang Aplikasi Portofolio (Akses Offline Cepat)"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all shadow-sm ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // Flow iOS Safari (Safari tidak mendukung beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Pasang ke Layar Utama iPhone/iPad"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-fadeIn">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Pasang di iPhone / iPad</h3>
              <div className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 space-y-2">
                <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah navigasi Safari.</p>
                <p>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                <p>3. Portofolio siap diakses langsung dengan pemuatan instan & mode offline.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900 transition hover:opacity-90"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
