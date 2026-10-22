import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isProcessing?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  // Optional secondary action (e.g., delete folder vs delete folder + items)
  secondaryAction?: {
    text: string;
    onAction: () => void | Promise<void>;
  };
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onClose,
  secondaryAction
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'primary':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'danger':
      default:
        return {
          iconBg: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#111111] w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden text-left"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4 mb-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
              {variant === 'danger' ? (
                <Trash2 size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <div className="pr-6">
              <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${styles.confirmBtn}`}
              >
                {isProcessing && <RefreshCw size={14} className="animate-spin" />}
                {confirmText}
              </button>
            </div>

            {secondaryAction && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={secondaryAction.onAction}
                  className="w-full text-center py-2 text-[11px] font-semibold text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  {secondaryAction.text}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
