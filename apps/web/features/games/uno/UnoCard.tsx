'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UnoCard as UnoCardType, UnoColor } from '@gamehouse/shared';

interface UnoCardProps {
  card?: UnoCardType;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  isWildActiveColor?: UnoColor;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  xs: { w: 'w-9', h: 'h-13', corner: 'text-[9px]', center: 'text-sm', border: 'p-[2.5px]' },
  sm: { w: 'w-14', h: 'h-20', corner: 'text-[11px]', center: 'text-xl', border: 'p-[3px]' },
  md: { w: 'w-[76px] sm:w-[92px]', h: 'h-[110px] sm:h-[134px]', corner: 'text-xs sm:text-sm', center: 'text-3xl sm:text-4xl', border: 'p-[4px] sm:p-[5px]' },
  lg: { w: 'w-24 sm:w-28', h: 'h-36 sm:h-40', corner: 'text-sm sm:text-base', center: 'text-4xl sm:text-5xl', border: 'p-[5px]' },
};

const COLOR_STYLES: Record<UnoColor | 'wild', {
  bg: string;
  ovalFill: string;
  glow: string;
  ring: string;
}> = {
  red: {
    bg: 'from-[#EF233C] via-[#D90429] to-[#9B061E]',
    ovalFill: 'bg-[#C80B24]/70',
    glow: 'shadow-[0_10px_28px_-4px_rgba(239,35,60,0.7)]',
    ring: 'ring-rose-300',
  },
  blue: {
    bg: 'from-[#2589FF] via-[#0B5ED7] to-[#083B8C]',
    ovalFill: 'bg-[#094DB5]/70',
    glow: 'shadow-[0_10px_28px_-4px_rgba(37,137,255,0.75)]',
    ring: 'ring-sky-300',
  },
  green: {
    bg: 'from-[#22C55E] via-[#15803D] to-[#0D5929]',
    ovalFill: 'bg-[#126E34]/70',
    glow: 'shadow-[0_10px_28px_-4px_rgba(34,197,94,0.7)]',
    ring: 'ring-emerald-300',
  },
  yellow: {
    bg: 'from-[#FACC15] via-[#EAB308] to-[#CA8A04]',
    ovalFill: 'bg-[#D99B06]/65',
    glow: 'shadow-[0_10px_28px_-4px_rgba(250,204,21,0.7)]',
    ring: 'ring-amber-200',
  },
  wild: {
    bg: 'from-[#1E1B2E] via-[#0F1020] to-[#090913]',
    ovalFill: 'bg-slate-950/90',
    glow: 'shadow-[0_10px_32px_-4px_rgba(168,85,247,0.75)]',
    ring: 'ring-fuchsia-300',
  },
};

function getCornerLabel(value: UnoCardType['value']): string {
  if (value === 'skip') return '⊘';
  if (value === 'reverse') return '⇄';
  if (value === 'draw2') return '+2';
  if (value === 'wild') return 'W';
  if (value === 'wild_draw4') return '+4';
  return value;
}

const CenterGlyph: React.FC<{ value: UnoCardType['value']; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({
  value,
  size,
}) => {
  const iconCls =
    size === 'xs'
      ? 'w-4 h-4'
      : size === 'sm'
      ? 'w-6 h-6'
      : size === 'md'
      ? 'w-9 h-9 sm:w-11 sm:h-11'
      : 'w-11 h-11 sm:w-12 sm:h-12';

  if (value === 'skip') {
    return (
      <svg viewBox="0 0 24 24" className={`${iconCls} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="3" />
        <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (value === 'reverse') {
    return (
      <svg viewBox="0 0 24 24" className={`${iconCls} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} fill="none">
        <path
          d="M7 7h10l-2.5-2.5M17 7l-2.5 2.5M17 17H7l2.5 2.5M7 17l2.5-2.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value === 'draw2') {
    return (
      <div className="relative flex items-center justify-center">
        <div className="w-4 h-6 sm:w-5 sm:h-7 rounded-[4px] bg-white/95 border border-slate-900/30 shadow-md -rotate-12 -translate-x-1.5" />
        <div className="w-4 h-6 sm:w-5 sm:h-7 rounded-[4px] bg-white border border-slate-900/30 shadow-lg rotate-12 translate-x-1.5 translate-y-1 flex items-center justify-center">
          <span className="text-[9px] sm:text-[11px] font-black text-slate-900">+2</span>
        </div>
      </div>
    );
  }

  if (value === 'wild') {
    return (
      <div className={`${iconCls} rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border-[2.5px] border-white shadow-lg rotate-12`}>
        <div className="bg-[#EF233C]" />
        <div className="bg-[#2589FF]" />
        <div className="bg-[#FACC15]" />
        <div className="bg-[#22C55E]" />
      </div>
    );
  }

  if (value === 'wild_draw4') {
    return (
      <div className="relative flex items-center justify-center">
        <div className="grid grid-cols-2 gap-0.5 rotate-6">
          <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[2px] bg-[#EF233C] border border-white shadow" />
          <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[2px] bg-[#2589FF] border border-white shadow -mt-1" />
          <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[2px] bg-[#FACC15] border border-white shadow" />
          <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[2px] bg-[#22C55E] border border-white shadow -mt-1" />
        </div>
      </div>
    );
  }

  return (
    <span className="font-black text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.65)] leading-none tracking-tight select-none">
      {value}
    </span>
  );
};

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  faceDown = false,
  size = 'md',
  playable = false,
  dimmed = false,
  selected = false,
  isWildActiveColor,
  onClick,
  className = '',
  style,
}) => {
  const s = SIZE_MAP[size];

  // Classic Original UNO Back: Obsidian Black card with White Rim + Red Tilted Oval + Golden UNO
  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        style={style}
        className={`${s.w} ${s.h} ${s.border} rounded-xl sm:rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.65)] select-none relative overflow-hidden ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="w-full h-full rounded-[9px] sm:rounded-[12px] bg-gradient-to-br from-[#1B1D29] via-[#0B0D14] to-[#05060A] relative flex items-center justify-center overflow-hidden border border-black/40">
          <div className="w-[82%] h-[62%] rounded-[48%] bg-gradient-to-br from-[#EF233C] via-[#D90429] to-[#9B061E] -rotate-12 flex items-center justify-center shadow-[0_0_18px_rgba(239,35,60,0.6)] border-2 border-white/20">
            <span className="font-black italic tracking-tighter text-[#FACC15] drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] text-xs sm:text-base">
              UNO
            </span>
          </div>
        </div>
      </div>
    );
  }

  const effectiveStyleKey =
    card.color === 'wild' && isWildActiveColor ? isWildActiveColor : card.color;
  const theme = COLOR_STYLES[effectiveStyleKey] || COLOR_STYLES.wild;
  const corner = getCornerLabel(card.value);
  const isSpecial =
    card.color === 'wild' ||
    card.value === 'draw2' ||
    card.value === 'skip' ||
    card.value === 'reverse';

  return (
    <motion.div
      onClick={onClick}
      style={style}
      whileHover={playable ? { y: -16, scale: 1.08, zIndex: 40 } : onClick ? { y: -4 } : undefined}
      whileTap={playable || onClick ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`${s.w} ${s.h} ${s.border} rounded-xl sm:rounded-2xl bg-white select-none relative overflow-hidden transition-shadow duration-200 ${
        playable
          ? `cursor-pointer ring-2 ring-white ${theme.glow}`
          : onClick
          ? 'cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.55)]'
          : 'shadow-[0_8px_20px_rgba(0,0,0,0.55)]'
      } ${selected ? 'ring-4 ring-amber-300 -translate-y-4' : ''} ${
        dimmed ? 'opacity-55 brightness-75 saturate-75' : 'opacity-100'
      } ${className}`}
    >
      {/* Inner Colored Card Body */}
      <div
        className={`w-full h-full rounded-[9px] sm:rounded-[12px] bg-gradient-to-br ${theme.bg} ${
          isSpecial ? 'uno-holo-card' : ''
        } relative overflow-hidden flex items-center justify-center`}
      >
        {/* Subtle Glossy Specular Highlight */}
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/20 blur-md pointer-events-none" />

        {/* Wild 4-color inner glow */}
        {card.color === 'wild' && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(239,35,60,0.45),transparent_50%),radial-gradient(circle_at_75%_25%,rgba(37,137,255,0.45),transparent_50%),radial-gradient(circle_at_25%_75%,rgba(250,204,21,0.45),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(34,197,94,0.45),transparent_50%)] pointer-events-none" />
        )}

        {/* Top-left corner index */}
        <span
          className={`absolute top-1 left-1.5 font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] leading-none ${s.corner}`}
        >
          {corner}
        </span>

        {/* Iconic Original UNO Tilted White-Rimmed Oval */}
        <div
          className={`w-[80%] h-[70%] rounded-[48%] border-[2.5px] sm:border-[3px] border-white ${theme.ovalFill} -rotate-12 flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]`}
        >
          <div className={`rotate-12 ${s.center} flex items-center justify-center`}>
            <CenterGlyph value={card.value} size={size} />
          </div>
        </div>

        {/* Bottom-right corner index */}
        <span
          className={`absolute bottom-1 right-1.5 font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] leading-none rotate-180 ${s.corner}`}
        >
          {corner}
        </span>

        {/* Golden Star Glint on Playable Cards */}
        {playable && (
          <span className="absolute -top-0.5 -right-0.5 text-xs sm:text-sm drop-shadow-[0_0_8px_#FDE047] animate-pulse pointer-events-none">
            ✦
          </span>
        )}
      </div>
    </motion.div>
  );
};
