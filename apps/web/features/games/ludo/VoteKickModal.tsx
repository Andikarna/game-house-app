'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMinus, Check, X, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../../stores/useGameStore';
import { getGlobalSocket } from '../../../hooks/useSocket';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { LudoGameState, LudoColor } from '@gamehouse/shared';

const COLOR_TEXT: Record<LudoColor, { label: string; text: string; bg: string }> = {
  red: { label: 'MERAH', text: 'text-red-400', bg: 'bg-red-600' },
  blue: { label: 'BIRU', text: 'text-blue-400', bg: 'bg-blue-600' },
  purple: { label: 'UNGU', text: 'text-purple-400', bg: 'bg-purple-600' },
  green: { label: 'HIJAU', text: 'text-emerald-400', bg: 'bg-emerald-600' },
  yellow: { label: 'KUNING', text: 'text-yellow-400', bg: 'bg-yellow-500' },
  orange: { label: 'ORANYE', text: 'text-orange-400', bg: 'bg-orange-600' },
};

interface VoteKickModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: LudoGameState;
}

export const VoteKickModal: React.FC<VoteKickModalProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const { socket, playerId, voteKickState } = useGameStore();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const activeSocket = socket || getGlobalSocket();

  // Filter eligible targets (all opponents, excluding self)
  const eligibleOpponents = gameState.playerOrder
    .filter((pId) => pId !== playerId)
    .map((pId) => gameState.players[pId])
    .filter(Boolean);

  const handleStartVoteKick = (targetId: string) => {
    if (!activeSocket) return;
    activeSocket.emit('game:vote-kick-start', { targetPlayerId: targetId });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 15 }}
        className="w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Ajukan Vote Kick AFK
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Pilih pemain yang sedang <strong className="text-amber-400">AFK atau tidak merespons</strong>. Pemain akan dikeluarkan jika mayoritas pemain menyetujui.
          </p>

          <div className="flex flex-col gap-2 mt-1">
            {eligibleOpponents.map((opp) => {
              const cMeta = COLOR_TEXT[opp.color] || COLOR_TEXT.red;
              const isSelected = selectedTargetId === opp.playerId;

              return (
                <div
                  key={opp.playerId}
                  onClick={() => setSelectedTargetId(opp.playerId)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-900/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ClimberAvatarIcon avatar={opp.avatar} size={34} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full text-slate-950 ${cMeta.bg}`}>
                          {cMeta.label}
                        </span>
                        <h4 className="text-xs font-bold text-white">
                          {opp.nickname}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {opp.isBot ? '🤖 Bot Pemain' : '👤 Pemain'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartVoteKick(opp.playerId);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Kick
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// ACTIVE VOTE KICK BANNER (Live voting overlay shown during active vote)
// ============================================================================
export const ActiveVoteKickBanner: React.FC = () => {
  const { voteKickState, playerId, socket } = useGameStore();
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const activeSocket = socket || getGlobalSocket();

  useEffect(() => {
    if (!voteKickState) return;

    const updateTimer = () => {
      const remainingMs = Math.max(0, voteKickState.expiresAt - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [voteKickState]);

  if (!voteKickState) return null;

  const isTarget = voteKickState.targetPlayerId === playerId;
  const myVote = voteKickState.votes[playerId];

  const handleVote = (vote: 'yes' | 'no') => {
    if (activeSocket) {
      activeSocket.emit('game:vote-kick-vote', { vote });
    }
  };

  const colorMeta = voteKickState.targetColor 
    ? (COLOR_TEXT[voteKickState.targetColor as LudoColor] || COLOR_TEXT.red)
    : COLOR_TEXT.red;

  return (
    <div className="w-full max-w-xl z-30 mb-2 select-none animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="rounded-2xl bg-slate-950/95 border-2 border-rose-500/90 shadow-[0_10px_35px_rgba(225,29,72,0.45)] backdrop-blur-xl p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Vote Kick Pemain
            </span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-[11px] font-mono font-bold text-rose-300">
            <Clock className="w-3 h-3 text-rose-400" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Target Info & Tally */}
        <div className="flex items-center justify-between bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorMeta.bg}`} />
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">
                Kick <strong className="text-rose-300">{voteKickState.targetNickname}</strong>?
              </h4>
              <span className="text-[10px] text-slate-400">
                Diajukan oleh {voteKickState.initiatedByNickname}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-amber-400 font-mono">
              {voteKickState.yesCount} / {voteKickState.requiredVotes}
            </span>
            <span className="text-[9px] block text-slate-400 font-medium">
              Suara Dibutuhkan
            </span>
          </div>
        </div>

        {/* Action Buttons or Status */}
        {isTarget ? (
          <div className="py-1 px-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-center text-xs text-rose-300 font-semibold">
            ⚠️ Anda sedang divote kick oleh pemain lain karena terindikasi AFK.
          </div>
        ) : myVote ? (
          <div className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <span className="text-slate-400">Pilihan Anda:</span>
            <span className={myVote === 'yes' ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
              {myVote === 'yes' ? '✅ Setuju Kick' : '❌ Menolak'}
            </span>
            <span className="text-[10px] text-slate-500">(Menunggu pemain lain...)</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleVote('yes')}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Setuju Kick</span>
            </button>

            <button
              type="button"
              onClick={() => handleVote('no')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tolak</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
