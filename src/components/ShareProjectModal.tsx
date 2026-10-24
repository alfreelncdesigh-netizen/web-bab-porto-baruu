import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, Share2, ExternalLink, Sparkles } from 'lucide-react';
import { Project } from '../data/projects';
import { resolveImageUrl } from '../lib/imageResolver';

interface ShareProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onLinkCopied?: () => void;
}

interface SocialPlatform {
  id: 'whatsapp' | 'instagram' | 'tiktok' | 'telegram' | 'pinterest' | 'facebook';
  name: string;
  bgClass: string;
  icon: React.ReactNode;
  getShareUrl: (url: string, title: string, image: string) => string;
  actionType: 'open_url' | 'copy_and_open';
  customNotice?: string;
}

export default function ShareProjectModal({
  project,
  isOpen,
  onClose,
  onLinkCopied,
}: ShareProjectModalProps) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  // Generate shareable link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://alfreelnc.com';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const shareUrl = `${origin}${pathname}?project=${project.id}`;
  const shareTitle = `Lihat karya portofolio "${project.title}" oleh Alfreelnc Studio`;
  const shareText = `Halo! Lihat karya desain menarik ini: "${project.title}" di Alfreelnc Studio:\n${shareUrl}`;
  const projectImageUrl = project.image ? resolveImageUrl(project.image) : '';

  const copyToClipboard = async (customFeedback?: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToastMessage(customFeedback || 'Tautan berhasil disalin ke clipboard!');
      onLinkCopied?.();
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 2500);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setToastMessage(customFeedback || 'Tautan berhasil disalin ke clipboard!');
      onLinkCopied?.();
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 2500);
    }
  };

  // Only the 6 requested social media platforms
  const socialPlatforms: SocialPlatform[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      bgClass: 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg shadow-[#25D366]/25',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      actionType: 'open_url',
      getShareUrl: (url, title) => `https://api.whatsapp.com/send?text=${encodeURIComponent(`Halo! Lihat portofolio karya "${title}" di Alfreelnc Studio: ${url}`)}`,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      bgClass: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] via-[#cc2366] to-[#bc1888] hover:opacity-95 text-white shadow-lg shadow-pink-500/25',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-8 sm:h-8">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      ),
      actionType: 'copy_and_open',
      customNotice: 'Tautan disalin! Membuka Instagram untuk dibagikan ke Story atau DM...',
      getShareUrl: () => 'https://www.instagram.com/',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      bgClass: 'bg-black hover:bg-zinc-900 text-white border border-zinc-800 shadow-lg shadow-black/40',
      icon: (
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.34 0 .66.06.96.17V9.45a6.34 6.34 0 00-.96-.07A6.34 6.34 0 003.15 15.72a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.71a8.21 8.21 0 004.76 1.52v-3.45a4.85 4.85 0 01-1-.09z"/>
          </svg>
        </div>
      ),
      actionType: 'copy_and_open',
      customNotice: 'Tautan disalin! Membuka TikTok untuk dibagikan...',
      getShareUrl: () => 'https://www.tiktok.com/',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      bgClass: 'bg-[#229ED9] hover:bg-[#1f8fc4] text-white shadow-lg shadow-[#229ED9]/25',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      actionType: 'open_url',
      getShareUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Portofolio Desain: "${title}" di Alfreelnc Studio`)}`,
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      bgClass: 'bg-[#E60023] hover:bg-[#cc001f] text-white shadow-lg shadow-[#E60023]/25',
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" fill="none">
          <circle cx="12" cy="12" r="10" fill="white" />
          <path
            fill="#E60023"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.31-.09-.79-.17-2 .04-2.87.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.49c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.81 1.48 1.81 1.78 0 3.14-1.87 3.14-4.58 0-2.39-1.72-4.06-4.18-4.06-2.85 0-4.52 2.14-4.52 4.34 0 .86.33 1.78.74 2.28.08.1.09.19.07.29-.08.31-.25 1-.28 1.14-.04.19-.14.23-.33.14-1.25-.58-2.03-2.41-2.03-3.88 0-3.15 2.29-6.05 6.61-6.05 3.47 0 6.17 2.47 6.17 5.78 0 3.45-2.18 6.23-5.2 6.23-1.01 0-1.97-.53-2.3-1.15l-.63 2.38c-.23.87-.84 1.96-1.25 2.63 1.02.31 2.1.48 3.22.48 5.52 0 10-4.48 10-10S17.52 2 12 2z"
          />
        </svg>
      ),
      actionType: 'open_url',
      getShareUrl: (url, title, image) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(`Portofolio Desain "${title}" - Alfreelnc Studio`)}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      bgClass: 'bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-lg shadow-[#1877F2]/25',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      actionType: 'open_url',
      getShareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  const handlePlatformClick = async (platform: SocialPlatform) => {
    // Selalu salin tautan terlebih dahulu ke clipboard agar siap dibagikan/ditempel
    await copyToClipboard(platform.customNotice);

    const targetUrl = platform.getShareUrl(shareUrl, project.title, projectImageUrl);
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer,width=640,height=580');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="relative w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 text-zinc-900 dark:text-white z-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate">Bagikan Karya</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {project.title}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Project Preview Badge */}
          <div className="mt-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3">
            {project.image ? (
              <img
                src={projectImageUrl}
                alt={project.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-black/10 dark:border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {project.category}
              </span>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {project.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                Tautan langsung khusus karya ini
              </p>
            </div>
          </div>

          {/* Social Media Grid (Only WhatsApp, Instagram, TikTok, Telegram, Pinterest, Facebook) */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Pilih Media Sosial
              </span>
              <span className="text-[11px] text-zinc-400">
                6 Pilihan
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  className="group flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all duration-200 active:scale-95 cursor-pointer"
                  title={`Bagikan ke ${platform.name}`}
                >
                  <div
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 active:scale-95 ${platform.bgClass}`}
                  >
                    {platform.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mt-2 tracking-tight group-hover:text-black dark:group-hover:text-white">
                    {platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link Copy Input */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Atau Salin Tautan Langsung:
            </label>
            <div className="flex items-center gap-2 p-1.5 pl-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 outline-none truncate select-all font-mono"
              />
              <button
                type="button"
                onClick={() => copyToClipboard()}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Toast Notification Alert */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 left-4 right-4 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-xl border border-zinc-800 dark:border-zinc-200 flex items-center justify-center gap-2 z-30"
              >
                <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
                <span className="truncate">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
