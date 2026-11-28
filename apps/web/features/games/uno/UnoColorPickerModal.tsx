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

const COLOR_STYLES: Record<UnoColor, { bg: string; glow: string; ring: string; dot: string }> = {
  red: {
    bg: 'linear-gradient(135deg, #FB7185 0%, #EF4444 45%, #B91C1C 100%)',
    glow: 'rgba(239, 68, 68, 0.55)',
    ring: 'rgba(254, 202, 202, 0.8)',
    dot: '#FECACA',
  },
  blue: {
    bg: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 50%, #1D4ED8 100%)',
    glow: 'rgba(37, 99, 235, 0.6)',
    ring: 'rgba(186, 230, 253, 0.85)',
    dot: '#BAE6FD',
  },
  green: {
    bg: 'linear-gradient(135deg, #34D399 0%, #10B981 48%, #047857 100%)',
    glow: 'rgba(16, 185, 129, 0.55)',
    ring: 'rgba(167, 243, 208, 0.8)',
    dot: '#A7F3D0',
  },
  yellow: {
    bg: 'linear-gradient(135deg, #FDE047 0%, #F59E0B 52%, #B45309 100%)',
    glow: 'rgba(245, 158, 11, 0.55)',
    ring: 'rgba(254, 240, 138, 0.85)',
    dot: '#FEF08A',
  },
};

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
        initial={{ scale: 0.78, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden border border-white/20"
        style={{
          background: 'linear-gradient(160deg, rgba(16, 24, 42, 0.96) 0%, rgba(7, 11, 22, 0.98) 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 50px rgba(168,85,247,0.22)',
        }}
      >
        {/* Top rainbow glow bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #EF4444, #3B82F6, #10B981, #F59E0B)',
          }}
        />

        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-[11px] font-black uppercase tracking-wider mb-3 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
          {isWildDraw4 ? 'Wild +4 Bom Warna' : 'Kartu Wild'}
        </div>

        <h3 className="text-xl font-black text-white tracking-tight mb-1">Pilih Warna Meja</h3>
        <p className="text-xs text-slate-400 mb-5">
          Pilih warna aktif selanjutnya untuk seluruh pemain
        </p>

        <div className="grid grid-cols-2 gap-3.5">
          {COLORS.map((col) => {
            const meta = UNO_COLOR_META[col];
            const style = COLOR_STYLES[col];
            return (
              <motion.button
                key={col}
                type="button"
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectColor(col)}
                className="h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-white font-black text-base cursor-pointer relative overflow-hidden group"
                style={{
                  background: style.bg,
                  borderColor: style.ring,
                  boxShadow: `0 12px 28px -6px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.45)`,
                }}
              >
                {/* Glossy highlight */}
                <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/25 blur-md pointer-events-none group-hover:scale-125 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

                <span
                  className="w-5 h-5 rounded-full border-2 border-white/80 shadow-md"
                  style={{ backgroundColor: style.dot }}
                />
                <span className="text-base sm:text-lg font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
                  {meta.label.toUpperCase()}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
