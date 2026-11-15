import React from 'react';
import { GameResultData, AVATAR_OPTIONS } from '@gamehouse/shared';
import { Trophy, Medal, RotateCcw, LogOut, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { useGameStore } from '../../../stores/useGameStore';

interface ResultModalProps {
  results: GameResultData;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameResultModal: React.FC<ResultModalProps> = ({
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
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-surface border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 text-center">
        {/* Glow Effects */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-amber-500/20 to-purple-500/0 rounded-full blur-3xl pointer-events-none" />

        {/* Crown & Victory Header with 3D Modern Asset */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-glow-orange mb-3 border-2 border-amber-400 bg-slate-950 flex items-center justify-center group">
            <img
              src="/assets/gameplay/victory_cup_badge.jpg"
              alt="Victory Cup Trophy"
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isMeWinner ? '🎉 JUARA 1 PANJAT PINANG!' : 'MATCH FINISHED!'}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
            {winner ? `${winner.nickname} reached the summit prizes first!` : 'Time is up! Here are the champions.'}
          </p>
        </div>

        {/* Winner Highlight Card */}
        {winner && (
          <div className="flex items-center justify-center gap-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <ClimberAvatarIcon avatar={winner.avatar} size={56} />
            <div className="text-left">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1st Place Champion
              </span>
              <h4 className="text-xl font-black text-white">{winner.nickname}</h4>
              <span className="text-xs text-slate-400">
                Height: {winner.finalHeight}% • Falls: {winner.fallCount} • Score: {winner.score} pts
              </span>
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="bg-surface-elevated/70 rounded-2xl border border-slate-800 overflow-hidden mb-6 text-left">
          <div className="grid grid-cols-12 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-slate-400 uppercase border-b border-slate-800">
            <span className="col-span-2">Rank</span>
            <span className="col-span-6 sm:col-span-4">Climber</span>
            <span className="col-span-2 text-center">Height</span>
            <span className="hidden sm:block sm:col-span-2 text-center">Falls</span>
            <span className="col-span-2 text-right">Score</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
            {results.rankings.map((res) => {
              const isMe = res.playerId === playerId;
              const rankIcon = res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : `#${res.rank}`;

              return (
                <div
                  key={res.playerId}
                  className={`grid grid-cols-12 items-center px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${
                    isMe ? 'bg-indigo-600/20 font-bold text-white' : 'text-slate-300'
                  }`}
                >
                  <span className="col-span-2 text-sm sm:text-base font-black">{rankIcon}</span>
                  <div className="col-span-6 sm:col-span-4 flex items-center gap-1.5 sm:gap-2 truncate">
                    <ClimberAvatarIcon avatar={res.avatar} size={24} />
                    <span className="truncate">{res.nickname} {isMe && '(You)'}</span>
                  </div>
                  <span className="col-span-2 text-center text-orange-400 font-bold">
                    {res.finalHeight}%
                  </span>
                  <span className="hidden sm:block sm:col-span-2 text-center text-slate-400">
                    {res.fallCount}
                  </span>
                  <span className="col-span-2 text-right font-black text-amber-300">
                    {res.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
          {isHost ? (
            <Button
              variant="orange"
              size="lg"
              glow
              onClick={onPlayAgain}
              icon={<RotateCcw className="w-5 h-5" />}
              className="w-full sm:w-auto font-black"
            >
              Play Again (Rematch)
            </Button>
          ) : (
            <span className="text-xs font-bold text-slate-400 py-1">
              Waiting for Host to start next match...
            </span>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={onLeaveRoom}
            icon={<LogOut className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
};
