'use client';

import React, { useEffect } from 'react';
import { ImpostorPublicGameState } from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { Trophy, RefreshCw, ArrowLeft, Users, Star, Award, Sparkles } from 'lucide-react';

interface ResultScreenProps {
  gameState: ImpostorPublicGameState;
  myPlayerId: string;
  isHost: boolean;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  gameState,
  myPlayerId,
  isHost,
  onRematch,
  onLeaveRoom,
}) => {
  const result = gameState.resultData;
  const isVillagerWin = gameState.winner === 'villagers';

  // Confetti explosion on render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default || mod;
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: isVillagerWin
            ? ['#2F7D55', '#CBEA8B', '#F2A444', '#FFFFFF']
            : ['#E46B5D', '#F2A444', '#18352B', '#FFFFFF'],
        });
      }).catch(() => {});
    }
  }, [isVillagerWin]);

  const leaderboard = result?.leaderboard || Object.values(gameState.players).map(p => ({
    playerId: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    role: (p.id === result?.impostorPlayerId ? 'impostor' : 'villager') as any,
    isWinner: isVillagerWin ? (p.id !== result?.impostorPlayerId) : (p.id === result?.impostorPlayerId),
    pointsAdded: isVillagerWin 
      ? (p.id !== result?.impostorPlayerId ? 2 : 0)
      : (p.id === result?.impostorPlayerId ? 5 : 0),
    totalScore: p.score || 0,
  })).sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="flex-1 flex flex-col items-center p-3 sm:p-5 max-w-2xl mx-auto w-full z-10 my-auto">
      
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight uppercase mb-3 text-center">
        HASIL & SKOR RONDE #{gameState.roundNumber || 1}
      </h1>

      {/* Main Result Card */}
      <div className={`w-full rounded-3xl p-5 sm:p-7 shadow-2xl border-4 mb-4 text-center transition-all ${
        isVillagerWin
          ? 'bg-gradient-to-b from-[#F2FBF6] to-[#E5F5EC] border-[#2F7D55]'
          : 'bg-gradient-to-b from-[#FFF5F5] to-[#FFEBE9] border-[#E46B5D]'
      }`}>
        {/* Impostor Avatar Reveal */}
        <div className="flex justify-center mb-3">
          <ChibiAvatar
            avatar={result?.impostorAvatar || 'budi'}
            size="xl"
            isImpostor={true}
          />
        </div>

        {/* Revealed Impostor Name */}
        <p className="text-base sm:text-xl font-black text-[#E46B5D] uppercase tracking-wider mb-1">
          {result?.impostorNickname || 'IMPOSTOR'} ADALAH SANG IMPOSTOR!
        </p>

        {/* Secret Word Reveal */}
        <div className="inline-block bg-white/90 border border-[#18352B]/15 px-4 py-2 rounded-2xl shadow-sm mb-3">
          <span className="text-xs font-bold text-[#18352B]/60 block">Kata rahasia desa:</span>
          <span className="text-xl sm:text-2xl font-black text-[#18352B] tracking-wide">
            {result?.secretWord || 'SAWAH'}
          </span>
          <span className="text-[10px] font-bold text-[#2F7D55] block mt-0.5">
            (Kategori: {result?.categoryLabel || 'Pedesaan'})
          </span>
        </div>

        {/* Winner Banner */}
        <div className="mb-3">
          {isVillagerWin ? (
            <div className="bg-[#2F7D55] text-white py-2.5 px-6 rounded-2xl shadow-md inline-flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span className="text-lg sm:text-xl font-black tracking-wide">
                WARGA DESA MENANG!
              </span>
            </div>
          ) : (
            <div className="bg-[#E46B5D] text-white py-2.5 px-6 rounded-2xl shadow-md inline-flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span className="text-lg sm:text-xl font-black tracking-wide">
                IMPOSTOR MENANG!
              </span>
            </div>
          )}
        </div>

        {/* Points Added Notification */}
        <div className="mb-2">
          {isVillagerWin ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 border-2 border-emerald-400 text-emerald-900 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              +2 Poin diberikan kepada semua Warga Desa yang menang!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-rose-100 border-2 border-rose-400 text-rose-900 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              +5 Poin diberikan kepada Impostor yang berhasil lolos!
            </span>
          )}
        </div>

        {/* Win Reason Explanation */}
        <p className="text-xs sm:text-sm font-bold text-[#18352B]/85 max-w-md mx-auto leading-relaxed mt-1">
          {result?.winReason || gameState.winReason || 'Permainan selesai!'}
        </p>
      </div>

      {/* Papan Skor Akumulasi / Leaderboard */}
      <div className="w-full bg-[#FAF4E6] border-4 border-[#6C421E] rounded-3xl p-4 sm:p-5 shadow-2xl mb-4 text-[#3E2714]">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b-2 border-[#D7C29E]">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-[#442912]">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Papan Peringkat Skor Warga & Impostor</span>
          </div>
          <span className="text-[11px] font-bold text-[#7A4B23] bg-[#FFF2DE] px-2.5 py-0.5 rounded-full border border-[#D4A359]/40">
            {leaderboard.length} Pemain
          </span>
        </div>

        <div className="space-y-2">
          {leaderboard.map((entry, idx) => {
            const isMe = entry.playerId === myPlayerId;
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            return (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 transition-all ${
                  isTop1 
                    ? 'bg-amber-100/90 border-amber-400 shadow-sm'
                    : isMe 
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm' 
                      : 'bg-white border-[#E5D7BE]'
                }`}
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Badge */}
                  <span className="w-6 text-center font-black text-sm sm:text-base text-[#7A4B23]">
                    {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                  </span>

                  <div className="w-10 h-10 rounded-full bg-[#4E2F16] border-2 border-amber-300 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <ChibiAvatar avatar={entry.avatar} size="xs" isImpostor={entry.role === 'impostor'} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-[#3E2714] truncate">
                        {entry.nickname}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-200 px-1.5 py-0.2 rounded-full font-bold">
                          Kamu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        entry.role === 'impostor' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {entry.role === 'impostor' ? 'Impostor' : 'Warga'}
                      </span>
                      {entry.pointsAdded > 0 && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                          +{entry.pointsAdded} ronde ini
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Total Score */}
                <div className="flex items-center gap-1 bg-[#FFF8EB] border-2 border-[#F2A444] px-3 py-1.5 rounded-xl shadow-sm">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span className="text-sm sm:text-base font-black text-[#A8481A]">
                    {entry.totalScore} Poin
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row gap-3">
        {isHost ? (
          <button
            onClick={onRematch}
            className="flex-1 py-3.5 px-6 bg-[#2F7D55] hover:bg-[#256645] active:scale-98 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl border-b-4 border-[#1E563A] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>LANJUT RONDE BERIKUTNYA</span>
          </button>
        ) : (
          <div className="flex-1 py-3 px-4 bg-white/85 border border-[#18352B]/20 rounded-2xl text-center text-xs font-bold text-[#18352B] flex items-center justify-center shadow-md">
            <span>Menunggu host memulai ronde berikutnya...</span>
          </div>
        )}

        <button
          onClick={onLeaveRoom}
          className="py-3.5 px-6 bg-white hover:bg-slate-100 border border-[#18352B]/20 text-[#18352B] font-black text-sm sm:text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>

    </div>
  );
};
