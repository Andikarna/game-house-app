'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard as UnoCardType, UnoPlayerPublic } from '@gamehouse/shared';
import { UnoCard } from './UnoCard';
import { Button } from '../../../components/ui/Button';
import { Flame, SkipForward, Layers, Sparkles } from 'lucide-react';

interface UnoPlayerHandProps {
  myPlayer?: UnoPlayerPublic;
  hand: UnoCardType[];
  playableCardIds: string[];
  isMyTurn: boolean;
  pendingDrawCount: number;
  drawnPlayableCardId: string | null;
  onPlayCard: (card: UnoCardType) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallUno: () => void;
}

const COLOR_SORT_ORDER: Record<string, number> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3,
  wild: 4,
};

export const UnoPlayerHand: React.FC<UnoPlayerHandProps> = ({
  myPlayer,
  hand,
  playableCardIds,
  isMyTurn,
  pendingDrawCount,
  drawnPlayableCardId,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
}) => {
  const playableSet = useMemo(() => new Set(playableCardIds), [playableCardIds]);

  const sortedHand = useMemo(() => {
    return [...hand].sort((a, b) => {
      const ca = COLOR_SORT_ORDER[a.color] ?? 5;
      const cb = COLOR_SORT_ORDER[b.color] ?? 5;
      if (ca !== cb) return ca - cb;
      return a.value.localeCompare(b.value);
    });
  }, [hand]);

  const canShoutUno =
    (hand.length === 2 && isMyTurn && !myPlayer?.unoPreArmed) ||
    (hand.length === 1 && !myPlayer?.calledUno);

  const isUnoArmedOrSafe =
    (hand.length === 2 && myPlayer?.unoPreArmed) ||
    (hand.length === 1 && myPlayer?.calledUno);

  const overlapClass =
    sortedHand.length <= 5
      ? '-space-x-1 sm:space-x-1'
      : sortedHand.length <= 9
      ? '-space-x-5 sm:-space-x-3'
      : sortedHand.length <= 13
      ? '-space-x-8 sm:-space-x-6'
      : '-space-x-11 sm:-space-x-9';

  const hasPlayable = isMyTurn && playableCardIds.length > 0 && !drawnPlayableCardId;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-2 z-20 pb-2">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-3">

        {/* Just drew a playable card */}
        {isMyTurn && drawnPlayableCardId && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border backdrop-blur-xl"
            style={{ background: 'rgba(5,46,22,0.85)', borderColor: 'rgba(74,222,128,0.5)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-200">Kartu tarikan cocok!</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={onPassTurn}
              icon={<SkipForward className="w-3.5 h-3.5" />}
              className="text-xs font-black py-1 bg-emerald-900/50 border-emerald-500/50 text-emerald-200 hover:bg-emerald-800/60"
            >
              Lewati
            </Button>
          </motion.div>
        )}

        {/* Draw button */}
        {isMyTurn && !drawnPlayableCardId && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onDrawCard}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black border transition-all shadow-lg cursor-pointer ${
              pendingDrawCount > 0
                ? 'bg-gradient-to-r from-rose-600/50 to-orange-600/50 border-rose-400/60 text-rose-100 shadow-[0_0_18px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-black/50 border-white/15 text-slate-200 hover:bg-white/8'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {pendingDrawCount > 0
              ? `Ambil Hukuman +${pendingDrawCount}`
              : 'Tarik 1 Kartu (Spasi)'}
          </motion.button>
        )}

        {/* UNO shout button */}
        {(canShoutUno || isUnoArmedOrSafe) && (
          <motion.button
            type="button"
            whileHover={!isUnoArmedOrSafe ? { scale: 1.06 } : undefined}
            whileTap={!isUnoArmedOrSafe ? { scale: 0.93 } : undefined}
            disabled={Boolean(isUnoArmedOrSafe)}
            onClick={onCallUno}
            className={`px-4 py-1.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border-2 shadow-xl transition-all ${
              isUnoArmedOrSafe
                ? 'bg-emerald-600/25 border-emerald-400/50 text-emerald-200 cursor-default'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 border-yellow-200/80 text-white cursor-pointer shadow-[0_0_22px_rgba(249,115,22,0.65)]'
            }`}
            style={!isUnoArmedOrSafe ? { animation: 'bounce 1s ease-in-out infinite' } : undefined}
          >
            <Flame className="w-4 h-4 fill-yellow-200 text-yellow-200" />
            {isUnoArmedOrSafe ? 'UNO TERKUNCI! 🔒' : 'TERIAK UNO! (U)'}
          </motion.button>
        )}

        {/* Card count */}
        <span
          className="px-3 py-1 rounded-xl text-[11px] font-bold text-slate-300 border border-white/10"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          Kartu: <strong className="text-white">{hand.length}</strong>
          {hasPlayable && (
            <span className="ml-1.5 text-amber-400 text-[10px] font-black animate-pulse">
              ✦ {playableCardIds.length} bisa main
            </span>
          )}
        </span>
      </div>

      {/* Hand strip */}
      <div id="uno-player-hand" className="w-full overflow-x-auto pb-5 pt-14 px-6 flex justify-start sm:justify-center scrollbar-none">
        <div className={`flex items-end ${overlapClass} mx-auto`}>
          <AnimatePresence initial={false}>
            {sortedHand.map((card, idx) => {
              const isPlayable = isMyTurn && playableSet.has(card.id);
              const isDimmed = isMyTurn && !isPlayable && !drawnPlayableCardId;
              const centerOffset = idx - (sortedHand.length - 1) / 2;
              const tiltDeg = sortedHand.length <= 10
                ? centerOffset * 3.0
                : centerOffset * 1.2;
              const arcLift = Math.pow(Math.abs(centerOffset), 1.35) * (sortedHand.length <= 10 ? 2.4 : 1.0);

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ y: 48, opacity: 0, scale: 0.75 }}
                  animate={{
                    y: isPlayable ? arcLift - 16 : arcLift,
                    rotate: tiltDeg,
                    opacity: 1,
                    scale: isPlayable ? 1.04 : 1,
                  }}
                  whileHover={
                    isPlayable
                      ? { y: arcLift - 30, rotate: 0, scale: 1.13, zIndex: 80 }
                      : { y: arcLift - 8, scale: 1.04, zIndex: 40 }
                  }
                  whileTap={isPlayable ? { scale: 0.95 } : undefined}
                  exit={{ y: -90, opacity: 0, scale: 0.65 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  style={{ zIndex: isPlayable ? 25 + idx : idx + 1 }}
                  className="shrink-0"
                >
                  <UnoCard
                    card={card}
                    size="md"
                    playable={isPlayable}
                    dimmed={isDimmed}
                    selected={drawnPlayableCardId === card.id}
                    onClick={isPlayable ? () => onPlayCard(card) : undefined}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
