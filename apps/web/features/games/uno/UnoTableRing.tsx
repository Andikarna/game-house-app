'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  nextTurnPlayerId?: string;
  activeColor: UnoColor;
  direction: 1 | -1;
  turnTimeLeft: number;
  turnDurationSeconds: number;
  lastFxActorId?: string;
  lastFxTargetId?: string;
  lastFxType?: string;
  compactHorizontal?: boolean;
  onCatchUno: (targetPlayerId: string) => void;
  children?: React.ReactNode;
}

/**
 * Returns clockwise angles (in degrees, -90 = top, 0 = right, -180 = left)
 * arranged in an arc/circle around the center table so the bottom remains
 * open for the local player's hand.
 */
function getCircularAngles(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [-90];
  if (count === 2) return [-145, -35];
  if (count === 3) return [-174, -90, -6];
  if (count === 4) return [-186, -124, -56, 6];
  if (count === 5) return [-192, -141, -90, -39, 12];
  const start = count >= 8 ? -204 : -198;
  const end = count >= 8 ? 24 : 18;
  return Array.from({ length: count }, (_, i) => start + ((end - start) * i) / (count - 1));
}

export const UnoTableRing: React.FC<UnoTableRingProps> = ({
  opponentsOrdered,
  currentTurnPlayerId,
  nextTurnPlayerId,
  activeColor,
  direction,
  turnTimeLeft,
  turnDurationSeconds,
  lastFxActorId,
  lastFxTargetId,
  lastFxType,
  compactHorizontal = false,
  onCatchUno,
  children,
}) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaSize, setArenaSize] = useState({ w: 800, h: 460 });

  useEffect(() => {
    const el = arenaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setArenaSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compactHorizontal]);

  const colorMeta = UNO_COLOR_META[activeColor] || UNO_COLOR_META.blue;
  const count = opponentsOrdered.length;
  const angles = getCircularAngles(count);
  const timerRatio = Math.max(0, Math.min(1, turnTimeLeft / Math.max(1, turnDurationSeconds)));
  const ringRadius = 26;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - timerRatio);
  const isCrowded = count >= 6;
  const rx = count >= 8 ? 43 : count >= 5 ? 42 : 40.5;
  const ry = count >= 8 ? (compactHorizontal ? 38 : 37) : count >= 5 ? 37 : 35.5;
  const centerY = compactHorizontal ? 50 : 53;

  // Build directional arrow markers between every adjacent pair of seats around the circle
  // (including the bottom seat = local player at +90 deg).
  const turnArrows = React.useMemo(() => {
    if (count === 0) return [];
    const list: Array<{
      key: string;
      midAngle: number;
      isActiveFlow: boolean;
    }> = [];

    // Opponent-to-opponent gaps (clockwise)
    for (let i = 0; i < count - 1; i++) {
      const fromId = opponentsOrdered[i].playerId;
      const toId = opponentsOrdered[i + 1].playerId;
      const isActiveFlow =
        (direction === 1 && currentTurnPlayerId === fromId && nextTurnPlayerId === toId) ||
        (direction === -1 && currentTurnPlayerId === toId && nextTurnPlayerId === fromId);
      list.push({
        key: `gap-${i}`,
        midAngle: (angles[i] + angles[i + 1]) / 2,
        isActiveFlow,
      });
    }

    // Gap between local player (+90 deg) and first opponent (angles[0])
    const firstId = opponentsOrdered[0].playerId;
    const isMyTurnNow = !opponentsOrdered.some((o) => o.playerId === currentTurnPlayerId);
    const isNextMe = !opponentsOrdered.some((o) => o.playerId === nextTurnPlayerId) && Boolean(nextTurnPlayerId);
    const leftBottomMid = Math.max(122, Math.min(148, (90 + (angles[0] + 360)) / 2));
    list.push({
      key: 'gap-bottom-left',
      midAngle: leftBottomMid,
      isActiveFlow:
        (direction === 1 && isMyTurnNow && nextTurnPlayerId === firstId) ||
        (direction === -1 && currentTurnPlayerId === firstId && isNextMe),
    });

    // Gap between last opponent (angles[count - 1]) and local player (+90 deg)
    const lastId = opponentsOrdered[count - 1].playerId;
    const rightBottomMid = Math.max(32, Math.min(58, (angles[count - 1] + 90) / 2));
    list.push({
      key: 'gap-bottom-right',
      midAngle: rightBottomMid,
      isActiveFlow:
        (direction === 1 && currentTurnPlayerId === lastId && isNextMe) ||
        (direction === -1 && isMyTurnNow && nextTurnPlayerId === lastId),
    });

    return list;
  }, [count, opponentsOrdered, angles, direction, currentTurnPlayerId, nextTurnPlayerId]);

  return (
    <div
      ref={arenaRef}
      className={`relative w-full max-w-5xl mx-auto flex-1 flex items-center justify-center z-20 ${
        compactHorizontal
          ? 'min-h-[210px] my-0'
          : 'min-h-[370px] sm:min-h-[460px] md:min-h-[490px] mt-1 mb-0.5'
      }`}
    >
      {/* Subtle circular seating track */}
      <div
        className="hidden sm:block absolute inset-x-10 inset-y-8 rounded-[999px] border border-white/[0.04] pointer-events-none"
      />

      {/* Directional rotation arrows placed cleanly along the inner orbit so pods never hide them */}
      {turnArrows.map((arrow) => {
        const rad = (arrow.midAngle * Math.PI) / 180;
        const innerScale = isCrowded ? 0.71 : 0.78;
        const arrowRx = rx * innerScale;
        const arrowRy = ry * (isCrowded ? 0.73 : 0.8);
        const leftPct = 50 + Math.cos(rad) * arrowRx;
        const topPct = centerY + Math.sin(rad) * arrowRy;

        // Compute true screen-pixel tangent on the ellipse
        const dx = -arenaSize.w * arrowRx * Math.sin(rad);
        const dy = arenaSize.h * arrowRy * Math.cos(rad);
        const baseTangentDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        const tangentDeg = direction === 1 ? baseTangentDeg : baseTangentDeg + 180;

        const sizeCls = compactHorizontal
          ? arrow.isActiveFlow
            ? 'w-8 h-8 scale-110'
            : 'w-6 h-6 opacity-75'
          : isCrowded
          ? arrow.isActiveFlow
            ? 'w-8 h-8 sm:w-11 sm:h-11 scale-110'
            : 'w-6 h-6 sm:w-8 sm:h-8 opacity-75'
          : arrow.isActiveFlow
          ? 'w-10 h-10 sm:w-13 sm:h-13 scale-110'
          : 'w-8 h-8 sm:w-10 sm:h-10 opacity-75';

        const svgCls = compactHorizontal
          ? arrow.isActiveFlow
            ? 'w-5 h-5 relative z-10'
            : 'w-4 h-4 relative z-10'
          : isCrowded
          ? arrow.isActiveFlow
            ? 'w-5 h-5 sm:w-6 sm:h-6 relative z-10'
            : 'w-4 h-4 sm:w-5 sm:h-5 relative z-10'
          : arrow.isActiveFlow
          ? 'w-6 h-6 sm:w-7 sm:h-7 relative z-10'
          : 'w-5 h-5 sm:w-6 sm:h-6 relative z-10';

        return (
          <div
            key={arrow.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-[15] pointer-events-none transition-all duration-300"
            style={{
              left: `${leftPct.toFixed(2)}%`,
              top: `${topPct.toFixed(2)}%`,
            }}
            title={direction === 1 ? 'Arah putaran searah jarum jam' : 'Arah putaran berlawanan jarum jam'}
          >
            {/* Outer UNO 4-color / active-color rim */}
            <div
              className={`relative rounded-full p-[2px] transition-all duration-300 ${sizeCls}`}
              style={{
                background: arrow.isActiveFlow
                  ? `conic-gradient(from 0deg, #EF233C, #FACC15, #22C55E, #2589FF, #EF233C)`
                  : `linear-gradient(135deg, ${colorMeta.hex}99, rgba(255,255,255,0.22))`,
                boxShadow: arrow.isActiveFlow
                  ? `0 0 20px ${colorMeta.glow}, 0 6px 14px rgba(0,0,0,0.7)`
                  : '0 4px 10px rgba(0,0,0,0.55)',
              }}
            >
              {/* Inner UNO card-inspired badge rotated along ellipse tangent */}
              <div
                className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  transform: `rotate(${tangentDeg.toFixed(1)}deg)`,
                  background: arrow.isActiveFlow
                    ? `radial-gradient(circle at 35% 30%, ${colorMeta.hex}55, #070E1A 78%)`
                    : 'radial-gradient(circle at 35% 30%, rgba(20,34,56,0.96), #060C16 80%)',
                }}
              >
                {/* Iconic tilted UNO oval ring */}
                <div
                  className="absolute inset-1 rounded-full border pointer-events-none"
                  style={{
                    borderColor: arrow.isActiveFlow ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)',
                    transform: 'rotate(-18deg) scaleY(0.76)',
                  }}
                />

                {/* Bold UNO Arcade Directional Arrow SVG */}
                <svg viewBox="0 0 36 36" className={svgCls} fill="none">
                  <path
                    d="M7 12l5 6-5 6"
                    stroke={arrow.isActiveFlow ? '#FACC15' : colorMeta.hex}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={arrow.isActiveFlow ? 0.95 : 0.7}
                  />
                  <path
                    d="M15 9l10 9-10 9"
                    stroke="#050912"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 9l10 9-10 9"
                    stroke={arrow.isActiveFlow ? '#FFFFFF' : '#E2E8F0'}
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="26.5"
                    cy="18"
                    r={arrow.isActiveFlow ? '2' : '1.4'}
                    fill={arrow.isActiveFlow ? colorMeta.hex : '#FACC15'}
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}

      {/* Center table (Draw/Discard piles + ticker) */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center ${
          compactHorizontal
            ? 'scale-[0.58] my-0'
            : isCrowded
            ? 'scale-[0.62] sm:scale-95 md:scale-100 mt-8 sm:mt-8'
            : 'scale-[0.72] sm:scale-95 md:scale-100 mt-7 sm:mt-8'
        }`}
      >
        {children}
      </div>

      {/* Opponents positioned around the circle */}
      {opponentsOrdered.map((opp, idx) => {
        const isTurn = opp.playerId === currentTurnPlayerId;
        const isNextTurn = opp.playerId === nextTurnPlayerId && !isTurn;
        const isVulnerableUno = opp.cardCount === 1 && !opp.calledUno;
        const isSafeUno = opp.cardCount === 1 && opp.calledUno;
        const isTargeted =
          lastFxTargetId === opp.playerId &&
          ['skip', 'draw2', 'wild_draw4', 'catch', 'swap'].includes(lastFxType || '');
        const isActor = lastFxActorId === opp.playerId && !isTurn;

        const charId = normalizeAvatarId(opp.avatar);
        const charMeta = AVATAR_OPTIONS.find((a) => a.id === charId) || AVATAR_OPTIONS[0];
        const miniCardsCount = Math.min(5, Math.max(1, opp.cardCount));

        const rad = ((angles[idx] ?? -90) * Math.PI) / 180;
        const leftPct = 50 + Math.cos(rad) * rx;
        const topPct = centerY + Math.sin(rad) * ry;

        return (
          <div
            key={opp.playerId}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${leftPct.toFixed(2)}%`,
              top: `${topPct.toFixed(2)}%`,
            }}
          >
            <motion.div
              id={`uno-player-pod-${opp.playerId}`}
              layout
              animate={{
                scale: isTurn ? 1.07 : isTargeted ? [1, 1.08, 0.96, 1] : 1,
                y: isTurn ? -3 : 0,
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className={`relative flex flex-col items-center rounded-2xl sm:rounded-3xl border md:backdrop-blur-xl transition-colors duration-300 ${
                compactHorizontal
                  ? isCrowded
                    ? 'py-1 px-1.5 w-[64px]'
                    : 'py-1 px-2 w-[78px]'
                  : isCrowded
                  ? 'py-1 px-1 sm:py-2 sm:px-2.5 w-[54px] sm:w-[112px]'
                  : 'py-1.5 px-1.5 sm:py-2.5 sm:px-3 w-[68px] sm:w-[126px]'
              }`}
              style={{
                background: isTurn
                  ? `linear-gradient(145deg, ${colorMeta.hex}2A, rgba(5,12,24,0.92))`
                  : isNextTurn
                  ? 'linear-gradient(145deg, rgba(30,58,138,0.35), rgba(6,13,24,0.9))'
                  : isVulnerableUno
                  ? 'linear-gradient(145deg, rgba(127,29,29,0.55), rgba(30,8,14,0.9))'
                  : 'linear-gradient(145deg, rgba(15,28,46,0.78), rgba(6,13,24,0.88))',
                borderColor: isTurn
                  ? `${colorMeta.hex}AA`
                  : isNextTurn
                  ? 'rgba(96,165,250,0.5)'
                  : isVulnerableUno
                  ? 'rgba(251,113,133,0.75)'
                  : 'rgba(255,255,255,0.12)',
                boxShadow: isTurn
                  ? `0 10px 30px -6px ${colorMeta.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`
                  : isNextTurn
                  ? '0 0 18px -4px rgba(59,130,246,0.5)'
                  : isVulnerableUno
                  ? '0 0 24px -4px rgba(244,63,94,0.7)'
                  : '0 8px 20px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {isTurn && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-slate-950 shadow-md ring-2 ring-white/40"
                  style={{ backgroundColor: colorMeta.hex }}
                >
                  GILIRAN
                </motion.div>
              )}
              {isNextTurn && (
                <div
                  className="absolute -top-2.5 px-1.5 py-0.5 rounded-full text-[7.5px] font-extrabold uppercase tracking-wider bg-blue-500/80 text-white shadow border border-blue-300/40"
                >
                  SELANJUTNYA
                </div>
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
                    className="w-[44px] h-[44px] sm:w-[58px] sm:h-[58px] -rotate-90 absolute pointer-events-none"
                    viewBox="0 0 60 60"
                  >
                    <circle
                      cx="30" cy="30" r={ringRadius}
                      fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5"
                    />
                    <circle
                      cx="30" cy="30" r={ringRadius}
                      fill="none"
                      stroke={turnTimeLeft <= 5 ? '#FB7185' : colorMeta.hex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-300"
                    />
                  </svg>
                )}

                <div className="sm:hidden">
                  <ClimberAvatarIcon avatar={opp.avatar} size={30} shape="circle" />
                </div>
                <div className="hidden sm:block">
                  <ClimberAvatarIcon avatar={opp.avatar} size={42} shape="circle" />
                </div>

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
              <div className="text-[9px] sm:text-[11px] font-extrabold text-white truncate max-w-full px-0.5 leading-tight">
                {opp.nickname}
              </div>

              {/* Card count chip with dynamic mini fan */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
                <div className="hidden sm:flex relative items-center justify-center h-4">
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
                <div className="sm:hidden w-2.5 h-3.5 rounded-[2px] bg-gradient-to-br from-[#EF233C] to-[#9B061E] border border-white/80 shadow-sm shrink-0" />
                <span
                  className={`text-[10px] sm:text-[11px] font-black px-1 sm:px-1.5 py-0.2 rounded-md ${
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
              {opp.lastAction && !isVulnerableUno && !compactHorizontal && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={opp.lastAction}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`${
                      isCrowded ? 'hidden sm:block' : 'block'
                    } text-[8px] font-bold text-slate-400/70 truncate max-w-full mt-0.5`}
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
          </div>
        );
      })}
    </div>
  );
};
