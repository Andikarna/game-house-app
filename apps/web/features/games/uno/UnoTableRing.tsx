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
  opponentsOrdered: UnoPlayerPublic[];
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
  const ringRadius = 29;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - timerRatio);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 z-20">
      <div
        className={`grid gap-2 sm:gap-3 ${
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

          return (
            <motion.div
              key={opp.playerId}
              layout
              animate={{
                scale: isTurn ? 1.05 : isTargeted ? [1, 1.08, 0.96, 1] : 1,
                y: isTurn ? -3 : 0,
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className={`relative flex flex-col items-center py-2.5 px-2 rounded-2xl border backdrop-blur-md transition-all ${
                isTurn
                  ? 'bg-[#091322]/90 shadow-2xl'
                  : isVulnerableUno
                  ? 'bg-rose-950/75 border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.5)]'
                  : 'bg-[#07111C]/75 border-white/10 hover:border-white/20'
              }`}
              style={
                isTurn
                  ? {
                      borderColor: colorMeta.hex,
                      boxShadow: `0 0 26px -4px ${colorMeta.glow}`,
                    }
                  : undefined
              }
            >
              {/* Neon Concentric Character Ring + Turn Timer */}
              <div className="relative flex items-center justify-center mb-1.5">
                {/* Permanent Character Neon Halo Ring */}
                <div
                  className="absolute -inset-1.5 rounded-full opacity-80 pointer-events-none"
                  style={{
                    border: `2px solid ${charMeta.color}`,
                    boxShadow: `0 0 16px ${charMeta.color}88, inset 0 0 10px ${charMeta.color}55`,
                  }}
                />

                {isTurn && (
                  <svg
                    className="w-16 h-16 -rotate-90 absolute pointer-events-none"
                    viewBox="0 0 66 66"
                  >
                    <circle
                      cx="33"
                      cy="33"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="33"
                      cy="33"
                      r={ringRadius}
                      fill="none"
                      stroke={turnTimeLeft <= 5 ? '#F43F5E' : '#FDE047'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-300"
                    />
                  </svg>
                )}

                <ClimberAvatarIcon avatar={opp.avatar} size={46} shape="circle" />

                {opp.isBot && (
                  <span
                    title="AI Bot"
                    className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-purple-600 border border-slate-900 flex items-center justify-center shadow"
                  >
                    <Bot className="w-2.5 h-2.5 text-white" />
                  </span>
                )}

                {isSafeUno && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-[9px] font-black text-white border border-white/70 shadow-lg flex items-center gap-0.5"
                  >
                    <Flame className="w-2.5 h-2.5 fill-yellow-200" />
                    UNO
                  </motion.span>
                )}

                {!opp.isConnected && !opp.isBot && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-500 border-2 border-slate-900" />
                )}
              </div>

              {/* Nickname */}
              <div className="w-full text-center">
                <div className="text-[11px] sm:text-xs font-extrabold text-white truncate px-0.5">
                  {opp.nickname}
                </div>
              </div>

              {/* Classic Mini Red Card Stack + Count Badge (matches reference!) */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-4.5 rounded-[3px] bg-gradient-to-br from-[#EF233C] to-[#9B061E] border border-white/80 shadow -rotate-6" />
                  <div className="w-3.5 h-4.5 rounded-[3px] bg-gradient-to-br from-[#EF233C] to-[#9B061E] border border-white/80 shadow rotate-6 -ml-2" />
                </div>
                <span
                  className={`text-xs font-black px-1.5 rounded-md ${
                    opp.cardCount <= 2
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/60'
                      : 'text-amber-300'
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

              <AnimatePresence>
                {opp.lastAction && !isVulnerableUno && (
                  <motion.span
                    key={opp.lastAction}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 text-[9px] font-bold text-slate-300/80 truncate max-w-full"
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
