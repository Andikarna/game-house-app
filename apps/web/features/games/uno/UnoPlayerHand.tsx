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

  // Sort cards cleanly by color then value for crisp readability
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

  // Dynamic negative margin so even 16+ cards fit nicely inside the screen
  const overlapClass =
    sortedHand.length <= 5
      ? '-space-x-2 sm:space-x-1'
      : sortedHand.length <= 9
      ? '-space-x-6 sm:-space-x-4'
      : sortedHand.length <= 13
      ? '-space-x-9 sm:-space-x-7'
      : '-space-x-12 sm:-space-x-10';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-2.5 z-20 pb-2">
      {/* Contextual Action Bar above hand */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-3">
        {isMyTurn && drawnPlayableCardId && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-950/85 border border-emerald-400/70 shadow-lg"
          >
            <span className="text-[11px] font-black text-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Kartu tarikan cocok!
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={onPassTurn}
              icon={<SkipForward className="w-3.5 h-3.5" />}
              className="text-xs font-black py-1"
            >
              Simpan & Lewati
            </Button>
          </motion.div>
        )}

        {isMyTurn && !drawnPlayableCardId && (
          <Button
            size="sm"
            variant={pendingDrawCount > 0 ? 'danger' : 'secondary'}
            onClick={onDrawCard}
            icon={<Layers className="w-3.5 h-3.5" />}
            className={`text-xs font-black shadow-lg ${
              pendingDrawCount > 0 ? 'animate-pulse ring-2 ring-rose-300' : ''
            }`}
          >
            {pendingDrawCount > 0
              ? `Ambil Hukuman +${pendingDrawCount}`
              : 'Tarik 1 Kartu (Spasi)'}
          </Button>
        )}

        {/* UNO SHOUT BUTTON */}
        {(canShoutUno || isUnoArmedOrSafe) && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.94 }}
            disabled={Boolean(isUnoArmedOrSafe)}
            onClick={onCallUno}
            className={`px-4 py-1.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 border-2 shadow-xl transition-all ${
              isUnoArmedOrSafe
                ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 cursor-default'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 border-yellow-200 text-white cursor-pointer animate-bounce shadow-[0_0_25px_rgba(249,115,22,0.75)]'
            }`}
          >
            <Flame className="w-4 h-4 fill-yellow-200" />
            {isUnoArmedOrSafe ? 'UNO TERKUNCI!' : 'TERIAK UNO! (U)'}
          </motion.button>
        )}

        <span className="px-2.5 py-1 rounded-xl bg-surface/80 border border-slate-700/70 text-[11px] font-bold text-slate-300">
          Kartu Kamu: <strong className="text-white">{hand.length}</strong>
        </span>
      </div>

      {/* Interactive Fanned Hand Strip */}
      <div className="w-full overflow-x-auto pb-2 pt-5 px-4 flex justify-start sm:justify-center scrollbar-none">
        <div className={`flex items-end ${overlapClass} mx-auto`}>
          <AnimatePresence initial={false}>
            {sortedHand.map((card, idx) => {
              const isPlayable = isMyTurn && playableSet.has(card.id);
              const isDimmed = isMyTurn && !isPlayable;
              const centerOffset = idx - (sortedHand.length - 1) / 2;
              const tiltDeg = sortedHand.length <= 12 ? centerOffset * 1.8 : centerOffset * 0.9;
              const arcLift = Math.abs(centerOffset) * (sortedHand.length <= 10 ? 1.5 : 0.7);

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ y: 40, opacity: 0, scale: 0.8 }}
                  animate={{
                    y: isPlayable ? arcLift - 10 : arcLift,
                    rotate: tiltDeg,
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{ y: -70, opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
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
