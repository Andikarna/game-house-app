'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UnoColor, UNO_COLOR_META } from '@gamehouse/shared';
import { Sparkles, X } from 'lucide-react';

interface UnoColorPickerModalProps {
  isOpen: boolean;
  isWildDraw4: boolean;
  onSelectColor: (color: UnoColor) => void;
  onCancel: () => void;
}

const COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

export const UnoColorPickerModal: React.FC<UnoColorPickerModalProps> = ({
  isOpen,
  isWildDraw4,
  onSelectColor,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.78, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        className="w-full max-w-sm bg-surface/95 border border-purple-500/40 rounded-3xl p-6 shadow-2xl text-center relative"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-300 text-[11px] font-black uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {isWildDraw4 ? 'Wild +4 Bom Warna' : 'Kartu Wild'}
        </div>

        <h3 className="text-xl font-black text-white mb-1">Pilih Warna Meja</h3>
        <p className="text-xs text-slate-400 mb-5">
          Pilih warna aktif selanjutnya untuk seluruh pemain
        </p>

        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((col) => {
            const meta = UNO_COLOR_META[col];
            return (
              <motion.button
                key={col}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectColor(col)}
                className={`h-24 rounded-2xl bg-gradient-to-br ${meta.gradient} border-2 border-white/70 flex flex-col items-center justify-center gap-1 text-white font-black text-base shadow-xl cursor-pointer relative overflow-hidden`}
                style={{ boxShadow: `0 10px 28px -4px ${meta.glow}` }}
              >
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/25 blur-md pointer-events-none" />
                <span className="text-lg tracking-wide drop-shadow">{meta.label.toUpperCase()}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
