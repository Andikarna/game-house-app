'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, X, MessageSquare, Sparkles } from 'lucide-react';
import { EMOTE_LIST, EMOTE_CATEGORIES, EmoteCategory, EmoteId } from '@gamehouse/shared';
import { useEmoteStore } from '../../stores/useEmoteStore';
import { useGameStore } from '../../stores/useGameStore';

interface EmotePickerProps {
  className?: string;
  buttonPosition?: 'bottom-left' | 'bottom-right' | 'top-right' | 'inline';
}

export const EmotePicker: React.FC<EmotePickerProps> = ({ 
  className = '',
  buttonPosition = 'bottom-right'
}) => {
  const { isPickerOpen, setPickerOpen, cooldownUntil, startCooldown } = useEmoteStore();
  const { socket, room } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<EmoteCategory>('all');
  const [cooldownPercent, setCooldownPercent] = useState(0);

  // Keyboard shortcut: Press 'T' to toggle emote picker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setPickerOpen(!isPickerOpen);
      } else if (e.key === 'Escape' && isPickerOpen) {
        setPickerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickerOpen, setPickerOpen]);

  // Cooldown countdown loop
  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownPercent(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownPercent(0);
        clearInterval(interval);
      } else {
        setCooldownPercent(Math.min(100, Math.round((remaining / 1200) * 100)));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const handleSendEmote = (emoteId: EmoteId) => {
    if (Date.now() < cooldownUntil) return;
    if (!socket || !room) return;

    socket.emit('game:emote', { emoteId });
    startCooldown(1200);
    setPickerOpen(false);
  };

  const filteredEmotes = selectedCategory === 'all'
    ? EMOTE_LIST
    : EMOTE_LIST.filter(e => e.category === selectedCategory);

  const isCoolingDown = cooldownUntil > Date.now();

  const buttonPositionClasses = {
    'bottom-right': 'fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40',
    'bottom-left': 'fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-40',
    'top-right': 'fixed top-20 right-4 sm:right-6 z-40',
    'inline': 'relative z-10'
  }[buttonPosition];

  return (
    <>
      {/* Trigger Floating Emote Button */}
      <div className={`${buttonPositionClasses} ${className}`}>
        <button
          type="button"
          onClick={() => setPickerOpen(!isPickerOpen)}
          disabled={isCoolingDown}
          title="Kirim Emot (Tekan 'T')"
          className={`relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-2xl backdrop-blur-md border transition-all duration-200 select-none cursor-pointer active:scale-90 ${
            isPickerOpen
              ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105 shadow-amber-500/40 ring-4 ring-amber-400/30'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-amber-400/80 text-amber-400 shadow-xl'
          } ${isCoolingDown ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isPickerOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <>
              <Smile className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] group-hover:scale-110 transition-transform" />
              {/* Hotkey Badge */}
              <span className="hidden sm:inline-block absolute -bottom-1 -right-1 bg-slate-950/90 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-700 shadow">
                T
              </span>
            </>
          )}

          {/* Cooldown Circular Mask Overlay */}
          {isCoolingDown && (
            <div 
              className="absolute inset-0 rounded-2xl bg-slate-950/70 backdrop-blur-xs flex items-center justify-center"
            >
              <div 
                className="w-full h-full rounded-2xl bg-amber-500/20"
                style={{ 
                  clipPath: `inset(${100 - cooldownPercent}% 0 0 0)` 
                }} 
              />
            </div>
          )}
        </button>
      </div>

      {/* Emote Drawer / Modal */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickerOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm pointer-events-auto"
            />

            {/* Picker Container */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col gap-3.5 max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Smile className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                      Emot Karakter & Taktik
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Kirim stiker ke semua lawan di arena
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {EMOTE_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50'
                      }`}
                    >
                      <span>{cat.badge}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 24-Emote Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5 overflow-y-auto max-h-[50vh] p-1">
                {filteredEmotes.map((emote) => (
                  <button
                    key={emote.id}
                    type="button"
                    onClick={() => handleSendEmote(emote.id)}
                    title={`${emote.label} - ${emote.description}`}
                    className="group relative flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-elevated/70 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/80 hover:scale-108 transition-all duration-200 cursor-pointer shadow-md hover:shadow-amber-500/20"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                      <img
                        src={emote.image}
                        alt={emote.label}
                        className="w-full h-full object-contain filter drop-shadow transition-transform duration-200 group-hover:scale-115 group-active:scale-90"
                        loading="lazy"
                      />
                    </div>
                    <span className="mt-1 text-[10px] font-black text-slate-200 group-hover:text-amber-300 truncate w-full text-center">
                      {emote.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Footer Tip */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Tip: Tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]">T</kbd> untuk buka cepat</span>
                <span className="text-amber-400 font-bold">24 Emot</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
