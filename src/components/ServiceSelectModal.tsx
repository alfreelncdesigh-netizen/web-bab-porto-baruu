import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  LayoutTemplate, 
  Instagram, 
  Award, 
  Mail, 
  Image as ImageIcon, 
  Flag, 
  Presentation, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export interface ServiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const servicesList: ServiceOption[] = [
  {
    id: 'Poster',
    name: 'Poster',
    category: 'Promosi & Event',
    description: 'Desain poster promosi event, konser, seminar, kampanye, atau infografis visual.',
    icon: LayoutTemplate
  },
  {
    id: 'Feed & Story Instagram',
    name: 'Feed & Story Instagram',
    category: 'Social Media',
    description: 'Konten feed terstruktur, carousel informatif, dan template story estetik profesional.',
    icon: Instagram
  },
  {
    id: 'Sertifikat',
    name: 'Sertifikat',
    category: 'Dokumen Resmi',
    description: 'Piagam penghargaan, sertifikat kelulusan, webinar, kompetisi, dan workshop.',
    icon: Award
  },
  {
    id: 'Undangan',
    name: 'Undangan',
    category: 'Acara & Momen',
    description: 'Undangan digital atau cetak pernikahan, perayaan ulang tahun, pesta & agenda formal.',
    icon: Mail
  },
  {
    id: 'Banner',
    name: 'Banner',
    category: 'Digital Ads',
    description: 'Banner promosi website, e-commerce, Google ads, atau marketplace shop banner.',
    icon: ImageIcon
  },
  {
    id: 'Spanduk',
    name: 'Spanduk',
    category: 'Outdoor Print',
    description: 'Spanduk kain/flexi outdoor, backdrop panggung kegiatan, standing banner & baliho.',
    icon: Flag
  },
  {
    id: 'PowerPoint',
    name: 'PowerPoint',
    category: 'Presentasi',
    description: 'Slide presentasi bisnis, investor pitch deck, materi kuliah, dan company profile.',
    icon: Presentation
  },
  {
    id: 'Lainnya',
    name: 'Lainnya',
    category: 'Kustom Khusus',
    description: 'Kebutuhan desain grafis unik lainnya sesuai permintaan spesifik Anda.',
    icon: Sparkles
  }
];

interface ServiceSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: string;
  onSelectService: (serviceName: string) => void;
}

export const ServiceSelectModal: React.FC<ServiceSelectModalProps> = ({
  isOpen,
  onClose,
  selectedService,
  onSelectService
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#111111] rounded-2xl md:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="p-3 md:p-6 pb-2.5 md:pb-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-start justify-between shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[9px] md:text-[10px] font-bold tracking-wider uppercase text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Layanan Desain
                </div>
                <h3 className="text-base md:text-2xl font-black text-black dark:text-white tracking-tight">
                  Pilih Jenis Layanan
                </h3>
                <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Tentukan jenis output desain yang ingin Anda kerjakan bersama kami
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pop up"
                className="p-1.5 md:p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* Service Grid Body */}
            <div className="p-2.5 md:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3.5">
                {servicesList.map((svc) => {
                  const Icon = svc.icon;
                  const isSelected = selectedService === svc.name;

                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        onSelectService(svc.name);
                        onClose();
                      }}
                      className={`group relative text-left p-2.5 md:p-4 rounded-lg md:rounded-2xl transition-all border flex items-start gap-3 md:gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent shadow-lg shadow-black/10 dark:shadow-white/10'
                          : 'bg-zinc-50/60 dark:bg-zinc-900/40 text-black dark:text-white border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/80 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-7 h-7 md:w-11 md:h-11 rounded-md md:rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white/20 dark:bg-black/10 text-white dark:text-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <span
                          className={`block text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-0.5 ${
                            isSelected
                              ? 'text-zinc-300 dark:text-zinc-600'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {svc.category}
                        </span>
                        <h4 className="text-[11px] md:text-sm font-bold tracking-tight truncate mb-0.5">
                          {svc.name}
                        </h4>
                        <p className={`text-[9px] md:text-[11px] leading-tight md:leading-relaxed line-clamp-2 font-normal ${
                            isSelected
                              ? 'text-zinc-200 dark:text-zinc-700'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {svc.description}
                        </p>
                      </div>

                      {/* Selected checkmark indicator */}
                      {isSelected ? (
                        <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white dark:bg-black text-black dark:text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer note */}
            <div className="p-3 md:p-4 px-4 md:px-6 bg-zinc-50 dark:bg-[#0E0E0E] border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
              <span>Klik pada salah satu layanan untuk memilih langsung.</span>
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] md:text-xs font-bold text-black dark:text-white hover:underline cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
