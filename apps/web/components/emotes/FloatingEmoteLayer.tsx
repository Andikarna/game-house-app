'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmoteStore } from '../../stores/useEmoteStore';
import { EMOTE_LIST, EmoteId } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../ui/AvatarSelector';

export const FloatingEmoteLayer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { activeEmotes } = useEmoteStore();

  return (
    <div 
      className={`pointer-events-none fixed bottom-14 left-2.5 sm:bottom-16 sm:left-5 z-30 overflow-hidden flex flex-col items-start gap-1.5 max-w-[220px] sm:max-w-xs ${className}`}
    >
      <AnimatePresence>
        {activeEmotes.map((item) => {
          const emoteMeta = EMOTE_LIST.find(e => e.id === item.emoteId) || EMOTE_LIST[0];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, scale: 0.7 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1, 
                transition: { type: 'spring', damping: 16, stiffness: 280 } 
              }}
              exit={{ 
                opacity: 0, 
                y: -20, 
                scale: 0.85,
                transition: { duration: 0.25, ease: 'easeIn' } 
              }}
              className="flex items-center gap-2 bg-slate-900/95 md:backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-none"
            >
              {/* Sender Avatar */}
              <ClimberAvatarIcon avatar={item.avatar} size={24} />

              {/* Nickname & Label */}
              <div className="flex flex-col min-w-0 pr-0.5">
                <span className="text-[10px] font-black text-slate-200 truncate max-w-[85px]">
                  {item.nickname}
                </span>
                <span className="text-[11px] font-extrabold text-amber-400 leading-tight truncate max-w-[95px]">
                  {emoteMeta.label}
                </span>
              </div>

              {/* Compact Emote Sticker */}
              <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0">
                <img
                  src={emoteMeta.image}
                  alt={emoteMeta.label}
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
