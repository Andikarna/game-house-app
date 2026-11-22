import React from 'react';
import { LudoGameState, LudoColor } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Clock, Trophy, Crown, Sparkles, UserMinus } from 'lucide-react';

interface LudoTurnHUDProps {
  gameState: LudoGameState;
  myPlayerId: string;
  onTriggerVoteKick?: (targetPlayerId: string) => void;
}

const COLOR_TEXT: Record<LudoColor, { label: string; text: string; bg: string }> = {
  red: { label: 'MERAH', text: 'text-red-400', bg: 'bg-red-600' },
  green: { label: 'HIJAU', text: 'text-emerald-400', bg: 'bg-emerald-600' },
  yellow: { label: 'KUNING', text: 'text-amber-400', bg: 'bg-amber-500' },
  blue: { label: 'BIRU', text: 'text-blue-400', bg: 'bg-blue-600' },
};

export const LudoTurnHUD: React.FC<LudoTurnHUDProps> = ({
  gameState,
  myPlayerId,
  onTriggerVoteKick,
}) => {
  const currentTurnPlayer = gameState.players[gameState.currentTurnPlayerId];
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const colorMeta = currentTurnPlayer ? COLOR_TEXT[currentTurnPlayer.color] : COLOR_TEXT.red;

  const [localTime, setLocalTime] = React.useState<number>(gameState.turnTimeRemaining);

  React.useEffect(() => {
    setLocalTime(gameState.turnTimeRemaining);
  }, [gameState.turnTimeRemaining, gameState.currentTurnPlayerId]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const targetWins = gameState.gameMode === 'quick' ? 2 : 4;

  return (
    <div className="w-full max-w-xl flex flex-col gap-2 select-none">
      {/* 1. Main Active Turn Banner */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-700/70 shadow-xl">
        <div className="flex items-center gap-2.5">
          {/* Avatar with Turn Ring */}
          <div className="relative">
            <ClimberAvatarIcon avatar={currentTurnPlayer?.avatar || 'climber-red'} size={36} />
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${colorMeta.bg} border-2 border-slate-900`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-slate-950 font-mono ${colorMeta.bg}`}>
                {colorMeta.label}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {currentTurnPlayer?.nickname} {isMyTurn && '(Giliran Anda!)'}
              </h4>
              {currentTurnPlayer?.isBot && (
                <span className="text-[9px] font-black text-purple-300 bg-purple-500/25 border border-purple-500/50 px-1.5 py-0.5 rounded">
                  🤖 BOT
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-xs text-amber-300 font-semibold truncate max-w-[210px] sm:max-w-xs mt-0.5">
              {currentTurnPlayer?.isBot && !gameState.hasRolled
                ? '🤖 Sedang memikirkan lemparan dadu...'
                : gameState.lastMoveNotice || 'Giliran melempar dadu...'}
            </p>
          </div>
        </div>

        {/* Turn Timer Countdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className={localTime <= 5 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-300'}>
            {localTime}s
          </span>
        </div>
      </div>

      {/* 2. All Players Token Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {gameState.playerOrder.map((pId) => {
          const p = gameState.players[pId];
          if (!p) return null;
          const isCurrent = pId === gameState.currentTurnPlayerId;
          const isMe = pId === myPlayerId;
          const cMeta = COLOR_TEXT[p.color];

          return (
            <div
              key={pId}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-surface-elevated border-amber-400/80 shadow-md shadow-amber-400/10'
                  : 'bg-surface/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-2 h-2 rounded-full ${cMeta.bg} shrink-0`} />
                <span className={`text-[11px] font-bold truncate ${isMe ? 'text-white' : 'text-slate-300'}`}>
                  {p.nickname}
                </span>
                {p.isBot && (
                  <span className="text-[8px] font-extrabold text-purple-300 bg-purple-900/60 border border-purple-500/40 px-1 py-0.2 rounded shrink-0">
                    BOT
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-400">
                  <Trophy className="w-3 h-3" />
                  <span>
                    {p.finishedCount}/{targetWins}
                  </span>
                </div>

                {!isMe && onTriggerVoteKick && gameState.playerOrder.length > 2 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerVoteKick(pId);
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                    title={`Vote Kick ${p.nickname} (AFK)`}
                  >
                    <UserMinus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
