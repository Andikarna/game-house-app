import React from 'react';
import { motion } from 'framer-motion';
import { 
  LudoGameState, 
  LudoColor, 
  LudoToken 
} from '@gamehouse/shared';
import { Star, Crown, ChevronDown, ChevronLeft, ChevronUp, ChevronRight } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface LudoBoardProps {
  gameState: LudoGameState;
  myPlayerId: string;
  onSelectToken: (tokenIndex: number) => void;
}

// ============================================================================
// 1. BOARD COORDINATES & GEOMETRY (15x15 Standard Ludo Grid)
// Matches user reference:
// - Top-Left: Blue (0..5, 0..5)
// - Top-Right: Green (0..5, 9..14)
// - Bottom-Right: Yellow (9..14, 9..14)
// - Bottom-Left: Red (9..14, 0..5)
// Clockwise Track: Red (0) -> Blue (13) -> Green (26) -> Yellow (39)
// ============================================================================

export const TRACK_COORDS: [number, number][] = [
  // Bottom Arm (going UP col 6):
  [13, 6], // 0: Red Start (Red star)
  [12, 6], // 1
  [11, 6], // 2
  [10, 6], // 3
  [9, 6],  // 4
  // Left Arm (going LEFT row 8):
  [8, 5],  // 5
  [8, 4],  // 6
  [8, 3],  // 7
  [8, 2],  // 8: Safe Star (Gray star)
  [8, 1],  // 9
  [8, 0],  // 10
  // Left Arm Tip:
  [7, 0],  // 11: Entrance arrow (Blue >)
  [6, 0],  // 12
  // Left Arm (going RIGHT row 6):
  [6, 1],  // 13: Blue Start (Blue star)
  [6, 2],  // 14
  [6, 3],  // 15
  [6, 4],  // 16
  [6, 5],  // 17
  // Top Arm (going UP col 6):
  [5, 6],  // 18
  [4, 6],  // 19
  [3, 6],  // 20
  [2, 6],  // 21: Safe Star (Gray star)
  [1, 6],  // 22
  [0, 6],  // 23
  // Top Arm Tip:
  [0, 7],  // 24: Entrance arrow (Green v)
  [0, 8],  // 25
  // Top Arm (going DOWN col 8):
  [1, 8],  // 26: Green Start (Green star)
  [2, 8],  // 27
  [3, 8],  // 28
  [4, 8],  // 29
  [5, 8],  // 30
  // Right Arm (going RIGHT row 6):
  [6, 9],  // 31
  [6, 10], // 32
  [6, 11], // 33
  [6, 12], // 34: Safe Star (Gray star)
  [6, 13], // 35
  [6, 14], // 36
  // Right Arm Tip:
  [7, 14], // 37: Entrance arrow (Yellow <)
  [8, 14], // 38
  // Right Arm (going LEFT row 8):
  [8, 13], // 39: Yellow Start (Yellow star)
  [8, 12], // 40
  [8, 11], // 41
  [8, 10], // 42
  [8, 9],  // 43
  // Bottom Arm (going DOWN col 8):
  [9, 8],  // 44
  [10, 8], // 45
  [11, 8], // 46
  [12, 8], // 47: Safe Star (Gray star)
  [13, 8], // 48
  [14, 8], // 49
  // Bottom Arm Tip:
  [14, 7], // 50: Entrance arrow (Red ^)
  [14, 6], // 51
];

// Home stretch private tiles (steps 52 to 56) + center finish (57)
export const HOME_STRETCHES: Record<LudoColor, [number, number][]> = {
  red: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]
  ],
  blue: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]
  ],
  green: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]
  ],
  yellow: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]
  ],
};

// Base slots coordinates inside the white rounded capsule (2x2 grid per color)
export const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  blue: [
    [1.8, 1.8], [1.8, 3.2], [3.2, 1.8], [3.2, 3.2]
  ],
  green: [
    [1.8, 10.8], [1.8, 12.2], [3.2, 10.8], [3.2, 12.2]
  ],
  yellow: [
    [10.8, 10.8], [10.8, 12.2], [12.2, 10.8], [12.2, 12.2]
  ],
  red: [
    [10.8, 1.8], [10.8, 3.2], [12.2, 1.8], [12.2, 3.2]
  ],
};

// ============================================================================
// 2. ULTRA-HD 3D GLOSSY TOKEN (PAWN) COMPONENT
// Renders vector-sharp 3D shaded teardrop pawns matching the reference image
// ============================================================================

interface HDTokenProps {
  color: LudoColor;
  isValid?: boolean;
  stackCount?: number;
}

const TOKEN_COLOR_CONFIG: Record<LudoColor, {
  headGradStart: string;
  headGradMid: string;
  headGradEnd: string;
  bodyGradStart: string;
  bodyGradMid: string;
  bodyGradEnd: string;
  rimShadow: string;
  glow: string;
  haloRing: string;
}> = {
  blue: {
    headGradStart: '#e0f2fe',
    headGradMid: '#0ea5e9',
    headGradEnd: '#0369a1',
    bodyGradStart: '#38bdf8',
    bodyGradMid: '#0284c7',
    bodyGradEnd: '#0c4a6e',
    rimShadow: '#082f49',
    glow: 'rgba(14, 165, 233, 0.85)',
    haloRing: 'ring-sky-400',
  },
  green: {
    headGradStart: '#dcfce7',
    headGradMid: '#22c55e',
    headGradEnd: '#15803d',
    bodyGradStart: '#4ade80',
    bodyGradMid: '#16a34a',
    bodyGradEnd: '#14532d',
    rimShadow: '#052e16',
    glow: 'rgba(34, 197, 94, 0.85)',
    haloRing: 'ring-emerald-400',
  },
  yellow: {
    headGradStart: '#fef9c3',
    headGradMid: '#facc15',
    headGradEnd: '#ca8a04',
    bodyGradStart: '#fde047',
    bodyGradMid: '#eab308',
    bodyGradEnd: '#854d0e',
    rimShadow: '#713f12',
    glow: 'rgba(234, 179, 8, 0.85)',
    haloRing: 'ring-amber-300',
  },
  red: {
    headGradStart: '#fee2e2',
    headGradMid: '#ef4444',
    headGradEnd: '#b91c1c',
    bodyGradStart: '#f87171',
    bodyGradMid: '#dc2626',
    bodyGradEnd: '#7f1d1d',
    rimShadow: '#450a0a',
    glow: 'rgba(239, 68, 68, 0.85)',
    haloRing: 'ring-rose-400',
  },
};

const HDTokenPawn: React.FC<HDTokenProps> = ({ color, isValid, stackCount }) => {
  const conf = TOKEN_COLOR_CONFIG[color];
  const uniqueId = `pawn_grad_${color}`;

  return (
    <div className="relative w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center select-none">
      <svg
        viewBox="0 0 44 54"
        className={`w-full h-full filter ${
          isValid
            ? 'drop-shadow-[0_0_10px_rgba(250,204,21,1)] scale-110'
            : 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]'
        } transition-transform duration-200`}
      >
        <defs>
          {/* Radial Head Gradient (Glossy sphere highlight) */}
          <radialGradient
            id={`${uniqueId}_head`}
            cx="35%"
            cy="32%"
            r="65%"
            fx="30%"
            fy="25%"
          >
            <stop offset="0%" stopColor={conf.headGradStart} />
            <stop offset="45%" stopColor={conf.headGradMid} />
            <stop offset="100%" stopColor={conf.headGradEnd} />
          </radialGradient>

          {/* Linear Body Gradient (Glossy cone/teardrop bell body) */}
          <linearGradient
            id={`${uniqueId}_body`}
            x1="20%"
            y1="0%"
            x2="80%"
            y2="100%"
          >
            <stop offset="0%" stopColor={conf.bodyGradStart} />
            <stop offset="50%" stopColor={conf.bodyGradMid} />
            <stop offset="100%" stopColor={conf.bodyGradEnd} />
          </linearGradient>

          {/* Rim Shadow Gradient */}
          <linearGradient
            id={`${uniqueId}_rim`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={conf.bodyGradMid} />
            <stop offset="100%" stopColor={conf.rimShadow} />
          </linearGradient>
        </defs>

        {/* 1. Ambient Ground Shadow */}
        <ellipse cx="22" cy="49" rx="15" ry="4.5" fill="rgba(0,0,0,0.4)" />

        {/* 2. Pawn Teardrop Base Body */}
        <path
          d="M 14 26 C 11 33, 7 40, 8 45 C 8.5 48, 35.5 48, 36 45 C 37 40, 33 33, 30 26 Z"
          fill={`url(#${uniqueId}_body)`}
        />

        {/* Bottom Rim Bevel Accent */}
        <ellipse
          cx="22"
          cy="45.5"
          rx="13.5"
          ry="2.5"
          fill={`url(#${uniqueId}_rim)`}
          opacity="0.85"
        />

        {/* 3. Curved Body Specular Highlight Glint */}
        <path
          d="M 13 30 C 11 36, 11 41, 13 44"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.75"
          fill="none"
        />

        {/* Secondary subtle right reflection */}
        <path
          d="M 31 33 C 32 37, 31 41, 30 43"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
          fill="none"
        />

        {/* 4. Collar Neck Ring */}
        <ellipse
          cx="22"
          cy="26"
          rx="7"
          ry="2"
          fill={conf.bodyGradStart}
          stroke={conf.headGradEnd}
          strokeWidth="0.8"
        />

        {/* 5. Head Sphere */}
        <circle
          cx="22"
          cy="15"
          r="9.5"
          fill={`url(#${uniqueId}_head)`}
        />

        {/* Head Primary Specular Highlight */}
        <ellipse
          cx="19"
          cy="12"
          rx="3.5"
          ry="2.2"
          transform="rotate(-25 19 12)"
          fill="white"
          opacity="0.88"
        />

        {/* Head Secondary Ambient Soft Glow */}
        <circle
          cx="24"
          cy="17"
          r="7"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      </svg>

      {/* Stack Count Badge (e.g. x2, x3) */}
      {stackCount && stackCount > 1 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-950/90 text-white font-mono font-black text-[9px] border border-amber-400 shadow-md">
          {stackCount}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 3. MAIN LUDO BOARD COMPONENT
// ============================================================================

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myPlayerId,
  onSelectToken,
}) => {
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const validMoves = gameState.validMoves || [];

  // Group tokens by their board position so we can stack and render cleanly
  const tokensOnBoard: Array<{
    token: LudoToken;
    player: typeof myPlayer;
    row: number;
    col: number;
    isValid: boolean;
  }> = [];

  Object.values(gameState.players).forEach((player) => {
    player.tokens.forEach((token) => {
      let r = 0;
      let c = 0;
      if (token.state === 'base') {
        [r, c] = BASE_SLOTS[player.color][token.id];
      } else if (token.state === 'track') {
        [r, c] = TRACK_COORDS[token.trackPosition];
      } else if (token.state === 'home-stretch' || token.state === 'finished') {
        const stretchIdx = Math.min(5, Math.max(0, token.stepCount - 52));
        [r, c] = HOME_STRETCHES[player.color][stretchIdx];
      }

      const isValid = isMyTurn && player.playerId === myPlayerId && validMoves.includes(token.id);

      tokensOnBoard.push({
        token,
        player,
        row: r,
        col: c,
        isValid,
      });
    });
  });

  const handleTokenClick = (tokenIndex: number) => {
    if (!isMyTurn || !validMoves.includes(tokenIndex)) return;
    soundManager.playTokenMove(); // SFX token hop
    onSelectToken(tokenIndex);
  };

  return (
    <div className="relative w-full max-w-[480px] sm:max-w-[560px] aspect-square bg-[#0c121e] border-[6px] border-slate-700/80 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 sm:p-3 select-none touch-manipulation overflow-hidden">
      {/* 15x15 BOARD GRID CONTAINER */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 rounded-[2rem] overflow-hidden bg-white shadow-2xl border-2 border-slate-400/40">
        
        {/* ================================================================= */}
        {/* 1. TOP-LEFT BASE: BLUE (row 0..5, col 0..5)                       */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-6 bg-[#0070f3] p-2.5 sm:p-3.5 flex items-center justify-center relative rounded-tl-[1.8rem]">
          {/* Inner White Capsule with 4 resting circles */}
          <div className="w-full h-full rounded-[1.6rem] bg-white border border-slate-200/90 p-2.5 grid grid-cols-2 grid-rows-2 gap-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="rounded-full bg-[#f0f9ff] border-2 border-[#bae6fd] flex items-center justify-center shadow-inner"
              />
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. TOP ARM (col 6..8, row 0..5) - GREEN PATH & START               */}
        {/* ================================================================= */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-white border-x border-slate-300">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 3);
            const c = 6 + (idx % 3);

            const isGreenArrow = r === 0 && c === 7;
            const isGreenPath = c === 7 && r >= 1 && r <= 5;
            const isGreenStart = r === 1 && c === 8;
            const isSafeStar = r === 2 && c === 6;

            return (
              <div
                key={idx}
                className={`border border-slate-300 flex items-center justify-center relative ${
                  isGreenStart
                    ? 'bg-[#16a34a]'
                    : isGreenPath
                    ? 'bg-[#16a34a]'
                    : 'bg-white'
                }`}
              >
                {/* Green Directional Arrow */}
                {isGreenArrow && (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#16a34a] stroke-[3.5] animate-bounce" />
                )}

                {/* Green Start Star */}
                {isGreenStart && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white drop-shadow" />
                )}

                {/* Neutral Safe Star */}
                {isSafeStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 fill-slate-400 drop-shadow-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 3. TOP-RIGHT BASE: GREEN (row 0..5, col 9..14)                    */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-6 bg-[#16a34a] p-2.5 sm:p-3.5 flex items-center justify-center relative rounded-tr-[1.8rem]">
          <div className="w-full h-full rounded-[1.6rem] bg-white border border-slate-200/90 p-2.5 grid grid-cols-2 grid-rows-2 gap-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="rounded-full bg-[#f0fdf4] border-2 border-[#bbf7d0] flex items-center justify-center shadow-inner"
              />
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. LEFT ARM (col 0..5, row 6..8) - BLUE PATH & START              */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-white border-y border-slate-300">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 6 + Math.floor(idx / 6);
            const c = idx % 6;

            const isBlueArrow = r === 7 && c === 0;
            const isBluePath = r === 7 && c >= 1 && c <= 5;
            const isBlueStart = r === 6 && c === 1;
            const isSafeStar = r === 8 && c === 2;

            return (
              <div
                key={idx}
                className={`border border-slate-300 flex items-center justify-center relative ${
                  isBlueStart
                    ? 'bg-[#0070f3]'
                    : isBluePath
                    ? 'bg-[#0070f3]'
                    : 'bg-white'
                }`}
              >
                {/* Blue Directional Arrow */}
                {isBlueArrow && (
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#0070f3] stroke-[3.5] animate-pulse" />
                )}

                {/* Blue Start Star */}
                {isBlueStart && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white drop-shadow" />
                )}

                {/* Neutral Safe Star */}
                {isSafeStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 fill-slate-400 drop-shadow-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 5. CENTER 3x3: 4 HOME TRIANGLES & VICTORY CROWN                   */}
        {/* ================================================================= */}
        <div className="col-span-3 row-span-3 relative bg-white border border-slate-400/80 overflow-hidden flex items-center justify-center shadow-inner">
          {/* 4 Diagonal Colored Triangles */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Top: Green Triangle */}
              <polygon points="0,0 100,0 50,50" fill="#16a34a" />
              {/* Right: Yellow Triangle */}
              <polygon points="100,0 100,100 50,50" fill="#f59e0b" />
              {/* Bottom: Red Triangle */}
              <polygon points="100,100 0,100 50,50" fill="#dc2626" />
              {/* Left: Blue Triangle */}
              <polygon points="0,100 0,0 50,50" fill="#0070f3" />
            </svg>
          </div>

          {/* Central 3D Golden Crown / Trophy Badge */}
          <div className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-950/85 backdrop-blur-sm border-2 border-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.85)]">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300 animate-pulse" />
          </div>
        </div>

        {/* ================================================================= */}
        {/* 6. RIGHT ARM (col 9..14, row 6..8) - YELLOW PATH & START          */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-white border-y border-slate-300">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 6 + Math.floor(idx / 6);
            const c = 9 + (idx % 6);

            const isYellowArrow = r === 7 && c === 14;
            const isYellowPath = r === 7 && c >= 9 && c <= 13;
            const isYellowStart = r === 8 && c === 13;
            const isSafeStar = r === 6 && c === 12;

            return (
              <div
                key={idx}
                className={`border border-slate-300 flex items-center justify-center relative ${
                  isYellowStart
                    ? 'bg-[#f59e0b]'
                    : isYellowPath
                    ? 'bg-[#f59e0b]'
                    : 'bg-white'
                }`}
              >
                {/* Yellow Directional Arrow */}
                {isYellowArrow && (
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b] stroke-[3.5] animate-pulse" />
                )}

                {/* Yellow Start Star */}
                {isYellowStart && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white drop-shadow" />
                )}

                {/* Neutral Safe Star */}
                {isSafeStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 fill-slate-400 drop-shadow-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 7. BOTTOM-LEFT BASE: RED (row 9..14, col 0..5)                    */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-6 bg-[#dc2626] p-2.5 sm:p-3.5 flex items-center justify-center relative rounded-bl-[1.8rem]">
          <div className="w-full h-full rounded-[1.6rem] bg-white border border-slate-200/90 p-2.5 grid grid-cols-2 grid-rows-2 gap-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="rounded-full bg-[#fef2f2] border-2 border-[#fecaca] flex items-center justify-center shadow-inner"
              />
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 8. BOTTOM ARM (col 6..8, row 9..14) - RED PATH & START             */}
        {/* ================================================================= */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-white border-x border-slate-300">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 9 + Math.floor(idx / 3);
            const c = 6 + (idx % 3);

            const isRedArrow = r === 14 && c === 7;
            const isRedPath = c === 7 && r >= 9 && r <= 13;
            const isRedStart = r === 13 && c === 6;
            const isSafeStar = r === 11 && c === 8;

            return (
              <div
                key={idx}
                className={`border border-slate-300 flex items-center justify-center relative ${
                  isRedStart
                    ? 'bg-[#dc2626]'
                    : isRedPath
                    ? 'bg-[#dc2626]'
                    : 'bg-white'
                }`}
              >
                {/* Red Directional Arrow */}
                {isRedArrow && (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#dc2626] stroke-[3.5] animate-bounce" />
                )}

                {/* Red Start Star */}
                {isRedStart && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white drop-shadow" />
                )}

                {/* Neutral Safe Star */}
                {isSafeStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 fill-slate-400 drop-shadow-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 9. BOTTOM-RIGHT BASE: YELLOW (row 9..14, col 9..14)               */}
        {/* ================================================================= */}
        <div className="col-span-6 row-span-6 bg-[#f59e0b] p-2.5 sm:p-3.5 flex items-center justify-center relative rounded-br-[1.8rem]">
          <div className="w-full h-full rounded-[1.6rem] bg-white border border-slate-200/90 p-2.5 grid grid-cols-2 grid-rows-2 gap-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="rounded-full bg-[#fefce8] border-2 border-[#fef08a] flex items-center justify-center shadow-inner"
              />
            ))}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 10. ANIMATED 3D GLOSSY TOKENS OVERLAY                               */}
      {/* =================================================================== */}
      <div className="absolute inset-2 sm:inset-3 pointer-events-none">
        {tokensOnBoard.map((item) => {
          const { token, player, row, col, isValid } = item;

          // Compute percent position on the 15x15 board
          // Cell size = 100% / 15 = 6.666%
          const leftPercent = (col + 0.5) * (100 / 15);
          const topPercent = (row + 0.5) * (100 / 15);

          return (
            <motion.div
              key={`${player.playerId}_${token.id}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                scale: isValid ? [1, 1.15, 1] : 1,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                scale: isValid ? { repeat: Infinity, duration: 0.85 } : undefined,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer"
            >
              <button
                type="button"
                disabled={!isValid}
                onClick={() => handleTokenClick(token.id)}
                className={`relative focus:outline-none transition-transform ${
                  isValid ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
                title={`${player.nickname}'s Token #${token.id + 1} (${token.state})`}
              >
                <HDTokenPawn
                  color={player.color}
                  isValid={isValid}
                />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
