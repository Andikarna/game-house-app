'use client';

import React from 'react';
import { GameResultData } from '@gamehouse/shared';
import { RotateCcw, LogOut, Trophy } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { useGameStore } from '../../../stores/useGameStore';

interface UnoResultModalProps {
  results: GameResultData;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  onOpenLeaderboard: () => void;
}

export const UnoResultModal: React.FC<UnoResultModalProps> = ({
  results,
  isHost,
  onPlayAgain,
  onLeaveRoom,
  onOpenLeaderboard,
}) => {
  const { playerId } = useGameStore();
  const winner = results.winner;
  const isMeWinner = winner?.playerId === playerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-surface border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-8 text-center overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-fuchsia-500/25 to-amber-500/0 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-glow-orange mb-3 border-2 border-amber-400 bg-slate-950 flex items-center justify-center">
            {winner?.avatar ? (
              <ClimberAvatarIcon avatar={winner.avatar} size={76} />
            ) : (
              <img
                src="/assets/gameplay/victory_cup_badge.jpg"
                alt="Victory Cup"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isMeWinner ? '🏆 KAMU JUARA UNO!!' : 'PERTANDINGAN UNO SELESAI!'}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
            {winner
              ? `${winner.nickname} menghabiskan seluruh kartu & meraih +${winner.score} poin!`
              : 'Pertandingan selesai.'}
          </p>
        </div>

        <div className="bg-surface-elevated/70 rounded-2xl border border-slate-800 overflow-hidden mb-5 text-left">
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase border-b border-slate-800">
            <span className="col-span-2">Rank</span>
            <span className="col-span-5">Pemain</span>
            <span className="col-span-2 text-center">Sisa</span>
            <span className="col-span-3 text-right">Poin</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {results.rankings.map((res) => {
              const isMe = res.playerId === playerId;
              const rankIcon =
                res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : `#${res.rank}`;

              return (
                <div
                  key={res.playerId}
                  className={`grid grid-cols-12 items-center px-3 sm:px-4 py-2.5 text-xs sm:text-sm ${
                    isMe ? 'bg-indigo-600/25 font-bold text-white' : 'text-slate-300'
                  }`}
                >
                  <div className="col-span-2 text-base">{rankIcon}</div>
                  <div className="col-span-5 flex items-center gap-2 truncate">
                    <ClimberAvatarIcon avatar={res.avatar} size={24} shape="circle" />
                    <span className="truncate">
                      {res.nickname} {isMe && '(You)'}
                    </span>
                  </div>
                  <div className="col-span-2 text-center font-mono text-xs text-slate-300">
                    {res.finalHeight} 🃏
                  </div>
                  <div className="col-span-3 text-right font-black text-amber-300 text-xs">
                    +{res.score} pts
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
              className="w-full sm:flex-1 font-black"
            >
              Main Lagi (Lobby)
            </Button>
          ) : (
            <div className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-surface-elevated border border-slate-700 text-xs font-bold text-slate-300">
              Menunggu Host memulai ulang...
            </div>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={onOpenLeaderboard}
            icon={<Trophy className="w-4 h-4 text-amber-400" />}
            className="w-full sm:w-auto font-bold"
          >
            Leaderboard
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onLeaveRoom}
            icon={<LogOut className="w-4 h-4" />}
            className="w-full sm:w-auto font-bold"
          >
            Keluar
          </Button>
        </div>
      </div>
    </div>
  );
};
