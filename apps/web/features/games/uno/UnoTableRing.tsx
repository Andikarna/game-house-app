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
import { Bot, AlertTriangle, Flame, Wifi, WifiOff } from 'lucide-react';

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
  lastFxActorId,
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

  return (
    <div className="w-full max-w-5xl mx-auto px-2 z-20">
      <div
        className={`flex flex-wrap items-start justify-center gap-2 sm:gap-3.5`}
      >
        {opponentsOrdered.map((opp, idx) => {
          const isTurn = opp.playerId === currentTurnPlayerId;
          const isVulnerableUno = opp.cardCount === 1 && !opp.calledUno;
          const isSafeUno = opp.cardCount === 1 && opp.calledUno;
          const isTargeted =
            lastFxTargetId === opp.playerId &&
            ['skip','draw2','wild_draw4','catch','swap'].includes(lastFxType || '');
          const isActor = lastFxActorId === opp.playerId && !isTurn;

          const charId = normalizeAvatarId(opp.avatar);
          const charMeta = AVATAR_OPTIONS.find((a) => a.id === charId) || AVATAR_OPTIONS[0];
          const mid = (count - 1) / 2;
          const arcDrop = count <= 5 ? Math.pow(Math.abs(idx - mid), 1.5) * 4 : 0;
          const miniCardsCount = Math.min(5, Math.max(1, opp.cardCount));

          return (
            <motion.div
              key={opp.playerId}
              layout
              animate={{
                scale: isTurn ? 1.07 : isTargeted ? [1, 1.08, 0.96, 1] : 1,
                y: isTurn ? arcDrop - 5 : arcDrop,
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="relative flex flex-col items-center py-2.5 px-3 min-w-[96px] sm:min-w-[126px] max-w-[152px] rounded-3xl border backdrop-blur-xl transition-colors duration-500"
              style={{
                background: isTurn
                  ? `linear-gradient(145deg, ${colorMeta.hex}2A, rgba(5,12,24,0.92))`
                  : isVulnerableUno
                  ? 'linear-gradient(145deg, rgba(127,29,29,0.55), rgba(30,8,14,0.9))'
                  : 'linear-gradient(145deg, rgba(15,28,46,0.78), rgba(6,13,24,0.88))',
                borderColor: isTurn
                  ? `${colorMeta.hex}AA`
                  : isVulnerableUno
                  ? 'rgba(251,113,133,0.75)'
                  : 'rgba(255,255,255,0.12)',
                boxShadow: isTurn
                  ? `0 10px 30px -6px ${colorMeta.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`
                  : isVulnerableUno
                  ? '0 0 24px -4px rgba(244,63,94,0.7)'
                  : '0 8px 20px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {isTurn && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-2.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-slate-950 shadow-md"
                  style={{ backgroundColor: colorMeta.hex }}
                >
                  GILIRAN
                </motion.div>
              )}
              {/* Avatar with timer ring */}
              <div className="relative flex items-center justify-center mb-1">
                {/* Character glow halo */}
                <div
                  className="absolute -inset-1 rounded-full opacity-60 pointer-events-none transition-opacity duration-300"
                  style={{
                    border: `1.5px solid ${charMeta.color}44`,
                    boxShadow: `0 0 10px ${charMeta.color}33`,
                  }}
                />

                {isTurn && (
                  <svg
                    className="w-[60px] h-[60px] -rotate-90 absolute pointer-events-none"
                    viewBox="0 0 60 60"
                  >
                    <circle
                      cx="30" cy="30" r={ringRadius}
                      fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3"
                    />
                    <circle
                      cx="30" cy="30" r={ringRadius}
                      fill="none"
                      stroke={turnTimeLeft <= 5 ? '#FB7185' : colorMeta.hex}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-300"
                      style={{ filter: `drop-shadow(0 0 6px ${turnTimeLeft <= 5 ? '#FB7185' : colorMeta.hex}66)` }}
                    />
                  </svg>
                )}

                <ClimberAvatarIcon avatar={opp.avatar} size={42} shape="circle" />

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
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 1.3 }}
                    className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-[8px] font-black text-white border border-white/60 shadow-lg flex items-center gap-0.5"
                  >
                    <Flame className="w-2 h-2 fill-yellow-200" />
                    UNO
                  </motion.span>
                )}

                {/* Connection dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                    opp.isBot || opp.isConnected
                      ? 'bg-emerald-400 border-emerald-950'
                      : 'bg-slate-500 border-slate-900'
                  }`}
                />
              </div>

              {/* Nickname */}
              <div className="text-[10px] sm:text-[11px] font-extrabold text-white truncate max-w-full px-0.5">
                {opp.nickname}
              </div>

              {/* Card count chip with dynamic mini fan */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="relative flex items-center justify-center h-4">
                  {Array.from({ length: miniCardsCount }).map((_, cIdx) => {
                    const spread = (cIdx - (miniCardsCount - 1) / 2) * 8;
                    return (
                      <div
                        key={cIdx}
                        className="w-2.5 h-3.5 rounded-[2px] bg-gradient-to-br from-[#EF233C] to-[#9B061E] border border-white/80 shadow-sm -ml-1.5 first:ml-0"
                        style={{ transform: `rotate(${spread}deg)` }}
                      />
                    );
                  })}
                </div>
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                    opp.cardCount <= 2
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      : opp.cardCount <= 4
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {opp.cardCount}
                </span>
              </div>

              {/* Catch UNO button */}
              <AnimatePresence>
                {isVulnerableUno && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onCatchUno(opp.playerId)}
                    className="mt-1.5 w-full py-1 px-1 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 cursor-pointer border border-white/30"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    TANGKAP +2
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Last action chip */}
              {opp.lastAction && !isVulnerableUno && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={opp.lastAction}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[8px] font-bold text-slate-400/70 truncate max-w-full mt-0.5"
                  >
                    {opp.lastAction}
                  </motion.span>
                </AnimatePresence>
              )}

              {/* Actor pulse dot */}
              {isActor && (
                <motion.div
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colorMeta.hex }}
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
