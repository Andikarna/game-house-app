import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, Sparkles } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface LudoDiceProps {
  value: number | null;
  canRoll: boolean;
  isMyTurn: boolean;
  onRoll: () => void;
  accentColor?: string;
  validMovesLength?: number;
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  canRoll,
  isMyTurn,
  onRoll,
  accentColor = '#6366F1',
  validMovesLength,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!canRoll || !isMyTurn || isAnimating) return;
    setIsAnimating(true);
    soundManager.playDiceRoll(); // Real tactile physical dice rolling SFX

    onRoll();

    setTimeout(() => {
      setIsAnimating(false);
    }, 450);
  };

  // Dot coordinates for dice values 1-6
  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return <div className="w-3.5 h-3.5 rounded-full bg-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />;
      case 2:
        return (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 right-2.5 shadow-inner" />
          </>
        );
      case 3:
        return (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 right-2.5 shadow-inner" />
          </>
        );
      case 4:
        return (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 right-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 right-2.5 shadow-inner" />
          </>
        );
      case 5:
        return (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 right-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 right-2.5 shadow-inner" />
          </>
        );
      case 6:
      default:
        return (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-2.5 right-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-1/2 left-2.5 -translate-y-1/2 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute top-1/2 right-2.5 -translate-y-1/2 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 left-2.5 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-slate-900 absolute bottom-2.5 right-2.5 shadow-inner" />
          </>
        );
    }
  };

  const isClickable = canRoll && isMyTurn && !isAnimating;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <motion.button
        type="button"
        disabled={!isClickable}
        onClick={handleClick}
        animate={
          isAnimating
            ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 0.9, 1.1, 1] }
            : isClickable
            ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.2 } }
            : {}
        }
        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-white to-slate-200 border-2 shadow-2xl transition-all cursor-pointer flex items-center justify-center ${
          isClickable
            ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] active:scale-95'
            : 'border-slate-400 opacity-90 cursor-default'
        }`}
        style={isClickable ? { borderColor: accentColor } : {}}
      >
        {value ? (
          renderDots(value)
        ) : (
          <Dices className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 stroke-[1.8]" />
        )}

        {isClickable && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center animate-ping" />
        )}
      </motion.button>

      {/* Button Action Label */}
      {isClickable ? (
        <button
          type="button"
          onClick={handleClick}
          className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>LEMPAR DADU!</span>
        </button>
      ) : isMyTurn && !canRoll ? (
        validMovesLength === 0 ? (
          <span className="text-[11px] font-bold text-amber-400 animate-pulse">Tidak ada langkah valid, passing giliran...</span>
        ) : (
          <span className="text-[11px] font-bold text-amber-300 animate-bounce">Pilih Bidak Yang Berpendar 👆</span>
        )
      ) : (
        <span className="text-[11px] font-medium text-slate-400">Menunggu giliran...</span>
      )}
    </div>
  );
};
