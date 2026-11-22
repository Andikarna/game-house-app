'use client';

import React, { useState } from 'react';
import {
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPrivate,
  VoteCard,
} from '@gamehouse/shared';
import { CheckCircle2, Clock, Layers, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ActiveMainCardBanner } from './ActiveMainCardBanner';

interface VotingSubmissionScreenProps {
  state: HiddenTeamPublicGameState;
  privateState: HiddenTeamPlayerPrivate | null;
  myPlayerId: string;
  onSubmitVotes: (cardIds: string[]) => void;
}

export const VotingSubmissionScreen: React.FC<VotingSubmissionScreenProps> = ({
  state,
  privateState,
  myPlayerId,
  onSubmitVotes,
}) => {
  const cards = privateState?.voteCards || [];
  const hasSubmitted = Boolean(privateState?.hasSubmittedVotes);
  const isEligible = privateState?.role2CanVote !== false; // Only ineligible if strictly false

  // By default, select all 3 cards
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(cards.map((c) => c.id));

  const toggleSelectCard = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      if (selectedCardIds.length > 1) {
        setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
      }
    } else {
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  const handleConfirmSubmit = () => {
    onSubmitVotes(selectedCardIds.length > 0 ? selectedCardIds : cards.map((c) => c.id));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Active Main Card Showcase */}
      <ActiveMainCardBanner card={state.activeMainCard} />

      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
          <Layers className="w-3.5 h-3.5 text-emerald-400" /> Fase 5 — Penyerahan Kartu Mandat
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Kotak Suara Dewan Rahasia
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
          Kartu mandat yang Anda serahkan akan diakumulasikan ke dalam total suara faksi pada ronde ini. Penyerahan bersifat rahasia.
        </p>

        {/* Phase Timer */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 text-xs font-black mt-2.5">
          <Clock className="w-3.5 h-3.5" /> {state.phaseTimer}s tersisa
        </div>
      </div>

      {/* Case 1: Ineligible to vote (Role 2 cannot vote) */}
      {!isEligible ? (
        <div className="w-full max-w-md p-6 sm:p-8 bg-rose-950/40 border border-rose-500/40 rounded-3xl text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-900/50 border border-rose-500/50 flex items-center justify-center text-3xl mx-auto mb-4 text-rose-300">
            🚫
          </div>
          <h4 className="text-base font-black text-rose-200 mb-2">
            Anda Tidak Memiliki Hak Suara Ronde Ini
          </h4>
          <p className="text-xs text-rose-300/80 leading-relaxed">
            Berdasarkan hasil undian Role 2 (Voting Eligibility Roller), Anda tidak dapat menyerahkan kartu mandat pada ronde ini. Hak suara akan diundi ulang di ronde berikutnya.
          </p>
          <div className="mt-5 p-2 rounded-xl bg-black/40 text-[11px] text-slate-400">
            Menunggu anggota dewan lainnya menyerahkan suara...
          </div>
        </div>
      ) : hasSubmitted ? (
        /* Case 2: Already submitted */
        <div className="w-full max-w-md p-6 sm:p-8 bg-emerald-950/40 border border-emerald-500/40 rounded-3xl text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/50 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto mb-4 text-emerald-300">
            🔒
          </div>
          <h4 className="text-base font-black text-emerald-200 mb-2">
            Kartu Mandat Terkunci di Kotak Suara!
          </h4>
          <p className="text-xs text-emerald-300/80 leading-relaxed">
            Pilihan Anda telah tercatat dengan aman di server. Menunggu anggota dewan lainnya menyelesaikan penyerahan suara sebelum manipulasi suara dimulai.
          </p>
          <div className="mt-5 flex justify-center items-center gap-1.5 text-xs text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Menunggu suara anggota dewan lain...</span>
          </div>
        </div>
      ) : (
        /* Case 3: Ready to submit cards */
        <div className="w-full max-w-2xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              const isRed = card.faction === 'RED';
              const isBlue = card.faction === 'BLUE';

              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? isRed
                        ? 'bg-rose-950/60 border-rose-500 shadow-glow-orange ring-2 ring-rose-400 scale-[1.02]'
                        : isBlue
                        ? 'bg-sky-950/60 border-sky-500 shadow-glow-primary ring-2 ring-sky-400 scale-[1.02]'
                        : 'bg-slate-800/80 border-amber-400 shadow-glow-orange ring-2 ring-amber-400 scale-[1.02]'
                      : 'bg-surface-elevated/40 border-slate-700/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{isRed ? '⚔️' : isBlue ? '🌊' : '⚖️'}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isRed
                            ? 'bg-rose-500/20 text-rose-300'
                            : isBlue
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-slate-700 text-amber-200'
                        }`}
                      >
                        {card.faction}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white mb-1">
                      {card.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{isSelected ? 'Terpilih' : 'Ketuk untuk pilih'}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400">
              Menyerahkan {selectedCardIds.length} dari {cards.length} kartu mandat.
            </span>

            <Button
              variant="orange"
              size="lg"
              glow
              onClick={handleConfirmSubmit}
              className="w-full sm:w-auto font-black px-8 py-3 text-sm"
              icon={<ShieldCheck className="w-5 h-5" />}
            >
              Kunci & Serahkan Kartu Mandat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
