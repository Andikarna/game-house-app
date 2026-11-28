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

            // Helper to get element center
            const getElCenter = (selectorOrId: string) => {
              const el = document.getElementById(selectorOrId) || document.querySelector(selectorOrId);
              if (el) {
                const rect = el.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
              }
              return null;
            };

            // Start coords
            if (flight.from === 'deck') {
              const el = getElCenter('uno-draw-pile');
              startX = el ? el.x : w * 0.44;
              startY = el ? el.y - 10 : h * 0.45;
            } else if (flight.from === 'center') {
              const el = getElCenter('uno-discard-pile');
              startX = el ? el.x : w * 0.54;
              startY = el ? el.y - 10 : h * 0.45;
            } else if (flight.from === 'hand') {
              const el = getElCenter('uno-player-hand');
              startX = el ? el.x : w * 0.5;
              startY = el ? el.y + 10 : h * 0.88;
            } else if (typeof flight.from === 'object') {
              startX = flight.from.x;
              startY = flight.from.y;
            } else if (typeof flight.from === 'string') {
              // Try finding specific player pod DOM element (e.g. uno-player-pod-xxx)
              const elCenter = getElCenter(`uno-player-pod-${flight.from}`);
              if (elCenter) {
                startX = elCenter.x;
                startY = elCenter.y;
              } else {
                startX = w * 0.5;
                startY = h * 0.16;
              }
            } else {
              startX = w * 0.5;
              startY = h * 0.16;
            }

            // End coords
            if (flight.to === 'hand') {
              const el = getElCenter('uno-player-hand');
              endX = el ? el.x : w * 0.5;
              endY = el ? el.y + 10 : h * 0.88;
            } else if (flight.to === 'center') {
              const el = getElCenter('uno-discard-pile');
              endX = el ? el.x : w * 0.54;
              endY = el ? el.y - 10 : h * 0.45;
            } else if (typeof flight.to === 'object') {
              endX = flight.to.x;
              endY = flight.to.y;
            } else if (typeof flight.to === 'string') {
              const elCenter = getElCenter(`uno-player-pod-${flight.to}`);
              if (elCenter) {
                endX = elCenter.x;
                endY = elCenter.y;
              } else {
                endX = w * 0.5;
                endY = h * 0.16;
              }
            } else {
              endX = w * 0.5;
              endY = h * 0.16;
            }
          }

          const showX = typeof window !== 'undefined' ? window.innerWidth * 0.5 : endX;
          const showY = typeof window !== 'undefined' ? window.innerHeight * 0.42 : endY;

          if (flight.showcaseFirst && flight.card && !flight.isFaceDown) {
            return (
              <motion.div
                key={flight.id}
                initial={{
                  x: startX - 38,
                  y: startY - 55,
                  scale: 0.72,
                  rotate: -12,
                  opacity: 0.9,
                }}
                animate={{
                  x: [startX - 38, showX - 38, showX - 38, endX - 38],
                  y: [startY - 55, showY - 55, showY - 55, endY - 55],
                  scale: [0.72, 1.42, 1.42, 0.92],
                  rotate: [-12, 0, 0, 4],
                  opacity: [0.95, 1, 1, 0.85],
                }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{
                  duration: flight.duration || 1.15,
                  times: [0, 0.28, 0.68, 1],
                  ease: 'easeInOut',
                }}
                onAnimationComplete={() => onFlightComplete(flight.id)}
                className="absolute left-0 top-0 flex flex-col items-center gap-1.5 drop-shadow-[0_16px_32px_rgba(0,0,0,0.75)]"
                style={{ perspective: 1000 }}
              >
                <UnoCard card={flight.card} size="sm" />
                {flight.actorName && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-white/20 text-[10px] font-black text-white shadow-md whitespace-nowrap">
                    {flight.actorName}
                  </span>
                )}
              </motion.div>
            );
          }

          return (
            <motion.div
              key={flight.id}
              initial={{
                x: startX - 38,
                y: startY - 55,
                scale: 0.75,
                rotate: -12,
                opacity: 0.9,
              }}
              animate={{
                x: endX - 38,
                y: endY - 55,
                scale: [0.75, 1.08, 0.95],
                rotate: [-12, 8, 0],
                opacity: [0.9, 1, 0.85],
              }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{
                duration: flight.duration || 0.68,
                ease: [0.25, 0.8, 0.25, 1],
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
