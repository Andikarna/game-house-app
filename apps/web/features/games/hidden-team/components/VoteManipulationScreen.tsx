'use client';

import React from 'react';
import {
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPrivate,
  VoteCard,
} from '@gamehouse/shared';
import { Eye, Clock, Check, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ActiveMainCardBanner } from './ActiveMainCardBanner';

interface VoteManipulationScreenProps {
  state: HiddenTeamPublicGameState;
  privateState: HiddenTeamPlayerPrivate | null;
  onInspectDecision: (decision: 'KEEP' | 'DISCARD') => void;
}

export const VoteManipulationScreen: React.FC<VoteManipulationScreenProps> = ({
  state,
  privateState,
  onInspectDecision,
}) => {
  const isRole4 = privateState?.currentRole === 'ROLE_4_INSPECTOR';
  const inspectedCard = privateState?.role4InspectedCard;

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Active Main Card Showcase */}
      <ActiveMainCardBanner card={state.activeMainCard} />

      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-black uppercase tracking-wider mb-2">
          <Eye className="w-3.5 h-3.5 text-pink-400" /> Fase 6 — Manipulasi Kotak Suara
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isRole4 ? 'Inspeksi Kartu Suara Acak' : 'Pemeriksaan Kotak Suara'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
          {isRole4
            ? 'Server telah mengambil 1 kartu acak dari kotak suara tanpa mengungkap pemilik aslinya. Tentukan nasib kartu ini!'
            : 'Inspektur Kotak Suara (Role 4) sedang memeriksa 1 kartu acak yang diserahkan dan memutuskan untuk KEEP atau DISCARD.'}
        </p>

        {/* Phase Timer */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 text-xs font-black mt-2.5">
          <Clock className="w-3.5 h-3.5" /> {state.phaseTimer}s tersisa
        </div>
      </div>

      {/* Screen for Role 4 */}
      {isRole4 && inspectedCard ? (
        <div className="w-full max-w-md space-y-5">
          <div
            className={`p-5 rounded-2xl border transition-all text-center flex flex-col justify-between ${
              inspectedCard.faction === 'RED'
                ? 'bg-rose-950/60 border-rose-500 shadow-glow-orange'
                : inspectedCard.faction === 'BLUE'
                ? 'bg-sky-950/60 border-sky-500 shadow-glow-primary'
                : 'bg-slate-800/80 border-amber-400 shadow-glow-orange'
            }`}
          >
            <div>
              <span className="text-4xl mb-2 block">
                {inspectedCard.faction === 'RED' ? '⚔️' : inspectedCard.faction === 'BLUE' ? '🌊' : '⚖️'}
              </span>

              <span
                className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border inline-block mb-2 ${
                  inspectedCard.faction === 'RED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : inspectedCard.faction === 'BLUE'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-700 text-amber-200 border-slate-500'
                }`}
              >
                Faksi Kartu: {inspectedCard.faction}
              </span>

              <h3 className="text-lg font-black text-white mb-1">
                {inspectedCard.title}
              </h3>
              <p className="text-xs text-slate-300 mb-3">
                {inspectedCard.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Pemilik kartu dirahasiakan oleh sistem dewan.
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onInspectDecision('KEEP')}
              className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>KEEP (Simpan)</span>
            </button>

            <button
              onClick={() => onInspectDecision('DISCARD')}
              className="px-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>DISCARD (Buang)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Waiting State for Other Players */
        <div className="w-full max-w-md p-6 sm:p-8 bg-surface-elevated/80 border border-slate-800 rounded-3xl text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            👁️
          </div>
          <h4 className="text-base font-black text-white mb-2">
            Inspektur Kotak Suara Sedang Bertindak
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Satu kartu mandat sedang diteliti. Keputusan KEEP atau DISCARD akan memengaruhi total akhir perhitungan suara faksi.
          </p>
          <div className="mt-5 flex justify-center items-center gap-1.5 text-xs text-pink-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span>Menunggu keputusan inspeksi...</span>
          </div>
        </div>
      )}
    </div>
  );
};
