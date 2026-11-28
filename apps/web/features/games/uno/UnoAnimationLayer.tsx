'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard } from './UnoCard';
import { UnoCard as UnoCardType, UnoColor } from '@gamehouse/shared';

export interface CardFlightEvent {
  id: string;
  card?: UnoCardType;
  from: { x: number; y: number } | 'deck' | 'center' | string; // player id or special keyword
  to: { x: number; y: number } | 'hand' | 'center' | string;
  duration?: number;
  isFaceDown?: boolean;
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

export const UnoAnimationLayer: React.FC<UnoAnimationLayerProps> = ({
  flights,
  onFlightComplete,
  comboBanner,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 1. Flying Cards */}
      <AnimatePresence>
        {flights.map((flight) => {
          // Calculate start & end coordinates in viewport percentages or pixels
          // Deck default: center screen around x: 44%, y: 46%
          // Center discard pile: x: 54%, y: 46%
          // Hand: bottom center x: 50%, y: 88%
          let startX = 0;
          let startY = 0;
          let endX = 0;
          let endY = 0;

          if (typeof window !== 'undefined') {
            const w = window.innerWidth;
            const h = window.innerHeight;

            // Start coords
            if (flight.from === 'deck') {
              startX = w * 0.45;
              startY = h * 0.44;
            } else if (flight.from === 'center') {
              startX = w * 0.54;
              startY = h * 0.44;
            } else if (typeof flight.from === 'object') {
              startX = flight.from.x;
              startY = flight.from.y;
            } else {
              // From opponent (top area)
              startX = w * 0.5;
              startY = h * 0.12;
            }

            // End coords
            if (flight.to === 'hand') {
              startX = startX || w * 0.45;
              endX = w * 0.5;
              endY = h * 0.88;
            } else if (flight.to === 'center') {
              endX = w * 0.54;
              endY = h * 0.44;
            } else if (typeof flight.to === 'object') {
              endX = flight.to.x;
              endY = flight.to.y;
            } else {
              // To opponent (top area)
              endX = w * 0.5;
              endY = h * 0.12;
            }
          }

          return (
            <motion.div
              key={flight.id}
              initial={{
                x: startX - 38,
                y: startY - 55,
                scale: 0.7,
                rotate: -15,
                opacity: 0.9,
              }}
              animate={{
                x: endX - 38,
                y: endY - 55,
                scale: [0.7, 1.15, 0.95],
                rotate: [ -15, 12, 0],
                opacity: [0.9, 1, 0.8],
              }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                duration: flight.duration || 0.48,
                ease: [0.22, 1, 0.36, 1], // snappy cubic-bezier
              }}
              onAnimationComplete={() => onFlightComplete(flight.id)}
              className="absolute left-0 top-0 shadow-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
              style={{
                perspective: 1000,
              }}
            >
              {flight.card && !flight.isFaceDown ? (
                <UnoCard card={flight.card} size="sm" />
              ) : (
                <UnoCard faceDown size="sm" />
              )}
            </motion.div>
          );
        })}
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
              className="relative px-8 py-3.5 rounded-3xl border-2 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center"
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
