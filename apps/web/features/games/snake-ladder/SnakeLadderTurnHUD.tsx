'use client';

import React from 'react';
import { SnakeLadderGameState, SnakeLadderColor } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Clock, UserMinus } from 'lucide-react';

interface SnakeLadderTurnHUDProps {
  gameState: SnakeLadderGameState;
  myPlayerId: string;
  onTriggerVoteKick?: (targetPlayerId: string) => void;
}

const COLOR_TEXT: Record<SnakeLadderColor, { label: string; bg: string; bar: string }> = {
  red: { label: 'MERAH', bg: 'bg-red-500', bar: 'from-red-500 to-rose-400' },
  blue: { label: 'BIRU', bg: 'bg-blue-500', bar: 'from-blue-500 to-cyan-400' },
  purple: { label: 'UNGU', bg: 'bg-purple-500', bar: 'from-purple-500 to-fuchsia-400' },
  green: { label: 'HIJAU', bg: 'bg-emerald-500', bar: 'from-emerald-500 to-lime-400' },
  yellow: { label: 'KUNING', bg: 'bg-yellow-400', bar: 'from-yellow-400 to-amber-300' },
  orange: { label: 'ORANYE', bg: 'bg-orange-500', bar: 'from-orange-500 to-amber-400' },
};

export const SnakeLadderTurnHUD: React.FC<SnakeLadderTurnHUDProps> = ({
  gameState,
  myPlayerId,
  onTriggerVoteKick,
}) => {
  const currentPlayer = gameState.players[gameState.currentTurnPlayerId];
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const colorMeta = currentPlayer ? COLOR_TEXT[currentPlayer.color] : COLOR_TEXT.red;

  const [localTime, setLocalTime] = React.useState<number>(gameState.turnTimeRemaining);

  React.useEffect(() => {
    setLocalTime(gameState.turnTimeRemaining);
  }, [gameState.turnTimeRemaining, gameState.currentTurnPlayerId, gameState.stateVersion]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-2 select-none">
      {/* 1. Active Turn Banner */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-700/70 shadow-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <ClimberAvatarIcon avatar={currentPlayer?.avatar || 'budi'} size={36} />
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${colorMeta.bg} border-2 border-slate-900`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-slate-950 font-mono ${colorMeta.bg}`}
              >
                {colorMeta.label}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                {currentPlayer?.nickname} {isMyTurn && '(Giliranmu!)'}
              </h4>
              {currentPlayer?.isBot && (
                <span className="text-[9px] font-black text-purple-300 bg-purple-500/25 border border-purple-500/50 px-1.5 py-0.5 rounded">
                  🤖 BOT
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-xs text-emerald-300 font-semibold truncate max-w-[230px] sm:max-w-md mt-0.5">
              {gameState.lastMoveNotice || 'Lempar dadu untuk melangkah!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-xs shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className={localTime <= 5 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-300'}>
            {localTime}s
          </span>
        </div>
      </div>

      {/* 2. 2-6 Player Progress Strip */}
      <div
        className={`grid gap-1.5 ${
          gameState.playerOrder.length > 4
            ? 'grid-cols-2 sm:grid-cols-3'
            : gameState.playerOrder.length === 3
            ? 'grid-cols-3'
            : gameState.playerOrder.length === 2
            ? 'grid-cols-2'
            : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {gameState.playerOrder.map((pId) => {
          const p = gameState.players[pId];
          if (!p) return null;
          const isCurrent = pId === gameState.currentTurnPlayerId;
          const isMe = pId === myPlayerId;
          const cMeta = COLOR_TEXT[p.color] || COLOR_TEXT.red;

          return (
            <div
              key={pId}
              className={`flex flex-col gap-1 px-2.5 py-1.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-surface-elevated border-emerald-400/80 shadow-md shadow-emerald-500/10'
                  : 'bg-surface/65 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${cMeta.bg} shrink-0`} />
                  <span className={`text-[11px] font-bold truncate ${isMe ? 'text-white' : 'text-slate-300'}`}>
                    {p.nickname}
                  </span>
                  {p.isBot && (
                    <span className="text-[8px] font-extrabold text-purple-300 bg-purple-900/60 border border-purple-500/40 px-1 rounded shrink-0">
                      BOT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-black font-mono text-amber-300">
                    {p.position}/100
                  </span>
                  {!isMe && onTriggerVoteKick && gameState.playerOrder.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerVoteKick(pId);
                      }}
                      className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                      title={`Vote Kick ${p.nickname} (AFK)`}
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mini Progress Bar + Ladder/Snake Stats */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${cMeta.bar} transition-all duration-500`}
                    style={{ width: `${Math.max(3, p.position)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-bold shrink-0">
                  🪜{p.laddersClimbed} 🐍{p.snakesBitten}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
