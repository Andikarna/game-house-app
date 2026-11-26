'use client';

import React from 'react';
import { HiddenTeamPublicGameState } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../../components/ui/AvatarSelector';
import { Bot, CheckCircle2 } from 'lucide-react';

interface TurnSlotTrackerProps {
  state: HiddenTeamPublicGameState;
  myPlayerId: string;
}

export const TurnSlotTracker: React.FC<TurnSlotTrackerProps> = ({ state, myPlayerId }) => {
  const slots = state.playerSlots || [];
  const currentSlot = state.currentTurnSlot;
  const isActionPhase = state.phase === 'ACTION_PHASE';
  const isVotingPhase = state.phase === 'VOTING_SUBMISSION';

  return (
    <div className="w-full bg-[#15121F]/90 border-y border-slate-800/80 backdrop-blur-md px-3 sm:px-6 py-2 shadow-lg mb-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {slots.map((playerId, index) => {
          const slotNum = index + 1;
          const player = state.players[playerId];
          const isCurrentTurn = isActionPhase && currentSlot === slotNum;
          const isMe = playerId === myPlayerId;
          const hasVoted = Boolean(player?.hasSubmittedVotes);

          return (
            <div
              key={playerId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                isCurrentTurn
                  ? 'bg-amber-500/20 border-amber-400 shadow-glow-orange animate-pulse ring-1 ring-amber-400'
                  : isMe
                  ? 'bg-indigo-950/60 border-indigo-500/50'
                  : 'bg-surface-elevated/40 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Slot Badge */}
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isCurrentTurn
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {slotNum}
              </div>

              {/* Player Avatar */}
              <ClimberAvatarIcon avatar={player?.avatar || 'budi'} size={28} shape="circle" />

              {/* Player Info */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-black truncate max-w-[80px] sm:max-w-[100px] ${
                      isCurrentTurn
                        ? 'text-amber-300'
                        : isMe
                        ? 'text-indigo-300'
                        : 'text-slate-200'
                    }`}
                  >
                    {player?.nickname || `Slot ${slotNum}`}
                  </span>
                  {player?.isBot && (
                    <Bot className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  {isMe && (
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1 rounded shrink-0">
                      You
                    </span>
                  )}
                </div>

                {/* Sub status */}
                <div className="flex items-center gap-1 text-[9px]">
                  {isCurrentTurn ? (
                    <span className="text-amber-400 font-bold uppercase tracking-wider">
                      Giliran Aksi
                    </span>
                  ) : isVotingPhase && hasVoted ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Terkunci
                    </span>
                  ) : (
                    <span className="text-slate-500 font-semibold">
                      Slot {slotNum}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
