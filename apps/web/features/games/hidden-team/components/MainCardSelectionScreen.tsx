'use client';

import React, { useState } from 'react';
import {
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPrivate,
  MainCard,
} from '@gamehouse/shared';
import { Crown, Sparkles, Clock, Check } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

interface MainCardSelectionScreenProps {
  state: HiddenTeamPublicGameState;
  privateState: HiddenTeamPlayerPrivate | null;
  onSelectMainCard: (cardId: string) => void;
}

export const MainCardSelectionScreen: React.FC<MainCardSelectionScreenProps> = ({
  state,
  privateState,
  onSelectMainCard,
}) => {
  const isRole5 = privateState?.currentRole === 'ROLE_5_SELECTOR';
  const candidates = privateState?.role5CandidateCards || [];
  const [selectedCardId, setSelectedCardId] = useState<string>(candidates[0]?.id || '');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
          <Crown className="w-3.5 h-3.5 text-amber-400" /> Fase 3 — Penentuan Kartu Utama
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isRole5 ? 'Pilih 1 dari 2 Kartu Takdir Ronde' : 'Menunggu Pemilihan Kartu Takdir'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mt-1">
          {isRole5
            ? 'Sebagai Pemilih Kartu (Role 5), Anda berkuasa menentukan skenario & panji target ronde ini. Panji target akan dirahasiakan dari pemain lain hingga akhir ronde!'
            : 'Pemilik Role 5 (Main Card Selector) sedang memilih 1 dari 2 Kartu Utama. Panji target akan dirahasiakan hingga akhir ronde.'}
        </p>

        {/* Phase Timer */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 text-xs font-black mt-3">
          <Clock className="w-3.5 h-3.5" /> {state.phaseTimer}s tersisa
        </div>
      </div>

      {/* Screen for Role 5 */}
      {isRole5 && candidates.length > 0 ? (
        <div className="w-full space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map((card) => {
              const isSelected = (selectedCardId || candidates[0].id) === card.id;
              const isRed = card.teamFlag === 'RED';
              const isBlue = card.teamFlag === 'BLUE';

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#1E192B] to-[#120F1D] border-amber-400 shadow-glow-orange ring-2 ring-amber-400 scale-[1.02]'
                      : 'bg-surface-elevated/70 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl sm:text-3xl">{card.illustration || '📜'}</span>
                      <span
                        className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border ${
                          isRed
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isBlue
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-slate-700 text-amber-200 border-slate-500'
                        }`}
                      >
                        Panji: {card.teamFlag}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white mb-1.5">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-300 italic mb-3">
                      "{card.scenario}"
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {card.description}
                    </p>
                  </div>

                  {/* Objective Footer */}
                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300">
                      🎯 {card.roundObjective}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="orange"
              size="lg"
              glow
              onClick={() => onSelectMainCard(selectedCardId || candidates[0].id)}
              className="px-8 font-black py-3 text-sm sm:text-base"
              icon={<Check className="w-5 h-5" />}
            >
              Kunci Kartu Utama Ini
            </Button>
          </div>
        </div>
      ) : (
        /* Waiting State for Other Players */
        <div className="w-full max-w-md p-6 sm:p-8 bg-surface-elevated/80 border border-slate-800 rounded-3xl text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            👑
          </div>
          <h4 className="text-base font-black text-white mb-2">
            Pemilih Kartu Sedang Memutuskan
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Salah satu pemain di dewan memiliki Role 5 dan sedang memilih Kartu Utama untuk ronde ini. Setelah diputuskan, fase aksi akan langsung dimulai.
          </p>
          <div className="mt-5 flex justify-center items-center gap-1.5 text-xs text-indigo-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Sinkronisasi meja dewan...</span>
          </div>
        </div>
      )}
    </div>
  );
};
