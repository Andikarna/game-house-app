'use client';

import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGameStore();

  const iconMap = {
    info: <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />,
  };

  const borderMap = {
    info: 'border-cyan-500/40 bg-slate-900/95 shadow-md',
    success: 'border-emerald-500/40 bg-slate-900/95 shadow-md shadow-emerald-500/10',
    warning: 'border-amber-500/40 bg-slate-900/95 shadow-md',
    error: 'border-rose-500/40 bg-slate-900/95 shadow-md shadow-rose-500/10',
  };

  return (
    <div className="fixed top-14 right-2.5 sm:top-auto sm:bottom-16 sm:right-5 max-w-[230px] sm:max-w-xs w-auto z-50 flex flex-col gap-1.5 pointer-events-none items-end pt-[env(safe-area-inset-top,0px)]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border md:backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold shadow-lg ${borderMap[toast.type]}`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {iconMap[toast.type]}
              <span className="leading-snug break-words">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 shrink-0"
              title="Close notification"
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
