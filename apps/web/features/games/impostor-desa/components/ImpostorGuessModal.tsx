'use client';

import React, { useState } from 'react';
import { ImpostorPublicGameState, IMPOSTOR_CATEGORIES, ImpostorCategory } from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { Clock, HelpCircle, Send, Sparkles } from 'lucide-react';

interface ImpostorGuessModalProps {
  gameState: ImpostorPublicGameState;
  myPlayerId: string;
  onSubmitGuess: (guessedWord: string) => void;
}

export const ImpostorGuessModal: React.FC<ImpostorGuessModalProps> = ({
  gameState,
  myPlayerId,
  onSubmitGuess,
}) => {
  const [guessInput, setGuessInput] = useState('');
  const isMeCaughtImpostor = gameState.caughtImpostorId === myPlayerId;

  const caughtPlayer = gameState.caughtImpostorId
    ? gameState.players[gameState.caughtImpostorId]
    : null;

  // Words from this round's category as quick-pick suggestions for the impostor
  const categoryWords = IMPOSTOR_CATEGORIES[gameState.category as ImpostorCategory]?.words || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    onSubmitGuess(guessInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#18352B]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#FFF8E8] border-3 border-[#E46B5D] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
        {/* Timer */}
        <div className="flex justify-end mb-2">
          <div className="inline-flex items-center gap-1.5 bg-[#E46B5D] text-white px-3 py-1 rounded-xl text-xs font-black shadow-sm animate-pulse">
            <Clock className="w-4 h-4" />
            <span>{gameState.phaseTimeRemaining} detik tersisa</span>
          </div>
        </div>

        {/* Caught Avatar */}
        <div className="flex justify-center mb-3">
          <ChibiAvatar
            avatar={caughtPlayer?.avatar || 'budi'}
            size="lg"
            isImpostor={true}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#E46B5D] tracking-tight uppercase mb-1">
          {caughtPlayer?.nickname || 'IMPOSTOR'} TERTANGKAP!
        </h2>

        {isMeCaughtImpostor ? (
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#18352B]/80 mb-4">
              Kamu berhasil dicurigai warga! Namun kamu mendapat <span className="text-[#2F7D55] font-black">SATU KESEMPATAN TERAKHIR</span>. Tebak kata rahasia desa kategori <span className="underline">{gameState.categoryLabel}</span> untuk mencuri kemenangan!
            </p>

            {/* Quick Word Suggestions */}
            <div className="mb-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#18352B]/60 mb-2">
                Pilih atau ketik kata rahasia:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-white/70 rounded-2xl border border-[#18352B]/10">
                {categoryWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => setGuessInput(word)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                      guessInput.toLowerCase() === word.toLowerCase()
                        ? 'bg-[#2F7D55] text-white border-[#2F7D55] shadow-sm'
                        : 'bg-white text-[#18352B] border-[#18352B]/15 hover:bg-emerald-50'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            {/* Guess Submission Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                autoFocus
                required
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Ketik tebakan kata rahasia..."
                className="flex-1 px-4 py-3 bg-white border-2 border-[#E46B5D] rounded-2xl font-bold text-[#18352B] focus:outline-none focus:ring-2 focus:ring-[#E46B5D]/40 text-sm sm:text-base shadow-inner"
              />
              <button
                type="submit"
                disabled={!guessInput.trim()}
                className="px-5 py-3 bg-[#E46B5D] hover:bg-[#c95345] active:scale-95 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>TEBAK</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm sm:text-base font-bold text-[#18352B] mb-4">
              Warga berhasil mencurigai <span className="font-black text-[#E46B5D]">{caughtPlayer?.nickname}</span>!
            </p>
            <div className="bg-white/80 border border-[#18352B]/15 rounded-2xl p-5 shadow-inner flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#2F7D55] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-semibold text-[#18352B]/75">
                Impostor sedang mencoba menebak kata rahasia desa...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
