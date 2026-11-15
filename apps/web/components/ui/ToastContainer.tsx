import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGameStore();

  const iconMap = {
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  };

  const borderMap = {
    info: 'border-cyan-500/40 bg-slate-900/90 shadow-glow-cyan',
    success: 'border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-emerald-500/20',
    warning: 'border-amber-500/40 bg-slate-900/90 shadow-glow-orange',
    error: 'border-rose-500/40 bg-slate-900/90 shadow-lg shadow-rose-500/20',
  };

  return (
    <div className="fixed top-3 inset-x-3 sm:top-auto sm:bottom-6 sm:inset-x-auto sm:right-6 sm:max-w-sm sm:w-full z-50 flex flex-col gap-2 pointer-events-none items-center sm:items-end pt-[env(safe-area-inset-top,0px)]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer w-full max-w-sm flex items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl border backdrop-blur-md text-white text-xs sm:text-sm font-semibold shadow-2xl ${borderMap[toast.type]}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {iconMap[toast.type]}
              <span className="leading-snug break-words">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
