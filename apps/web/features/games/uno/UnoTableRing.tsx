'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UnoPlayerPublic,
  UnoColor,
  UNO_COLOR_META,
  AVATAR_OPTIONS,
  normalizeAvatarId,
} from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Bot, AlertTriangle, Flame } from 'lucide-react';

interface UnoTableRingProps {
  opponentsOrdered: UnoPlayerPublic[]; // Ordered clockwise starting after local player
  currentTurnPlayerId: string;
  activeColor: UnoColor;
  turnTimeLeft: number;
  turnDurationSeconds: number;
  lastFxActorId?: string;
  lastFxTargetId?: string;
  lastFxType?: string;
  onCatchUno: (targetPlayerId: string) => void;
}

export const UnoTableRing: React.FC<UnoTableRingProps> = ({
  opponentsOrdered,
  currentTurnPlayerId,
  activeColor,
  turnTimeLeft,
  turnDurationSeconds,
  lastFxTargetId,
  lastFxType,
  onCatchUno,
}) => {
  const colorMeta = UNO_COLOR_META[activeColor] || UNO_COLOR_META.blue;
  const count = opponentsOrdered.length;
  const timerRatio = Math.max(0, Math.min(1, turnTimeLeft / Math.max(1, turnDurationSeconds)));
  const ringRadius = 26;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - timerRatio);

  // Compute responsive grid columns on mobile, and clean semi-elliptical arc coordinates on desktop
  return (
    <div className="w-full max-w-5xl mx-auto px-2 z-20">
      {/* Compact Grid for Mobile & Small Tablets (handles 3..9 opponents cleanly without overlap) */}
      <div
        className={`grid gap-2 sm:gap-2.5 ${
          count <= 3
            ? 'grid-cols-3'
            : count <= 5
            ? 'grid-cols-3 sm:grid-cols-5'
            : count <= 7
            ? 'grid-cols-4 sm:grid-cols-7'
            : 'grid-cols-3 xs:grid-cols-5 sm:grid-cols-5 lg:grid-cols-9'
        }`}
      >
        {opponentsOrdered.map((opp) => {
          const isTurn = opp.playerId === currentTurnPlayerId;
          const isVulnerableUno = opp.cardCount === 1 && !opp.calledUno;
          const isSafeUno = opp.cardCount === 1 && opp.calledUno;
          const isTargeted =
            lastFxTargetId === opp.playerId &&
            (lastFxType === 'skip' ||
              lastFxType === 'draw2' ||
              lastFxType === 'wild_draw4' ||
              lastFxType === 'catch' ||
              lastFxType === 'swap');

          const charId = normalizeAvatarId(opp.avatar);
          const charMeta = AVATAR_OPTIONS.find((a) => a.id === charId) || AVATAR_OPTIONS[0];
          const fanCount = Math.min(5, Math.max(1, opp.cardCount));

          return (
            <motion.div
              key={opp.playerId}
              layout
              animate={{
                scale: isTurn ? 1.05 : isTargeted ? [1, 1.08, 0.96, 1] : 1,
                y: isTurn ? -3 : 0,
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className={`relative flex flex-col items-center p-2 rounded-2xl border backdrop-blur-md transition-all ${
                isTurn
                  ? 'bg-surface-elevated/95 shadow-xl'
                  : isVulnerableUno
                  ? 'bg-rose-950/60 border-rose-400/80 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  : 'bg-surface/75 border-slate-800/90'
              }`}
              style={
                isTurn
                  ? {
                      borderColor: colorMeta.hex,
                      boxShadow: `0 0 24px -4px ${colorMeta.glow}`,
                    }
                  : undefined
              }
            >
              {/* Avatar + Circular Turn Timer SVG Ring */}
              <div className="relative flex items-center justify-center mb-1">
                {isTurn && (
                  <svg
                    className="w-14 h-14 -rotate-90 absolute pointer-events-none"
                    viewBox="0 0 60 60"
                  >
                    <circle
                      cx="30"
                      cy="30"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="30"
                      cy="30"
                      r={ringRadius}
                      fill="none"
                      stroke={turnTimeLeft <= 5 ? '#F43F5E' : colorMeta.hex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-300"
                    />
                  </svg>
                )}

                <div
                  className="rounded-full p-0.5 transition-all"
                  style={{
                    boxShadow: isTurn ? `0 0 18px ${charMeta.color}88` : undefined,
                  }}
                >
                  <ClimberAvatarIcon avatar={opp.avatar} size={42} shape="circle" />
                </div>

                {/* Bot Badge */}
                {opp.isBot && (
                  <span
                    title="AI Bot"
                    className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-purple-600 border border-slate-900 flex items-center justify-center shadow"
                  >
                    <Bot className="w-2.5 h-2.5 text-white" />
                  </span>
                )}

                {/* Safe UNO Flame Badge */}
                {isSafeUno && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-[9px] font-black text-white border border-white/60 shadow-lg flex items-center gap-0.5"
                  >
                    <Flame className="w-2.5 h-2.5 fill-yellow-200" />
                    UNO
                  </motion.span>
                )}

                {/* Offline Dot */}
                {!opp.isConnected && !opp.isBot && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-500 border-2 border-slate-900" />
                )}
              </div>

              {/* Nickname */}
              <div className="w-full text-center">
                <div className="text-[11px] font-extrabold text-white truncate px-0.5">
                  {opp.nickname}
                </div>
              </div>

              {/* Overlapping Mini Card Fan + Count */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="flex items-center -space-x-2">
                  {Array.from({ length: fanCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-3 h-4.5 rounded-[3px] bg-gradient-to-br from-slate-900 via-rose-950 to-slate-950 border border-rose-400/70 shadow-sm"
                      style={{
                        transform: `rotate(${(idx - (fanCount - 1) / 2) * 8}deg)`,
                      }}
                    />
                  ))}
                </div>
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                    opp.cardCount <= 2
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700'
                  }`}
                >
                  {opp.cardCount}
                </span>
              </div>

              {/* Vulnerable UNO! Catch Button */}
              {isVulnerableUno && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onCatchUno(opp.playerId)}
                  className="mt-1.5 w-full py-1 px-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 cursor-pointer animate-pulse border border-white/40"
                >
                  <AlertTriangle className="w-3 h-3" />
                  TANGKAP +2!
                </motion.button>
              )}

              {/* Last Action Micro Pill */}
              <AnimatePresence>
                {opp.lastAction && !isVulnerableUno && (
                  <motion.span
                    key={opp.lastAction}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-[9px] font-bold text-slate-400 truncate max-w-full"
                  >
                    {opp.lastAction}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
