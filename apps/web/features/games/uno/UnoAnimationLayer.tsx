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
  delay?: number;
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
  isRotated90?: boolean;
}

const getElCenter = (selectorOrId: string, isRotated90: boolean) => {
  const el = document.getElementById(selectorOrId) || document.querySelector(selectorOrId);
  if (el) {
    const rect = el.getBoundingClientRect();
    const sx = rect.left + rect.width / 2;
    const sy = rect.top + rect.height / 2;
    if (isRotated90 && typeof window !== 'undefined') {
      return { x: sy, y: window.innerWidth - sx };
    }
    return { x: sx, y: sy };
  }
  return null;
};

const resolveEndpoint = (
  target: { x: number; y: number } | 'deck' | 'center' | 'hand' | string,
  role: 'from' | 'to',
  isRotated90: boolean
) => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const w = isRotated90 ? window.innerHeight : window.innerWidth;
  const h = isRotated90 ? window.innerWidth : window.innerHeight;

  if (target === 'deck') {
    const el = getElCenter('uno-draw-pile', isRotated90);
    return el || { x: w * 0.42, y: h * 0.45 };
  }
  if (target === 'center') {
    const el = getElCenter('uno-discard-pile', isRotated90);
    return el || { x: w * 0.58, y: h * 0.45 };
  }
  if (target === 'hand') {
    const el = getElCenter('uno-player-hand', isRotated90);
    return el || { x: w * 0.5, y: h * 0.86 };
  }
  if (typeof target === 'object') {
    return { x: target.x, y: target.y };
  }
  if (typeof target === 'string') {
    const el = getElCenter(`uno-player-pod-${target}`, isRotated90);
    if (el) return el;
  }
  return role === 'from' ? { x: w * 0.5, y: h * 0.16 } : { x: w * 0.5, y: h * 0.45 };
};

const FlyingCardItem: React.FC<{
  flight: CardFlightEvent;
  isRotated90: boolean;
  onFlightComplete: (id: string) => void;
}> = React.memo(({ flight, isRotated90, onFlightComplete }) => {
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
    const start = resolveEndpoint(flight.from, 'from', isRotated90);
    const end = resolveEndpoint(flight.to, 'to', isRotated90);

    if (flight.showcaseFirst && flight.card && !flight.isFaceDown) {
      const duration = flight.duration || 1.1;
      // Hover slightly above the open discard pile so the card is clearly shown,
      // then smoothly settle straight down onto the exact open pile position & size.
      const hoverX = end.x;
      const hoverY = end.y - 26;
      return {
        isShowcase: true,
        duration,
        delay: 0,
        initial: {
          x: start.x,
          y: start.y,
          scale: 0.65,
          rotate: -8,
          opacity: 0.9,
        },
        animate: {
          x: [start.x, hoverX, hoverX, end.x],
          y: [start.y, hoverY, hoverY, end.y],
          scale: [0.65, 1.2, 1.2, 1],
          rotate: [-8, 0, 0, 0],
          opacity: [0.9, 1, 1, 1],
        },
        transition: {
          duration,
          times: [0, 0.34, 0.64, 1],
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };
    }

    const duration = flight.duration || 0.75;
    const delay = flight.delay || 0;
    return {
      isShowcase: false,
      duration,
      delay,
      initial: {
        x: start.x,
        y: start.y,
        scale: 0.72,
        rotate: -10,
        opacity: delay > 0 ? 0 : 0.92,
      },
      animate: {
        x: end.x,
        y: end.y,
        scale: 0.92,
        rotate: 0,
        opacity: 0.96,
      },
      transition: {
        duration,
        delay,
        ease: [0.25, 0.8, 0.25, 1] as const,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  // Safety cleanup timer guarantees flight runs at most once
  useEffect(() => {
    const totalMs = (animConfig.duration + (animConfig.delay || 0) + 0.12) * 1000;
    const timer = setTimeout(finishOnce, totalMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  return (
    <motion.div
      initial={animConfig.initial}
      animate={animConfig.animate}
      exit={{ opacity: 0 }}
      transition={animConfig.transition}
      onAnimationComplete={finishOnce}
      className="absolute left-0 top-0 pointer-events-none"
      style={{ perspective: 1000 }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center drop-shadow-[0_14px_28px_rgba(0,0,0,0.65)]">
        {flight.card && !flight.isFaceDown ? (
          <UnoCard card={flight.card} size={animConfig.isShowcase ? 'md' : 'sm'} />
        ) : (
          <UnoCard faceDown size="sm" />
        )}
        {animConfig.isShowcase && flight.actorName && (
          <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-white/20 text-[10px] font-black text-white shadow-md whitespace-nowrap">
            {flight.actorName}
          </span>
        )}
      </div>
    </motion.div>
  );
});
FlyingCardItem.displayName = 'FlyingCardItem';

const ComboBannerItem: React.FC<{ banner: ComboCardBanner }> = React.memo(({ banner }) => {
  // Freeze animation objects per banner.id so 250ms parent timer ticks never replay pop-in
  const bannerAnim = useMemo(() => ({
    initial: { scale: 0.65, opacity: 0, y: -12 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.85, opacity: 0, y: -16 },
    transition: { type: 'spring' as const, stiffness: 380, damping: 24 },
  }), [banner.id]);

  return (
    <motion.div
      initial={bannerAnim.initial}
      animate={bannerAnim.animate}
      exit={bannerAnim.exit}
      transition={bannerAnim.transition}
      className="absolute left-1/2 top-[29%] sm:top-[27%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-50 max-w-[88vw]"
    >
      {/* Subtle radiant aura */}
      <div
        className="hidden md:block absolute -inset-10 rounded-full opacity-45 blur-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${banner.colorHex} 0%, transparent 70%)`,
        }}
      />

      {/* Glowing pill badge */}
      <div
        className="relative px-3.5 py-1.5 sm:px-6 sm:py-2.5 rounded-2xl border-2 md:backdrop-blur-xl shadow-xl flex flex-col items-center text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(12,18,32,0.96), rgba(4,8,16,0.94))',
          borderColor: banner.colorHex,
          boxShadow: `0 0 28px ${banner.colorHex}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm sm:text-xl">⚡</span>
          <span
            className="text-sm sm:text-xl font-black uppercase tracking-wider text-transparent bg-clip-text whitespace-nowrap"
            style={{
              backgroundImage: `linear-gradient(to right, #FFFFFF, ${banner.colorHex}, #FFFFFF)`,
              filter: `drop-shadow(0 2px 6px ${banner.colorHex})`,
            }}
          >
            {banner.title}
          </span>
          <span className="text-sm sm:text-xl">⚡</span>
        </div>
        <p className="text-[10px] sm:text-xs font-bold text-amber-200/95 mt-0.5 drop-shadow leading-tight">
          {banner.subtitle}
        </p>
      </div>
    </motion.div>
  );
});
ComboBannerItem.displayName = 'ComboBannerItem';

export const UnoAnimationLayer: React.FC<UnoAnimationLayerProps> = ({
  flights,
  onFlightComplete,
  comboBanner,
  isRotated90 = false,
}) => {
  return (
    <div
      className={`${
        isRotated90 ? 'absolute inset-0' : 'fixed inset-0'
      } pointer-events-none z-50 overflow-hidden`}
    >
      {/* 1. Flying Cards */}
      <AnimatePresence>
        {flights.map((flight) => (
          <FlyingCardItem
            key={flight.id}
            flight={flight}
            isRotated90={isRotated90}
            onFlightComplete={onFlightComplete}
          />
        ))}
      </AnimatePresence>

      {/* 2. Combo Card Super Banner (Combo Strike / Chain Effect) */}
      <AnimatePresence>
        {comboBanner && (
          <ComboBannerItem key={comboBanner.id} banner={comboBanner} />
        )}
      </AnimatePresence>
    </div>
  );
};
