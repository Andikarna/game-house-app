'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard } from './UnoCard';
import { UnoCard as UnoCardType } from '@gamehouse/shared';

export interface CardFlightEvent {
  id: string;
  card?: UnoCardType;
  from: { x: number; y: number } | 'deck' | 'center' | string; // player id or special keyword
  to: { x: number; y: number } | 'hand' | 'center' | string;
  duration?: number;
  isFaceDown?: boolean;
  showcaseFirst?: boolean;
  actorName?: string;
}

export interface ComboCardBanner {
  id: string;
  type: 'draw_chain' | 'skip_combo' | 'wild_chain' | 'reverse_clash';
  title: string;
  subtitle: string;
  count?: number;
  colorHex: string;
}

interface UnoAnimationLayerProps {
  flights: CardFlightEvent[];
  onFlightComplete: (id: string) => void;
  comboBanner: ComboCardBanner | null;
}

const getElCenter = (selectorOrId: string) => {
  const el = document.getElementById(selectorOrId) || document.querySelector(selectorOrId);
  if (el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return null;
};

const resolveEndpoint = (
  target: { x: number; y: number } | 'deck' | 'center' | 'hand' | string,
  role: 'from' | 'to'
) => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (target === 'deck') {
    const el = getElCenter('uno-draw-pile');
    return el ? { x: el.x, y: el.y - 10 } : { x: w * 0.44, y: h * 0.45 };
  }
  if (target === 'center') {
    const el = getElCenter('uno-discard-pile');
    return el ? { x: el.x, y: el.y - 10 } : { x: w * 0.54, y: h * 0.45 };
  }
  if (target === 'hand') {
    const el = getElCenter('uno-player-hand');
    return el ? { x: el.x, y: el.y + 10 } : { x: w * 0.5, y: h * 0.88 };
  }
  if (typeof target === 'object') {
    return { x: target.x, y: target.y };
  }
  if (typeof target === 'string') {
    const el = getElCenter(`uno-player-pod-${target}`);
    if (el) return el;
  }
  return role === 'from' ? { x: w * 0.5, y: h * 0.16 } : { x: w * 0.5, y: h * 0.45 };
};

const FlyingCardItem: React.FC<{
  flight: CardFlightEvent;
  onFlightComplete: (id: string) => void;
}> = React.memo(({ flight, onFlightComplete }) => {
  const onCompleteRef = useRef(onFlightComplete);
  onCompleteRef.current = onFlightComplete;
  const completedRef = useRef(false);

  const finishOnce = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current(flight.id);
  };

  // Freeze start/show/end coordinates and keyframe objects ONCE per flight.id
  // so 250ms parent countdown re-renders NEVER restart Framer Motion keyframes.
  const animConfig = useMemo(() => {
    const start = resolveEndpoint(flight.from, 'from');
    const end = resolveEndpoint(flight.to, 'to');
    const w = typeof window !== 'undefined' ? window.innerWidth : 400;
    const h = typeof window !== 'undefined' ? window.innerHeight : 700;
    const showX = w * 0.5;
    const showY = h * 0.42;

    if (flight.showcaseFirst && flight.card && !flight.isFaceDown) {
      const duration = flight.duration || 1.45;
      return {
        isShowcase: true,
        duration,
        initial: {
          x: start.x - 38,
          y: start.y - 55,
          scale: 0.72,
          rotate: -12,
          opacity: 0.95,
        },
        animate: {
          x: [start.x - 38, showX - 38, showX - 38, end.x - 38],
          y: [start.y - 55, showY - 55, showY - 55, end.y - 55],
          scale: [0.72, 1.42, 1.42, 0.92],
          rotate: [-12, 0, 0, 4],
          opacity: [0.95, 1, 1, 0.85],
        },
        transition: {
          duration,
          times: [0, 0.25, 0.7, 1],
          ease: 'easeInOut' as const,
        },
      };
    }

    const duration = flight.duration || 0.75;
    return {
      isShowcase: false,
      duration,
      initial: {
        x: start.x - 38,
        y: start.y - 55,
        scale: 0.75,
        rotate: -12,
        opacity: 0.92,
      },
      animate: {
        x: end.x - 38,
        y: end.y - 55,
        scale: 0.95,
        rotate: 0,
        opacity: 0.95,
      },
      transition: {
        duration,
        ease: [0.25, 0.8, 0.25, 1] as const,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  // Safety cleanup timer guarantees flight runs at most once
  useEffect(() => {
    const timer = setTimeout(finishOnce, (animConfig.duration + 0.15) * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  return (
    <motion.div
      initial={animConfig.initial}
      animate={animConfig.animate}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={animConfig.transition}
      onAnimationComplete={finishOnce}
      className={
        animConfig.isShowcase
          ? 'absolute left-0 top-0 flex flex-col items-center gap-1.5 drop-shadow-[0_16px_32px_rgba(0,0,0,0.75)]'
          : 'absolute left-0 top-0 shadow-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]'
      }
      style={{ perspective: 1000 }}
    >
      {flight.card && !flight.isFaceDown ? (
        <UnoCard card={flight.card} size="sm" />
      ) : (
        <UnoCard faceDown size="sm" />
      )}
      {animConfig.isShowcase && flight.actorName && (
        <span className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-white/20 text-[10px] font-black text-white shadow-md whitespace-nowrap">
          {flight.actorName}
        </span>
      )}
    </motion.div>
  );
});
FlyingCardItem.displayName = 'FlyingCardItem';

export const UnoAnimationLayer: React.FC<UnoAnimationLayerProps> = ({
  flights,
  onFlightComplete,
  comboBanner,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 1. Flying Cards */}
      <AnimatePresence>
        {flights.map((flight) => (
          <FlyingCardItem
            key={flight.id}
            flight={flight}
            onFlightComplete={onFlightComplete}
          />
        ))}
      </AnimatePresence>

      {/* 2. Combo Card Super Banner (Combo Strike / Chain Effect) */}
      <AnimatePresence>
        {comboBanner && (
          <motion.div
            key={comboBanner.id}
            initial={{ scale: 0.2, opacity: 0, y: 40 }}
            animate={{
              scale: [0.2, 1.18, 1],
              opacity: 1,
              y: 0,
            }}
            exit={{ scale: 0.7, opacity: 0, y: -40 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 24,
            }}
            className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          >
            {/* Background radiant aura */}
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute -inset-16 rounded-full opacity-60 blur-2xl"
              style={{
                background: `radial-gradient(circle, ${comboBanner.colorHex} 0%, transparent 70%)`,
              }}
            />

            {/* Glowing pill badge */}
            <div
              className="relative px-5 py-2.5 sm:px-8 sm:py-3.5 rounded-2xl sm:rounded-3xl border-2 md:backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(12,18,32,0.95), rgba(4,8,16,0.92))',
                borderColor: comboBanner.colorHex,
                boxShadow: `0 0 50px ${comboBanner.colorHex}88, inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">⚡</span>
                <span
                  className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(to right, #FFFFFF, ${comboBanner.colorHex}, #FFFFFF)`,
                    filter: `drop-shadow(0 2px 8px ${comboBanner.colorHex})`,
                  }}
                >
                  {comboBanner.title}
                </span>
                <span className="text-2xl animate-bounce">⚡</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-200/90 mt-1 drop-shadow">
                {comboBanner.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
