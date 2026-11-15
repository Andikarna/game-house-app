import React from 'react';
import { motion } from 'framer-motion';
import { 
  LudoGameState, 
  LudoColor, 
  LudoToken 
} from '@gamehouse/shared';
import { Star, Crown } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface LudoBoardProps {
  gameState: LudoGameState;
  myPlayerId: string;
  onSelectToken: (tokenIndex: number) => void;
}

// 52-tile track mapping to [row, col] on a 15x15 board (0 to 14)
const TRACK_COORDS: [number, number][] = [
  [6, 1],   // 0 (Red Start)
  [6, 2],   // 1
  [6, 3],   // 2
  [6, 4],   // 3
  [6, 5],   // 4
  [5, 6],   // 5
  [4, 6],   // 6
  [3, 6],   // 7
  [2, 6],   // 8 (Star)
  [1, 6],   // 9
  [0, 6],   // 10
  [0, 7],   // 11 (Crest)
  [0, 8],   // 12
  [1, 8],   // 13 (Green Start)
  [2, 8],   // 14
  [3, 8],   // 15
  [4, 8],   // 16
  [5, 8],   // 17
  [6, 9],   // 18
  [6, 10],  // 19
  [6, 11],  // 20
  [6, 12],  // 21 (Star)
  [6, 13],  // 22
  [6, 14],  // 23
  [7, 14],  // 24 (Crest)
  [8, 14],  // 25
  [8, 13],  // 26 (Yellow Start)
  [8, 12],  // 27
  [8, 11],  // 28
  [8, 10],  // 29
  [8, 9],   // 30
  [9, 8],   // 31
  [10, 8],  // 32
  [11, 8],  // 33
  [12, 8],  // 34 (Star)
  [13, 8],  // 35
  [14, 8],  // 36
  [14, 7],  // 37 (Crest)
  [14, 6],  // 38
  [13, 6],  // 39 (Blue Start)
  [12, 6],  // 40
  [11, 6],  // 41
  [10, 6],  // 42
  [9, 6],   // 43
  [8, 5],   // 44
  [8, 4],   // 45
  [8, 3],   // 46
  [8, 2],   // 47 (Star)
  [8, 1],   // 48
  [8, 0],   // 49
  [7, 0],   // 50 (Crest)
  [6, 0],   // 51
];

// Home stretch tiles (steps 52 to 56) + Home center (57)
const HOME_STRETCHES: Record<LudoColor, [number, number][]> = {
  red: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]
  ],
  green: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]
  ],
  yellow: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]
  ],
  blue: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]
  ],
};

// Yard Base coordinates for the 4 tokens of each color
const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  red: [
    [10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]
  ],
  green: [
    [1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]
  ],
  yellow: [
    [1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]
  ],
  blue: [
    [10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]
  ],
};

const SAFE_TILES_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_CLASSES: Record<LudoColor, {
  bg: string;
  border: string;
  glow: string;
  tokenBg: string;
  name: string;
}> = {
  red: {
    bg: 'bg-red-600',
    border: 'border-red-500',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.7)]',
    tokenBg: 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-300',
    name: 'Merah',
  },
  green: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-500',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.7)]',
    tokenBg: 'bg-gradient-to-tr from-emerald-600 via-teal-400 to-lime-200',
    name: 'Hijau',
  },
  yellow: {
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.7)]',
    tokenBg: 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-white',
    name: 'Kuning',
  },
  blue: {
    bg: 'bg-blue-600',
    border: 'border-blue-500',
    glow: 'shadow-[0_0_15px_rgba(37,99,235,0.7)]',
    tokenBg: 'bg-gradient-to-tr from-blue-700 via-sky-400 to-cyan-200',
    name: 'Biru',
  },
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myPlayerId,
  onSelectToken,
}) => {
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const validMoves = gameState.validMoves || [];

  // Group tokens by their board position so we can show counts if multiple tokens share a square
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
    soundManager.playClimb(); // SFX token hop
    onSelectToken(tokenIndex);
  };

  return (
    <div className="relative w-full max-w-[480px] sm:max-w-[560px] aspect-square bg-slate-900 border-4 border-slate-700/80 rounded-3xl shadow-2xl p-1.5 sm:p-2.5 select-none touch-manipulation overflow-hidden">
      {/* 15x15 BOARD GRID CONTAINER */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        
        {/* ================= 1. THE 4 CORNER YARDS ================= */}
        {/* Green Yard (Top Left: row 0-5, col 0-5) */}
        <div className="col-span-6 row-span-6 bg-emerald-600/90 border-2 border-emerald-400 p-2 sm:p-3 flex items-center justify-center relative">
          <div className="w-full h-full rounded-2xl bg-white/95 border-2 border-emerald-700/40 p-2 grid grid-cols-2 grid-rows-2 gap-2 shadow-inner">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-full bg-emerald-200/80 border-2 border-emerald-500/60 flex items-center justify-center shadow-inner" />
            ))}
          </div>
          <span className="absolute top-1 left-2 text-[10px] font-black text-white/90 uppercase tracking-wider drop-shadow">
            GREEN
          </span>
        </div>

        {/* Top Arm (Green -> Yellow: col 6-8, row 0-5) */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-slate-900 border-x-2 border-slate-700">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 3);
            const c = 6 + (idx % 3);
            const isGreenStart = r === 1 && c === 8;
            const isStar = r === 2 && c === 6;
            const isGreenPath = c === 7 && r > 0;

            return (
              <div
                key={idx}
                className={`border border-slate-800/80 flex items-center justify-center relative ${
                  isGreenStart
                    ? 'bg-emerald-500'
                    : isGreenPath
                    ? 'bg-emerald-500/80'
                    : isStar
                    ? 'bg-amber-400/20'
                    : 'bg-slate-900'
                }`}
              >
                {isStar && <Star className="w-3 h-3 text-amber-400 fill-amber-400 drop-shadow" />}
                {isGreenStart && <span className="text-[9px] font-black text-white">⭐</span>}
              </div>
            );
          })}
        </div>

        {/* Yellow Yard (Top Right: row 0-5, col 9-14) */}
        <div className="col-span-6 row-span-6 bg-amber-500/90 border-2 border-amber-300 p-2 sm:p-3 flex items-center justify-center relative">
          <div className="w-full h-full rounded-2xl bg-white/95 border-2 border-amber-600/40 p-2 grid grid-cols-2 grid-rows-2 gap-2 shadow-inner">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-full bg-amber-200/80 border-2 border-amber-500/60 flex items-center justify-center shadow-inner" />
            ))}
          </div>
          <span className="absolute top-1 right-2 text-[10px] font-black text-slate-950/90 uppercase tracking-wider drop-shadow">
            YELLOW
          </span>
        </div>

        {/* ================= 2. MIDDLE ARMS & CENTRAL HOME ================= */}
        {/* Left Arm (Red -> Green: col 0-5, row 6-8) */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-slate-900 border-y-2 border-slate-700">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 6 + Math.floor(idx / 6);
            const c = idx % 6;
            const isRedStart = r === 6 && c === 1;
            const isStar = r === 8 && c === 2;
            const isRedPath = r === 7 && c > 0;

            return (
              <div
                key={idx}
                className={`border border-slate-800/80 flex items-center justify-center relative ${
                  isRedStart
                    ? 'bg-red-600'
                    : isRedPath
                    ? 'bg-red-600/80'
                    : isStar
                    ? 'bg-amber-400/20'
                    : 'bg-slate-900'
                }`}
              >
                {isStar && <Star className="w-3 h-3 text-amber-400 fill-amber-400 drop-shadow" />}
                {isRedStart && <span className="text-[9px] font-black text-white">⭐</span>}
              </div>
            );
          })}
        </div>

        {/* Central Home Triangle (col 6-8, row 6-8) */}
        <div className="col-span-3 row-span-3 relative bg-slate-950 border-2 border-slate-600 overflow-hidden flex items-center justify-center">
          {/* 4 Colored Triangular Wings meeting in center */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Top: Green Triangle */}
              <polygon points="0,0 100,0 50,50" fill="#10B981" />
              {/* Right: Yellow Triangle */}
              <polygon points="100,0 100,100 50,50" fill="#F59E0B" />
              {/* Bottom: Blue Triangle */}
              <polygon points="100,100 0,100 50,50" fill="#2563EB" />
              {/* Left: Red Triangle */}
              <polygon points="0,100 0,0 50,50" fill="#DC2626" />
            </svg>
          </div>

          {/* Central Crown / Victory Emblem */}
          <div className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-950/80 backdrop-blur-sm border-2 border-amber-400 flex items-center justify-center shadow-lg">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Right Arm (Yellow -> Blue: col 9-14, row 6-8) */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-slate-900 border-y-2 border-slate-700">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 6 + Math.floor(idx / 6);
            const c = 9 + (idx % 6);
            const isYellowStart = r === 8 && c === 13;
            const isStar = r === 6 && c === 12;
            const isYellowPath = r === 7 && c < 14;

            return (
              <div
                key={idx}
                className={`border border-slate-800/80 flex items-center justify-center relative ${
                  isYellowStart
                    ? 'bg-amber-500'
                    : isYellowPath
                    ? 'bg-amber-500/80'
                    : isStar
                    ? 'bg-amber-400/20'
                    : 'bg-slate-900'
                }`}
              >
                {isStar && <Star className="w-3 h-3 text-amber-400 fill-amber-400 drop-shadow" />}
                {isYellowStart && <span className="text-[9px] font-black text-slate-950">⭐</span>}
              </div>
            );
          })}
        </div>

        {/* ================= 3. BOTTOM YARDS & BOTTOM ARM ================= */}
        {/* Red Yard (Bottom Left: row 9-14, col 0-5) */}
        <div className="col-span-6 row-span-6 bg-red-600/90 border-2 border-red-500 p-2 sm:p-3 flex items-center justify-center relative">
          <div className="w-full h-full rounded-2xl bg-white/95 border-2 border-red-700/40 p-2 grid grid-cols-2 grid-rows-2 gap-2 shadow-inner">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-full bg-red-200/80 border-2 border-red-500/60 flex items-center justify-center shadow-inner" />
            ))}
          </div>
          <span className="absolute bottom-1 left-2 text-[10px] font-black text-white/90 uppercase tracking-wider drop-shadow">
            RED
          </span>
        </div>

        {/* Bottom Arm (Blue -> Red: col 6-8, row 9-14) */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-slate-900 border-x-2 border-slate-700">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = 9 + Math.floor(idx / 3);
            const c = 6 + (idx % 3);
            const isBlueStart = r === 13 && c === 6;
            const isStar = r === 12 && c === 8;
            const isBluePath = c === 7 && r < 14;

            return (
              <div
                key={idx}
                className={`border border-slate-800/80 flex items-center justify-center relative ${
                  isBlueStart
                    ? 'bg-blue-600'
                    : isBluePath
                    ? 'bg-blue-600/80'
                    : isStar
                    ? 'bg-amber-400/20'
                    : 'bg-slate-900'
                }`}
              >
                {isStar && <Star className="w-3 h-3 text-amber-400 fill-amber-400 drop-shadow" />}
                {isBlueStart && <span className="text-[9px] font-black text-white">⭐</span>}
              </div>
            );
          })}
        </div>

        {/* Blue Yard (Bottom Right: row 9-14, col 9-14) */}
        <div className="col-span-6 row-span-6 bg-blue-600/90 border-2 border-blue-400 p-2 sm:p-3 flex items-center justify-center relative">
          <div className="w-full h-full rounded-2xl bg-white/95 border-2 border-blue-700/40 p-2 grid grid-cols-2 grid-rows-2 gap-2 shadow-inner">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-full bg-blue-200/80 border-2 border-blue-500/60 flex items-center justify-center shadow-inner" />
            ))}
          </div>
          <span className="absolute bottom-1 right-2 text-[10px] font-black text-white/90 uppercase tracking-wider drop-shadow">
            BLUE
          </span>
        </div>
      </div>

      {/* ================= 4. ANIMATED TOKENS OVERLAY ================= */}
      <div className="absolute inset-1.5 sm:inset-2.5 pointer-events-none">
        {tokensOnBoard.map((item, idx) => {
          const { token, player, row, col, isValid } = item;
          const colorMeta = COLOR_CLASSES[player.color];

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
                scale: isValid ? [1, 1.2, 1] : 1,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                scale: isValid ? { repeat: Infinity, duration: 0.8 } : undefined,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
            >
              <button
                type="button"
                disabled={!isValid}
                onClick={() => handleTokenClick(token.id)}
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${colorMeta.tokenBg} border-2 border-white shadow-xl flex items-center justify-center cursor-pointer transition-transform ${
                  isValid
                    ? 'ring-4 ring-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.9)] scale-110 active:scale-95'
                    : 'cursor-default'
                }`}
                title={`${player.nickname}'s Token #${token.id + 1} (${token.state})`}
              >
                {/* 3D Pawn Inner Cap */}
                <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-white/70 shadow-inner flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900/60" />
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
