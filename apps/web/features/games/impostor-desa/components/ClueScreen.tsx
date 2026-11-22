'use client';

import React, { useState } from 'react';
import { ImpostorPublicGameState, ImpostorPrivateRoleData } from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { Clock, Send, Lock, AlertCircle, MessageSquare } from 'lucide-react';

interface ClueScreenProps {
  gameState: ImpostorPublicGameState;
  roleData: ImpostorPrivateRoleData | null;
  myPlayerId: string;
  onSubmitClue: (clue: string) => void;
}

export const ClueScreen: React.FC<ClueScreenProps> = ({
  gameState,
  roleData,
  myPlayerId,
  onSubmitClue,
}) => {
  const [clueInput, setClueInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const hasSubmitted = myPlayer?.hasGivenClue;

  const currentTurnPlayer = gameState.currentTurnPlayerId
    ? gameState.players[gameState.currentTurnPlayerId]
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || hasSubmitted) return;

    const clean = clueInput.trim();
    if (!clean) {
      setErrorMsg('Tulis petunjuk terlebih dahulu.');
      return;
    }
    if (clean.length > 40) {
      setErrorMsg('Maksimal 40 karakter.');
      return;
    }

    // Client warning if villager tries to write the secret word
    if (roleData?.secretWord && clean.toLowerCase() === roleData.secretWord.toLowerCase()) {
      setErrorMsg('Jangan menyebutkan kata rahasia secara langsung!');
      return;
    }

    // Client warning if clue was already submitted by another player this round
    const isDuplicate = gameState.clues.some(
      (c) => c.clue.trim().toLowerCase() === clean.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Kata "${clean}" sudah digunakan oleh warga lain! Pilih kata petunjuk yang berbeda.`);
      return;
    }

    setErrorMsg('');
    onSubmitClue(clean);
    setClueInput('');
  };

  const minutes = Math.floor(gameState.phaseTimeRemaining / 60);
  const seconds = gameState.phaseTimeRemaining % 60;
  const formattedTimer = minutes > 0 ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` : `${seconds}s`;

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 max-w-2xl mx-auto w-full z-10">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FCD34D] tracking-tight uppercase drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]">
            RONDE PETUNJUK
          </h1>
          <p className="text-xs sm:text-sm font-bold text-amber-200/90">
            Berikan 1 kata petunjuk yang berhubungan. Waktu giliran: 1.30 menit!
          </p>
        </div>

        {/* Turn Countdown Timer */}
        <div className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-sm sm:text-base shadow-lg border-2 ${
          gameState.phaseTimeRemaining <= 10
            ? 'bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white animate-pulse'
            : 'bg-gradient-to-b from-[#F59E0B] to-[#D97706] border-[#FDE68A] text-[#3E2714]'
        }`}>
          <span className="text-lg">⏰</span>
          <span className="tracking-wider font-mono">{formattedTimer}</span>
        </div>
      </div>

      {/* Wooden Board Container */}
      <div className="w-full bg-[#4E2F16] rounded-3xl p-3 sm:p-4 shadow-2xl border-4 border-[#6C421E] mb-3">
        <div className="w-full bg-[#FAF4E6] rounded-2xl p-4 sm:p-5 border-2 border-[#D7C29E] shadow-inner text-[#3E2714]">
          
          {/* Turn Banner */}
          <div className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-2 mb-4 transition-all ${
            isMyTurn 
              ? 'bg-[#E5F5EC] border-[#2F7D55] shadow-sm animate-pulse' 
              : 'bg-[#FFF8EB] border-[#D4A359]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#4E2F16] border-2 border-amber-300 flex items-center justify-center overflow-hidden shadow-sm">
                <ChibiAvatar
                  avatar={currentTurnPlayer?.avatar || 'budi'}
                  size="sm"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7C4A21]">
                  {isMyTurn ? '🌟 Giliranmu Sekarang!' : 'Giliran Memberi Petunjuk:'}
                </p>
                <p className="text-base sm:text-lg font-black text-[#3E2714]">
                  {isMyTurn ? `${myPlayer?.nickname || 'Kamu'} (Giliranmu)` : currentTurnPlayer?.nickname || 'Warga Desa'}
                </p>
              </div>
            </div>

            {/* Secret word pill reminder for villagers */}
            {roleData?.secretWord && (
              <div className="hidden sm:flex flex-col items-end bg-white/80 border border-amber-300 px-3 py-1 rounded-xl">
                <span className="text-[9px] font-bold uppercase text-[#8B5A2B]">Kata Rahasiamu:</span>
                <span className="text-xs font-black text-[#1E5738] uppercase">&ldquo;{roleData.secretWord}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Clues Feed Area */}
          <div className="bg-[#FFFDF9] border border-[#D7C29E] rounded-2xl p-3 space-y-2 max-h-64 overflow-y-auto shadow-inner mb-4">
            {gameState.clues.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 text-[#7C4A21]/60">
                <MessageSquare className="w-10 h-10 mb-2 stroke-1 text-[#8C5E37]" />
                <p className="text-sm font-bold">Belum ada petunjuk yang diberikan.</p>
                <p className="text-xs">{currentTurnPlayer?.nickname || 'Pemain pertama'} sedang berpikir...</p>
              </div>
            ) : (
              gameState.clues.map((clueEntry, idx) => {
                const isMe = clueEntry.playerId === myPlayerId;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                      isMe 
                        ? 'bg-[#E5F5EC] border-[#2F7D55]/50 shadow-xs' 
                        : 'bg-[#FAF4E6]/70 border-[#E5D7BE]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#4E2F16] border border-amber-300 flex items-center justify-center overflow-hidden">
                        <ChibiAvatar avatar={clueEntry.avatar} size="xs" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-[#3E2714] truncate block">
                          {clueEntry.nickname} {isMe && <span className="text-[10px] text-emerald-700 font-bold">(Kamu)</span>}
                        </span>
                        <span className="text-[10px] font-semibold text-[#8C5E37]">
                          Petunjuk ke-{clueEntry.turnNumber}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#FFF8E8] border border-[#F2A444] px-3.5 py-1 rounded-xl shadow-xs">
                      <span className="text-xs sm:text-sm font-black text-[#A8481A]">
                        &ldquo;{clueEntry.clue}&rdquo;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 text-xs font-bold px-3 py-2 rounded-xl mb-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bottom Clue Input Form */}
          {isMyTurn && !hasSubmitted ? (
            <div className="space-y-1.5">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={40}
                    autoFocus
                    value={clueInput}
                    onChange={(e) => {
                      setClueInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Ketik 1 kata petunjuk baru... (maks 40 huruf)"
                    className="w-full px-4 py-3 bg-white border-2 border-[#2F7D55] rounded-xl font-bold text-[#18352B] placeholder-[#18352B]/40 focus:outline-none focus:ring-2 focus:ring-[#2F7D55]/30 shadow-sm text-sm sm:text-base"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#18352B]/40">
                    {clueInput.length}/40
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!clueInput.trim()}
                  className="px-6 py-3 bg-gradient-to-b from-[#349463] to-[#246945] hover:from-[#3ca971] active:scale-95 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 min-w-[90px] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim</span>
                </button>
              </form>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8C5E37] px-1">
                <Lock className="w-3 h-3 text-[#A8481A] shrink-0" />
                <span>Aturan: Dilarang menyebut kata rahasia & dilarang mengulang kata yang sudah diberikan!</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#EFE5D0]/60 border border-[#D7C29E] rounded-xl p-3 text-center flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#7A4B23]">
              <Lock className="w-4 h-4 text-[#8C5E37]" />
              {hasSubmitted ? (
                <span>Petunjukmu sudah tercatat! Tunggu warga berikutnya...</span>
              ) : (
                <span>Menunggu giliran {currentTurnPlayer?.nickname || 'warga lain'}...</span>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
