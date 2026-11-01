import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-[99] flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-zinc-900/95 dark:bg-zinc-800/95 text-amber-300 border border-amber-500/30 shadow-2xl backdrop-blur-md text-xs font-medium animate-fadeIn"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <span>Mode Offline — Menampilkan snapshot & aset tersimpan</span>
    </div>
  );
};
