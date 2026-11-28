'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UnoPlayerPublic } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Repeat, X } from 'lucide-react';

interface UnoSwapTargetModalProps {
  isOpen: boolean;
  opponents: UnoPlayerPublic[];
  onSelectTarget: (playerId: string) => void;
  onCancel: () => void;
}

export const UnoSwapTargetModal: React.FC<UnoSwapTargetModalProps> = ({
  isOpen,
  opponents,
  onSelectTarget,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        className="w-full max-w-md bg-surface/95 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-2">
            <Repeat className="w-3.5 h-3.5" />
            Chaos 7 — Tukar Tangan!
          </div>
          <h3 className="text-xl font-black text-white">Pilih Lawan untuk Tukar Kartu</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Incar pemain dengan jumlah kartu paling sedikit!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {opponents.map((opp) => (
            <button
              key={opp.playerId}
              type="button"
              onClick={() => onSelectTarget(opp.playerId)}
              className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-surface-elevated/90 border border-slate-700 hover:border-cyan-400 hover:bg-cyan-500/15 transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ClimberAvatarIcon avatar={opp.avatar} size={40} shape="circle" />
                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate">{opp.nickname}</div>
                  <div className="text-[10px] text-slate-400">Kursi #{opp.seatIndex + 1}</div>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs group-hover:scale-105 transition-transform">
                🃏 {opp.cardCount}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
