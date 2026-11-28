'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard as UnoCardType, UnoColor, UNO_COLOR_META } from '@gamehouse/shared';
import { UnoCard } from './UnoCard';
import { RotateCw, RotateCcw, Flame } from 'lucide-react';

interface UnoCenterPileProps {
  topCard: UnoCardType;
  recentDiscards: UnoCardType[];
  activeColor: UnoColor;
  direction: 1 | -1;
  drawPileCount: number;
  pendingDrawCount: number;
  isMyTurn: boolean;
  canDraw: boolean;
  currentTurnNickname: string;
  turnTimeLeft: number;
  onDrawClick: () => void;
}

export const UnoCenterPile: React.FC<UnoCenterPileProps> = ({
  topCard,
  recentDiscards,
  activeColor,
  direction,
  drawPileCount,
  pendingDrawCount,
  isMyTurn,
  canDraw,
  currentTurnNickname,
  turnTimeLeft,
  onDrawClick,
}) => {
  const colorMeta = UNO_COLOR_META[activeColor] || UNO_COLOR_META.blue;
  const underCards = recentDiscards.slice(0, -1);

  return (
    <div className="relative flex flex-col items-center justify-center my-2 sm:my-4 z-10 select-none">
      {/* Turn Status & Active Color Pill */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-3.5 sm:mb-5 z-20">
        <div
          className="px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-black transition-all duration-500"
          style={{
            backgroundColor: 'rgba(7, 17, 28, 0.85)',
            borderColor: `${colorMeta.hex}CC`,
            boxShadow: `0 0 24px -4px ${colorMeta.glow}`,
          }}
        >
          <span
            className="w-3 h-3 rounded-full ring-2 ring-white/80 shadow"
            style={{ backgroundColor: colorMeta.hex }}
          />
          <span className="text-white">
            Warna Aktif: <strong style={{ color: colorMeta.hex }}>{colorMeta.label.toUpperCase()}</strong>
          </span>
        </div>

        <div
          className={`px-4 py-1.5 rounded-full border backdrop-blur-md text-xs font-black flex items-center gap-1.5 transition-all ${
            isMyTurn
              ? 'bg-gradient-to-r from-amber-600/40 via-orange-600/35 to-rose-600/40 border-amber-400 text-amber-100 shadow-[0_0_26px_rgba(249,115,22,0.7)]'
              : 'bg-[#07111C]/85 border-white/15 text-slate-200'
          }`}
        >
          <span>{isMyTurn ? '🔥 GILIRANMU!' : `Giliran: ${currentTurnNickname}`}</span>
          <span
            className={`font-mono px-1.5 py-0.5 rounded-md text-[11px] ${
              turnTimeLeft <= 5
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-black/40 text-amber-200'
            }`}
          >
            {Math.max(0, Math.ceil(turnTimeLeft))}s
          </span>
        </div>
      </div>

      {/* Main Arena Table Vortex + Glass Card Pad */}
      <div className="relative flex items-center justify-center">
        {/* Swirling Chromatic Energy Vortex Ring behind the center pad */}
        <div
          className={`absolute -inset-10 sm:-inset-14 rounded-full pointer-events-none transition-all duration-700 blur-[14px] opacity-70 ${
            direction === 1 ? 'uno-orbit-cw' : 'uno-orbit-ccw'
          }`}
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${colorMeta.hex} 90deg, transparent 180deg, ${colorMeta.hex} 270deg, transparent 360deg)`,
          }}
        />
        <div
          className="absolute -inset-6 sm:-inset-9 rounded-full border-2 border-white/15 pointer-events-none"
          style={{
            boxShadow: `0 0 55px ${colorMeta.glow}, inset 0 0 40px ${colorMeta.glow}`,
          }}
        />

        {/* Glass Table Pad */}
        <div className="relative flex items-center justify-center px-6 py-5 sm:px-11 sm:py-6 rounded-[36px] bg-[#06181A]/75 border border-white/15 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
          <div className="relative flex items-center gap-5 sm:gap-9 z-10">
            {/* 1. DRAW DECK STACK */}
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <div className="absolute top-1.5 left-1.5 w-[76px] sm:w-[92px] h-[110px] sm:h-[134px] rounded-2xl bg-slate-800 border border-slate-600/70 opacity-70" />
                <div className="absolute top-0.5 left-0.5 w-[76px] sm:w-[92px] h-[110px] sm:h-[134px] rounded-2xl bg-slate-700 border border-slate-500/70 opacity-85" />

                <motion.div
                  whileHover={canDraw ? { scale: 1.06, y: -5 } : undefined}
                  whileTap={canDraw ? { scale: 0.95 } : undefined}
                  onClick={canDraw ? onDrawClick : undefined}
                  className={`relative rounded-2xl transition-all ${
                    canDraw
                      ? pendingDrawCount > 0
                        ? 'ring-3 ring-rose-400 shadow-[0_0_32px_rgba(244,63,94,0.85)] cursor-pointer'
                        : 'ring-2 ring-cyan-300 shadow-[0_0_26px_rgba(34,211,238,0.65)] cursor-pointer'
                      : 'opacity-90'
                  }`}
                >
                  <UnoCard faceDown size="md" />
                  {canDraw && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-slate-950/95 border border-white/80 text-[10px] font-black text-white shadow-lg">
                      {pendingDrawCount > 0 ? `AMBIL +${pendingDrawCount}` : 'TARIK KARTU'}
                    </div>
                  )}
                </motion.div>
              </div>
              <span className="mt-4 text-[10px] font-bold text-slate-300">
                Deck: <strong className="text-white">{drawPileCount}</strong>
              </span>
            </div>

            {/* 2. DIRECTION & STACK BOMB INDICATOR */}
            <div className="flex flex-col items-center justify-center gap-2 min-w-[52px]">
              <motion.div
                animate={{ rotate: direction === 1 ? 360 : -360 }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'linear' }}
                className="w-11 h-11 rounded-full bg-[#07111C]/90 border border-white/25 flex items-center justify-center shadow-lg"
                style={{ boxShadow: `0 0 20px ${colorMeta.glow}` }}
                title={direction === 1 ? 'Arah Searah Jarum Jam' : 'Arah Berlawanan Jarum Jam'}
              >
                {direction === 1 ? (
                  <RotateCw className="w-5 h-5" style={{ color: colorMeta.hex }} />
                ) : (
                  <RotateCcw className="w-5 h-5" style={{ color: colorMeta.hex }} />
                )}
              </motion.div>

              <AnimatePresence>
                {pendingDrawCount > 0 && (
                  <motion.div
                    key={pendingDrawCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1, 1.12, 1], opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 border-2 border-yellow-200 text-white font-black text-xs sm:text-sm shadow-[0_0_24px_rgba(244,63,94,0.85)] flex items-center gap-1"
                  >
                    <Flame className="w-3.5 h-3.5 fill-yellow-200 text-yellow-200" />
                    +{pendingDrawCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. DISCARD PILE */}
            <div className="relative flex flex-col items-center">
              <div className="relative">
                {underCards.map((c, idx) => (
                  <div
                    key={c.id}
                    className="absolute inset-0 pointer-events-none opacity-65"
                    style={{
                      transform: `rotate(${(idx - 1) * 9 - 4}deg) translate(${(idx - 1) * 3}px, ${idx * 2}px)`,
                    }}
                  >
                    <UnoCard card={c} size="md" />
                  </div>
                ))}

                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={topCard.id}
                    initial={{ scale: 1.28, y: -32, rotate: -10, opacity: 0.7 }}
                    animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className="relative rounded-2xl"
                    style={{ boxShadow: `0 0 28px ${colorMeta.glow}` }}
                  >
                    <UnoCard
                      card={topCard}
                      size="md"
                      isWildActiveColor={topCard.color === 'wild' ? activeColor : undefined}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              <span className="mt-4 text-[10px] font-bold text-slate-300">
                Kartu Meja
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
