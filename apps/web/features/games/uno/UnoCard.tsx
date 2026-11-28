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
  xs: { w: 'w-9', h: 'h-13', corner: 'text-[9px]', center: 'text-sm', oval: 'inset-1', border: 'p-[2px]' },
  sm: { w: 'w-14', h: 'h-20', corner: 'text-[11px]', center: 'text-xl', oval: 'inset-1.5', border: 'p-[3px]' },
  md: { w: 'w-20 sm:w-24', h: 'h-28 sm:h-34', corner: 'text-xs sm:text-sm', center: 'text-3xl sm:text-4xl', oval: 'inset-2', border: 'p-1' },
  lg: { w: 'w-24 sm:w-28', h: 'h-36 sm:h-40', corner: 'text-sm sm:text-base', center: 'text-4xl sm:text-5xl', oval: 'inset-2.5', border: 'p-1.5' },
};

const COLOR_STYLES: Record<UnoColor | 'wild', {
  bg: string;
  inner: string;
  glow: string;
  text: string;
  ring: string;
}> = {
  red: {
    bg: 'from-rose-500 via-red-600 to-red-800',
    inner: 'bg-red-700/60',
    glow: 'shadow-[0_10px_28px_-4px_rgba(239,68,68,0.65)]',
    text: 'text-red-500',
    ring: 'ring-rose-300/90',
  },
  blue: {
    bg: 'from-sky-400 via-blue-600 to-indigo-800',
    inner: 'bg-blue-700/60',
    glow: 'shadow-[0_10px_28px_-4px_rgba(59,130,246,0.65)]',
    text: 'text-blue-500',
    ring: 'ring-sky-300/90',
  },
  green: {
    bg: 'from-emerald-400 via-green-600 to-emerald-800',
    inner: 'bg-emerald-700/60',
    glow: 'shadow-[0_10px_28px_-4px_rgba(16,185,129,0.65)]',
    text: 'text-emerald-500',
    ring: 'ring-emerald-300/90',
  },
  yellow: {
    bg: 'from-amber-300 via-yellow-500 to-amber-700',
    inner: 'bg-amber-600/55',
    glow: 'shadow-[0_10px_28px_-4px_rgba(245,158,11,0.65)]',
    text: 'text-amber-500',
    ring: 'ring-amber-200/95',
  },
  wild: {
    bg: 'from-fuchsia-600 via-indigo-900 to-cyan-600',
    inner: 'bg-slate-950/75',
    glow: 'shadow-[0_10px_32px_-4px_rgba(168,85,247,0.75)]',
    text: 'text-white',
    ring: 'ring-fuchsia-300/90',
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
      <svg viewBox="0 0 24 24" className={`${iconCls} drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]`} fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2.8" />
        <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (value === 'reverse') {
    return (
      <svg viewBox="0 0 24 24" className={`${iconCls} drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]`} fill="none">
        <path
          d="M7 7h10l-2.5-2.5M17 7l-2.5 2.5M17 17H7l2.5 2.5M7 17l2.5-2.5"
          stroke="white"
          strokeWidth="2.5"
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
      <div className={`${iconCls} rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border-2 border-white shadow-lg rotate-12`}>
        <div className="bg-red-500" />
        <div className="bg-blue-500" />
        <div className="bg-amber-400" />
        <div className="bg-emerald-500" />
      </div>
    );
  }

  if (value === 'wild_draw4') {
    return (
      <div className="relative flex items-center justify-center">
        <div className="grid grid-cols-2 gap-0.5 rotate-6">
          <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-[2px] bg-red-500 border border-white shadow" />
          <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-[2px] bg-blue-500 border border-white shadow -mt-1" />
          <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-[2px] bg-amber-400 border border-white shadow" />
          <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-[2px] bg-emerald-500 border border-white shadow -mt-1" />
        </div>
      </div>
    );
  }

  return (
    <span className="font-black text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.6)] leading-none tracking-tight select-none">
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

  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        style={style}
        className={`${s.w} ${s.h} ${s.border} rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-200 via-white to-slate-300 shadow-xl select-none relative overflow-hidden ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="w-full h-full rounded-[10px] sm:rounded-[13px] bg-gradient-to-br from-slate-900 via-[#14142B] to-slate-950 relative flex items-center justify-center overflow-hidden border border-slate-700/80">
          {/* Diagonal crimson/gold foil sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/20 via-transparent to-amber-400/20 pointer-events-none" />
          <div className="w-[78%] h-[58%] rounded-full border-2 border-rose-500/80 bg-gradient-to-br from-rose-600 via-red-600 to-orange-500 -rotate-12 flex items-center justify-center shadow-[0_0_16px_rgba(244,63,94,0.5)]">
            <span className="font-black italic tracking-tighter text-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-[10px] sm:text-sm">
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
      whileHover={playable ? { y: -14, scale: 1.07, zIndex: 40 } : onClick ? { y: -4 } : undefined}
      whileTap={playable || onClick ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      className={`${s.w} ${s.h} ${s.border} rounded-xl sm:rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-200 select-none relative overflow-hidden transition-shadow duration-200 ${
        playable
          ? `cursor-pointer ring-2 ${theme.ring} ${theme.glow}`
          : onClick
          ? 'cursor-pointer shadow-xl'
          : 'shadow-xl'
      } ${selected ? 'ring-4 ring-amber-300 -translate-y-4' : ''} ${
        dimmed ? 'opacity-55 saturate-75 brightness-90' : 'opacity-100'
      } ${className}`}
    >
      {/* Inner Colored Card Body */}
      <div
        className={`w-full h-full rounded-[10px] sm:rounded-[13px] bg-gradient-to-br ${theme.bg} ${
          isSpecial ? 'uno-holo-card' : ''
        } relative overflow-hidden flex items-center justify-center`}
      >
        {/* Top glossy specular reflection */}
        <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/25 blur-md pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/20 pointer-events-none" />

        {/* Subtle Wild Foil Shimmer */}
        {card.color === 'wild' && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.45),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(6,182,212,0.45),transparent_55%)] pointer-events-none" />
        )}

        {/* Top-left corner index */}
        <span
          className={`absolute top-1 left-1.5 font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] leading-none ${s.corner}`}
        >
          {corner}
        </span>

        {/* Tilted White-rimmed Inner Oval */}
        <div
          className={`w-[78%] h-[68%] rounded-[48%] border-2 border-white/85 ${theme.inner} -rotate-12 flex items-center justify-center shadow-inner backdrop-blur-[1px]`}
        >
          <div className={`rotate-12 ${s.center} flex items-center justify-center`}>
            <CenterGlyph value={card.value} size={size} />
          </div>
        </div>

        {/* Bottom-right corner index */}
        <span
          className={`absolute bottom-1 right-1.5 font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] leading-none rotate-180 ${s.corner}`}
        >
          {corner}
        </span>

        {/* Playable shimmer corner dot */}
        {playable && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] animate-ping" />
        )}
      </div>
    </motion.div>
  );
};
