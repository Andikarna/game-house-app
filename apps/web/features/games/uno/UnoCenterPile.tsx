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
  nextTurnNickname?: string;
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
  nextTurnNickname,
  turnTimeLeft,
  onDrawClick,
}) => {
  const colorMeta = UNO_COLOR_META[activeColor] || UNO_COLOR_META.blue;
  const underCards = recentDiscards.slice(0, -1).slice(-3);
  const isCritical = turnTimeLeft <= 5;

  return (
    <div className="relative flex flex-col items-center justify-center my-1 sm:my-3 z-10 select-none">
      {/* Turn status pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3 sm:mb-4 z-20">
        {/* Active color pill */}
        <motion.div
          layout
          className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border md:backdrop-blur-xl shadow-md md:shadow-lg flex items-center gap-1.5 text-[11px] sm:text-xs font-black transition-all duration-500"
          style={{
            background: `${colorMeta.hex}18`,
            borderColor: `${colorMeta.hex}60`,
            boxShadow: `0 0 20px -6px ${colorMeta.glow}`,
          }}
        >
          <span
            className="w-3 h-3 rounded-full ring-2 ring-white/60 shadow-sm"
            style={{ backgroundColor: colorMeta.hex }}
          />
          <span className="text-white">
            Warna: <strong style={{ color: colorMeta.hex }}>{colorMeta.label.toUpperCase()}</strong>
          </span>
        </motion.div>

        {/* Turn indicator with Next Turn player */}
        <div
          className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border md:backdrop-blur-xl text-[11px] sm:text-xs font-black flex items-center gap-2 transition-all duration-300 ${
            isMyTurn
              ? 'bg-gradient-to-r from-amber-600/35 to-orange-600/35 border-amber-400/70 text-amber-100 shadow-[0_0_22px_rgba(249,115,22,0.6)]'
              : 'bg-black/40 border-white/12 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>{isMyTurn ? '🔥 GILIRANMU!' : `Giliran: ${currentTurnNickname}`}</span>
            {nextTurnNickname && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 pl-1 border-l border-white/15">
                <span className="text-slate-500">→</span>
                <span className="text-slate-300">{nextTurnNickname}</span>
              </span>
            )}
          </div>
          <span
            className={`font-mono px-1.5 py-0.5 rounded-lg text-[11px] ${
              isCritical
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-black/40 text-amber-200'
            }`}
          >
            {Math.max(0, Math.ceil(turnTimeLeft))}s
          </span>
        </div>
      </div>

      {/* Main center arena */}
      <div className="relative flex items-center justify-center my-1">
        {/* Swirling conic orbit ring (desktop only - blur filter + infinite spin is heavy on mobile) */}
        <motion.div
          animate={{ rotate: direction === 1 ? 360 : -360 }}
          transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
          className="hidden md:block absolute -inset-12 sm:-inset-16 rounded-full pointer-events-none opacity-55 blur-[18px]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${colorMeta.hex} 80deg, transparent 180deg, ${colorMeta.hex} 260deg, transparent 360deg)`,
          }}
        />

        {/* Rotating SVG dashed orbit arrows */}
        <motion.svg
          animate={{ rotate: direction === 1 ? 360 : -360 }}
          transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
          viewBox="0 0 320 220"
          className="hidden sm:block absolute -inset-8 sm:-inset-12 w-[calc(100%+4rem)] sm:w-[calc(100%+6rem)] h-[calc(100%+4rem)] sm:h-[calc(100%+6rem)] pointer-events-none opacity-65"
        >
          <ellipse
            cx="160"
            cy="110"
            rx="150"
            ry="96"
            fill="none"
            stroke={colorMeta.hex}
            strokeWidth="1.75"
            strokeDasharray="10 10"
          />
        </motion.svg>

        {/* Glass oval table pad */}
        <div
          className="relative flex items-center justify-center px-5 py-3.5 sm:px-11 sm:py-6 rounded-[32px] sm:rounded-[44px] md:backdrop-blur-2xl border border-white/15 shadow-xl md:shadow-[0_24px_65px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)]"
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${colorMeta.hex}22, rgba(3,12,22,0.86) 72%)`,
          }}
        >
          {/* Inner ambient highlight */}
          <div className="absolute inset-0 rounded-[44px] bg-gradient-to-b from-white/8 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-4 sm:gap-8 z-10">
            {/* Draw pile */}
            <div className="relative flex flex-col items-center">
              <div id="uno-draw-pile" className="relative">
                {/* Stack shadow cards */}
                <div className="absolute top-2 left-2 w-[76px] sm:w-[88px] h-[110px] sm:h-[128px] rounded-2xl bg-slate-900/80 border border-slate-700/50" />
                <div className="absolute top-1 left-1 w-[76px] sm:w-[88px] h-[110px] sm:h-[128px] rounded-2xl bg-slate-800/80 border border-slate-700/50" />

                <motion.div
                  whileHover={canDraw ? { scale: 1.07, y: -6 } : undefined}
                  whileTap={canDraw ? { scale: 0.95 } : undefined}
                  onClick={canDraw ? onDrawClick : undefined}
                  className={`relative rounded-2xl transition-all duration-200 ${
                    canDraw
                      ? pendingDrawCount > 0
                        ? 'ring-2 ring-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.8)] cursor-pointer'
                        : 'ring-2 ring-cyan-300/80 shadow-[0_0_24px_rgba(34,211,238,0.6)] cursor-pointer'
                      : ''
                  }`}
                >
                  <UnoCard faceDown size="md" />

                  {canDraw && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-black/90 border border-white/70 text-[9px] font-black text-white shadow-lg"
                    >
                      {pendingDrawCount > 0 ? `+${pendingDrawCount}` : 'TARIK'}
                    </motion.div>
                  )}
                </motion.div>
              </div>

              <span className="mt-6 text-[9px] font-bold text-slate-400">
                Deck <strong className="text-white">{drawPileCount}</strong>
              </span>
            </div>

            {/* Direction + stack bomb */}
            <div className="flex flex-col items-center gap-2 min-w-[44px]">
              <motion.div
                animate={{ rotate: direction === 1 ? 360 : -360 }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${colorMeta.hex}22, rgba(2,10,20,0.9))`,
                  boxShadow: `0 0 18px ${colorMeta.glow}`,
                }}
                title={direction === 1 ? 'Searah Jarum Jam' : 'Berlawanan Jarum Jam'}
              >
                {direction === 1
                  ? <RotateCw className="w-4 h-4" style={{ color: colorMeta.hex }} />
                  : <RotateCcw className="w-4 h-4" style={{ color: colorMeta.hex }} />
                }
              </motion.div>

              <AnimatePresence>
                {pendingDrawCount > 0 && (
                  <motion.div
                    key={pendingDrawCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: [1, 1.14, 1], opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 border-2 border-yellow-200 text-white font-black text-xs shadow-[0_0_22px_rgba(244,63,94,0.8)] flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3 fill-yellow-200 text-yellow-200" />
                    +{pendingDrawCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Discard pile */}
            <div className="relative flex flex-col items-center">
              <div className="relative">
                {underCards.map((c, idx) => (
                  <div
                    key={c.id}
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{
                      transform: `rotate(${(idx - 1) * 10 - 5}deg) translate(${(idx - 1) * 4}px, ${idx * 2}px)`,
                    }}
                  >
                    <UnoCard card={c} size="md" />
                  </div>
                ))}

                <div
                  id="uno-discard-pile"
                  className="relative rounded-2xl"
                  style={{ filter: `drop-shadow(0 0 18px ${colorMeta.glow})` }}
                >
                  <UnoCard
                    card={topCard}
                    size="md"
                    isWildActiveColor={topCard.color === 'wild' ? activeColor : undefined}
                  />
                </div>
              </div>

              <span className="mt-6 text-[9px] font-bold text-slate-400">Kartu Meja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
