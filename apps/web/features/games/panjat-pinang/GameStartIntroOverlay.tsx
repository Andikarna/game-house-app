'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomInfo, PanjatPinangGameState } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Crown, Sparkles, Trophy } from 'lucide-react';

interface GameStartIntroOverlayProps {
  countdown: number | null;
  showGo: boolean;
  room: RoomInfo | null;
  gameState: PanjatPinangGameState;
  myPlayerId: string;
}

export const GameStartIntroOverlay: React.FC<GameStartIntroOverlayProps> = ({
  countdown,
  showGo,
  room,
  gameState,
  myPlayerId,
}) => {
  const isVisible = (countdown !== null && countdown > 0) || showGo;

  // Trigger confetti burst on "GO!"
  useEffect(() => {
    if (showGo && typeof window !== 'undefined') {
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default || mod;
        confetti({
          particleCount: 100,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#EF4444', '#FFFFFF', '#F59E0B', '#3B82F6', '#10B981'],
        });
      }).catch(() => {});
    }
  }, [showGo]);

  if (!isVisible) return null;

  const currentMode = gameState?.gameMode || room?.settings.gameMode || 'classic-race';
  const modeName =
    currentMode === 'classic-race'
      ? 'Classic Race'
      : currentMode === 'survival-climb'
      ? 'Survival Climb'
      : 'Skill Battle';

  const players = room?.players || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.15 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden select-none"
      >
        {/* Dynamic Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-red-600/25 via-amber-500/20 to-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Main Content Modal Card */}
        <motion.div
          initial={{ scale: 0.85, y: 25, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          className="relative w-full max-w-xl bg-slate-900/90 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
        >
          {/* High-Resolution Modern 3D Game Splash Banner */}
          <div className="relative w-full h-36 sm:h-48 rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg mb-4 bg-slate-950 group">
            <img
              src="/assets/gameplay/panjat_pinang_battle_banner.jpg"
              alt="Panjat Pinang Battle"
              className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            {/* Mode & Room Info Pill */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow">
                17 Agustus Arena
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-500/30">
                Mode: {modeName}
              </span>
            </div>

            {/* Target Objective Label */}
            <div className="absolute bottom-3 inset-x-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white/95 text-[11px] sm:text-xs font-bold border border-slate-700">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Pemain pertama yang meraih hadiah di puncak tiang menang!
              </span>
            </div>
          </div>

          {/* Competing Climbers Roster Grid */}
          <div className="w-full mb-4">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Daftar Peserta Panjat Pinang</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-h-28 overflow-y-auto p-1">
              {players.map((p) => {
                const isMe = p.id === myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-orange-600/25 border-orange-500/80 shadow-md shadow-orange-500/20'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="relative">
                      <ClimberAvatarIcon avatar={p.avatar} size={28} />
                      {p.isHost && (
                        <Crown className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-white max-w-[90px] truncate">
                      {p.nickname} {isMe && '(You)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic 3-2-1 / GO! Animated Blast Center */}
          <div className="relative py-2 flex flex-col items-center justify-center min-h-[90px]">
            <AnimatePresence mode="wait">
              {showGo ? (
                <motion.div
                  key="go"
                  initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
                  animate={{ scale: [1.3, 1], rotate: [0, 0], opacity: 1 }}
                  exit={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-6xl sm:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-500 drop-shadow-[0_10px_25px_rgba(245,158,11,0.6)]">
                    PANJAT! 🚀
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-400 uppercase mt-1 animate-pulse">
                    Mulai Berlomba Sekarang!
                  </span>
                </motion.div>
              ) : countdown !== null && countdown > 0 ? (
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.4, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex flex-col items-center"
                >
                  <div className="relative flex items-center justify-center">
                    {/* Glowing circular pulse behind number */}
                    <div className="absolute w-20 h-20 rounded-full bg-orange-500/30 blur-xl animate-ping" />
                    <span className="relative text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-orange-400 to-red-600 drop-shadow-[0_8px_20px_rgba(239,68,68,0.7)]">
                      {countdown}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-300/90 mt-1">
                    {countdown === 3
                      ? '🔴 SIAPKAN STAMINA...'
                      : countdown === 2
                      ? '🟡 JAGA KESEIMBANGAN...'
                      : '🟢 TAHAN POSISI...'}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
