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
      className={`pointer-events-none fixed inset-0 z-30 overflow-hidden flex flex-col justify-end p-4 sm:p-6 pb-24 sm:pb-28 ${className}`}
    >
      <div className="flex flex-col items-start gap-3 max-w-sm">
        <AnimatePresence>
          {activeEmotes.map((item, idx) => {
            const emoteMeta = EMOTE_LIST.find(e => e.id === item.emoteId) || EMOTE_LIST[0];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -30, scale: 0.6, rotate: -8 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1, 
                  rotate: 0,
                  transition: { type: 'spring', damping: 14, stiffness: 260 } 
                }}
                exit={{ 
                  opacity: 0, 
                  y: -40, 
                  scale: 0.8,
                  transition: { duration: 0.4, ease: 'easeIn' } 
                }}
                className="flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto"
                style={{
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)'
                }}
              >
                {/* Sender Avatar */}
                <ClimberAvatarIcon avatar={item.avatar} size={36} />

                {/* Nickname & Label */}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[11px] font-black text-slate-200 truncate max-w-[110px]">
                    {item.nickname}
                  </span>
                  <span className="text-[12px] font-extrabold text-amber-400 leading-tight">
                    {emoteMeta.label}
                  </span>
                </div>

                {/* Big Animated Emote Sticker */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.25, 1],
                    rotate: [0, -6, 6, 0]
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: 1,
                    repeatType: 'reverse'
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 drop-shadow-lg"
                >
                  <img
                    src={emoteMeta.image}
                    alt={emoteMeta.label}
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
