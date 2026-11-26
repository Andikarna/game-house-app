'use client';

import React from 'react';
import { GameResultData } from '@gamehouse/shared';
import { RotateCcw, LogOut } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { useGameStore } from '../../../stores/useGameStore';

interface SnakeLadderResultModalProps {
  results: GameResultData;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const SnakeLadderResultModal: React.FC<SnakeLadderResultModalProps> = ({
  results,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}) => {
  const { playerId } = useGameStore();
  const winner = results.winner;
  const isMeWinner = winner?.playerId === playerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface border border-emerald-500/40 rounded-3xl shadow-2xl p-5 sm:p-8 text-center overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-emerald-500/25 to-amber-500/0 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-6">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-glow-orange mb-3 border-2 border-amber-400 bg-slate-950 flex items-center justify-center">
            <img
              src="/assets/gameplay/victory_cup_badge.jpg"
              alt="Victory Cup"
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isMeWinner ? '🎉 JUARA 1 ULAR TANGGA!' : 'PERTANDINGAN SELESAI!'}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
            {winner
              ? `${winner.nickname} berhasil menaklukkan puncak petak 100!`
              : 'Pertandingan Ular Tangga selesai.'}
          </p>
        </div>

        <div className="bg-surface-elevated/70 rounded-2xl border border-slate-800 overflow-hidden mb-6 text-left">
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase border-b border-slate-800">
            <span className="col-span-2">Rank</span>
            <span className="col-span-5">Pemain</span>
            <span className="col-span-2 text-center">Petak</span>
            <span className="col-span-3 text-right">Statistik</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {results.rankings.map((res) => {
              const isMe = res.playerId === playerId;
              const rankIcon =
                res.rank === 1
                  ? '🥇'
                  : res.rank === 2
                  ? '🥈'
                  : res.rank === 3
                  ? '🥉'
                  : `#${res.rank}`;

              return (
                <div
                  key={res.playerId}
                  className={`grid grid-cols-12 items-center px-3 sm:px-4 py-2.5 text-xs sm:text-sm ${
                    isMe ? 'bg-emerald-600/20 font-bold text-white' : 'text-slate-300'
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-base">{rankIcon}</span>
                  </div>

                  <div className="col-span-5 flex items-center gap-2 truncate">
                    <ClimberAvatarIcon avatar={res.avatar} size={24} />
                    <span className="truncate">
                      {res.nickname} {isMe && '(You)'}
                    </span>
                  </div>

                  <div className="col-span-2 text-center font-mono font-black text-amber-300 text-xs">
                    {res.finalHeight}/100
                  </div>

                  <div className="col-span-3 text-right text-[11px] font-bold text-slate-300">
                    🪜{res.skillsUsedCount} • 🐍{res.fallCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {isHost ? (
            <Button
              variant="orange"
              size="lg"
              glow
              onClick={onPlayAgain}
              icon={<RotateCcw className="w-4 h-4" />}
              className="w-full sm:flex-1 font-black py-3 text-xs sm:text-sm"
            >
              Main Lagi (Rematch)
            </Button>
          ) : (
            <div className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-semibold">
              Menunggu Host memulai rematch...
            </div>
          )}

          <Button
            variant="ghost"
            size="lg"
            onClick={onLeaveRoom}
            icon={<LogOut className="w-4 h-4" />}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Keluar Room
          </Button>
        </div>
      </div>
    </div>
  );
};
