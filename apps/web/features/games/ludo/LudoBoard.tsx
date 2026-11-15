import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  LudoGameState, 
  LudoColor, 
  LudoToken 
} from '@gamehouse/shared';
import { Star, Crown, ChevronDown, ChevronLeft, ChevronUp, ChevronRight, RotateCcw } from 'lucide-react';
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

// Base slots center coordinates inside the white rounded capsule (2x2 grid per color)
// Each base is 6x6. With p-[7%] and p-[8%] gap-[8%], circle centers are exactly at offset +/- 1.2 from base center.
export const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  blue: [
    [1.8, 1.8], [1.8, 4.2], [4.2, 1.8], [4.2, 4.2]
  ],
  green: [
    [1.8, 10.8], [1.8, 13.2], [4.2, 10.8], [4.2, 13.2]
  ],
  yellow: [
    [10.8, 10.8], [10.8, 13.2], [13.2, 10.8], [13.2, 13.2]
  ],
  red: [
    [10.8, 1.8], [10.8, 4.2], [13.2, 1.8], [13.2, 4.2]
  ],
};

const START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

// Calculates the exact (centerRow, centerCol) coordinates for any step count from 0 to 57
export function getTokenCoordinate(
  color: LudoColor,
  tokenId: number,
  stepCount: number,
  state: 'base' | 'track' | 'home-stretch' | 'finished'
): [number, number] {
  if (state === 'base' || stepCount <= 0) {
    return BASE_SLOTS[color][tokenId];
  }
  if (stepCount >= 1 && stepCount <= 51) {
    const trackIndex = (START_OFFSETS[color] + (stepCount - 1)) % 52;
    const [r, c] = TRACK_COORDS[trackIndex];
    return [r + 0.5, c + 0.5];
  }
  if (stepCount >= 52 && stepCount <= 56) {
    const stretchIdx = stepCount - 52;
    const [r, c] = HOME_STRETCHES[color][stretchIdx];
    return [r + 0.5, c + 0.5];
  }
  const [r, c] = HOME_STRETCHES[color][5];
  return [r + 0.5, c + 0.5];
}

// ============================================================================
// 2. ULTRA-HD 3D GLOSSY TOKEN (PAWN) COMPONENT
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
}> = {
  blue: {
    headGradStart: '#e0f2fe',
    headGradMid: '#0ea5e9',
    headGradEnd: '#0369a1',
    bodyGradStart: '#38bdf8',
    bodyGradMid: '#0284c7',
    bodyGradEnd: '#0c4a6e',
    rimShadow: '#082f49',
  },
  green: {
    headGradStart: '#dcfce7',
    headGradMid: '#22c55e',
    headGradEnd: '#15803d',
    bodyGradStart: '#4ade80',
    bodyGradMid: '#16a34a',
    bodyGradEnd: '#14532d',
    rimShadow: '#052e16',
  },
  yellow: {
    headGradStart: '#fef9c3',
    headGradMid: '#facc15',
    headGradEnd: '#ca8a04',
    bodyGradStart: '#fde047',
    bodyGradMid: '#eab308',
    bodyGradEnd: '#854d0e',
    rimShadow: '#713f12',
  },
  red: {
    headGradStart: '#fee2e2',
    headGradMid: '#ef4444',
    headGradEnd: '#b91c1c',
    bodyGradStart: '#f87171',
    bodyGradMid: '#dc2626',
    bodyGradEnd: '#7f1d1d',
    rimShadow: '#450a0a',
  },
};

const HDTokenPawn: React.FC<HDTokenProps> = ({ color, isValid, stackCount }) => {
  const conf = TOKEN_COLOR_CONFIG[color];
  const uniqueId = `pawn_grad_${color}`;

  return (
    <div className="relative w-6 h-6 sm:w-7.5 sm:h-7.5 flex items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 44 54"
        className={`w-full h-full filter ${
          isValid
            ? 'drop-shadow-[0_0_8px_rgba(250,204,21,1)] scale-105'
            : 'drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]'
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

const ROTATION_BY_COLOR: Record<LudoColor, number> = {
  red: 0,
  blue: 270,
  green: 180,
  yellow: 90,
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myPlayerId,
  onSelectToken,
}) => {
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const validMoves = gameState.validMoves || [];

  // Default to player POV: local player base is always at Bottom-Left
  const [povMode, setPovMode] = useState<'player' | 'global'>('player');
  const myColor: LudoColor = myPlayer?.color || 'red';
  const boardRotationDeg = povMode === 'player' ? ROTATION_BY_COLOR[myColor] : 0;

  // =========================================================================
  // STEP-BY-STEP (SATU-PER-SATU) TOKEN MOVEMENT ANIMATION ENGINE
  // =========================================================================
  const [animatedSteps, setAnimatedSteps] = useState<Record<string, number>>({});
  const displayedStepsRef = useRef<Record<string, number>>({});
  const targetStepsRef = useRef<Record<string, number>>({});
  const activeIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup on unmount ONLY
  useEffect(() => {
    return () => {
      Object.values(activeIntervalsRef.current).forEach((t) => clearInterval(t));
    };
  }, []);

  // Synchronize token movements whenever gameState updates
  useEffect(() => {
    Object.values(gameState.players).forEach((player) => {
      player.tokens.forEach((token) => {
        const key = `${player.playerId}_${token.id}`;
        const serverTarget = token.state === 'base' ? 0 : token.stepCount;
        const currentDisplayed = displayedStepsRef.current[key];

        // 1. Initial load
        if (currentDisplayed === undefined) {
          displayedStepsRef.current[key] = serverTarget;
          targetStepsRef.current[key] = serverTarget;
          setAnimatedSteps((prev) => ({ ...prev, [key]: serverTarget }));
          return;
        }

        // 2. Token reset or knocked back to base
        if (serverTarget < currentDisplayed) {
          if (activeIntervalsRef.current[key]) {
            clearInterval(activeIntervalsRef.current[key]);
            delete activeIntervalsRef.current[key];
          }
          displayedStepsRef.current[key] = serverTarget;
          targetStepsRef.current[key] = serverTarget;
          setAnimatedSteps((prev) => ({ ...prev, [key]: serverTarget }));
          return;
        }

        // 3. Token advanced forward
        const prevTarget = targetStepsRef.current[key] ?? currentDisplayed;
        if (serverTarget > prevTarget) {
          targetStepsRef.current[key] = serverTarget;

          // If moving from base (0) directly to start tile (1)
          if (currentDisplayed === 0 && serverTarget === 1) {
            if (activeIntervalsRef.current[key]) {
              clearInterval(activeIntervalsRef.current[key]);
              delete activeIntervalsRef.current[key];
            }
            displayedStepsRef.current[key] = 1;
            setAnimatedSteps((prev) => ({ ...prev, [key]: 1 }));
            soundManager.playTokenMove();
            return;
          }

          // If walking along track (e.g., 1 -> 5), walk tile by tile!
          if (!activeIntervalsRef.current[key]) {
            activeIntervalsRef.current[key] = setInterval(() => {
              const cur = displayedStepsRef.current[key] ?? 0;
              const target = targetStepsRef.current[key] ?? cur;

              if (cur < target) {
                const next = cur + 1;
                displayedStepsRef.current[key] = next;
                setAnimatedSteps((prev) => ({ ...prev, [key]: next }));
                soundManager.playTokenMove(); // Sound hop at each single tile!

                if (next >= target) {
                  clearInterval(activeIntervalsRef.current[key]);
                  delete activeIntervalsRef.current[key];
                }
              } else {
                clearInterval(activeIntervalsRef.current[key]);
                delete activeIntervalsRef.current[key];
              }
            }, 140);
          }
        }
      });
    });
  }, [gameState]);

  // Compute screen coordinates for each token using its animated step
  const tokensOnBoard: Array<{
    token: LudoToken;
    player: typeof myPlayer;
    row: number;
    col: number;
    isValid: boolean;
  }> = [];

  Object.values(gameState.players).forEach((player) => {
    player.tokens.forEach((token) => {
      const key = `${player.playerId}_${token.id}`;
      const serverStep = token.state === 'base' ? 0 : token.stepCount;
      const animStep = animatedSteps[key];

      // Safeguard: token on track or home-stretch must never fall back to base coordinates (0)
      const currentStep = (serverStep > 0 && (animStep === undefined || animStep === 0))
        ? serverStep
        : (animStep ?? serverStep);

      const [r, c] = getTokenCoordinate(player.color, token.id, currentStep, token.state);

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
    soundManager.playTokenMove();
    onSelectToken(tokenIndex);
  };

  return (
    <div className="relative w-full max-w-[480px] sm:max-w-[560px] aspect-square bg-[#0c121e] border-[6px] border-slate-700/80 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 sm:p-3 select-none touch-manipulation overflow-hidden">
      {/* POV CAMERA BADGE */}
      <div className="absolute top-3.5 right-3.5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setPovMode((prev) => (prev === 'player' ? 'global' : 'player'))}
          className="px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 hover:border-amber-400 text-[10px] font-mono font-bold text-slate-200 hover:text-amber-300 flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Ubah Sudut Pandang Kamera Ludo"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>POV: {povMode === 'player' ? `${myColor.toUpperCase()} (KIRI BAWAH)` : 'GLOBAL'}</span>
        </button>
      </div>

      {/* ROTATABLE BOARD WRAPPER (Local player's home base is always oriented at Bottom-Left) */}
      <div 
        className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${boardRotationDeg}deg)` }}
      >
        {/* RIGID 15x15 BOARD GRID CONTAINER WITH EXPLICIT CSS INLINE GRID SPANS */}
        <div 
          className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white shadow-2xl border-2 border-slate-400/40"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
            width: '100%',
            height: '100%',
          }}
        >
          
          {/* ================================================================= */}
          {/* 1. TOP-LEFT BASE: BLUE (grid lines: col 1..7, row 1..7)           */}
          {/* ================================================================= */}
          <div 
            style={{ gridColumn: '1 / 7', gridRow: '1 / 7' }}
            className="bg-[#0070f3] p-[7%] flex items-center justify-center relative rounded-tl-[1.8rem]"
          >
            <div className="w-full h-full rounded-[1.4rem] sm:rounded-[1.8rem] bg-white border border-slate-200/90 p-[8%] gap-[8%] grid grid-cols-2 grid-rows-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
              {[0, 1, 2, 3].map((i) => {
                const isTokenValid = myColor === 'blue' && isMyTurn && validMoves.includes(i) && myPlayer?.tokens[i]?.state === 'base';
                return (
                  <button 
                    key={i} 
                    type="button"
                    disabled={!isTokenValid}
                    onClick={() => handleTokenClick(i)}
                    className={`rounded-full bg-[#f0f9ff] border-2 flex items-center justify-center shadow-inner aspect-square transition-all ${
                      isTokenValid 
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] cursor-pointer active:scale-95' 
                        : 'border-[#bae6fd] cursor-default'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. TOP ARM (grid lines: col 7..10, row 1..7)                       */}
          {/* ================================================================= */}
          <div 
            style={{ 
              gridColumn: '7 / 10', 
              gridRow: '1 / 7',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
            }}
            className="bg-white border-x border-slate-300"
          >
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
                  {isGreenArrow && (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#16a34a] stroke-[3.5] animate-bounce" />
                  )}

                  {isGreenStart && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white drop-shadow" />
                    </div>
                  )}

                  {isSafeStar && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 fill-slate-400 drop-shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* 3. TOP-RIGHT BASE: GREEN (grid lines: col 10..16, row 1..7)        */}
          {/* ================================================================= */}
          <div 
            style={{ gridColumn: '10 / 16', gridRow: '1 / 7' }}
            className="bg-[#16a34a] p-[7%] flex items-center justify-center relative rounded-tr-[1.8rem]"
          >
            <div className="w-full h-full rounded-[1.4rem] sm:rounded-[1.8rem] bg-white border border-slate-200/90 p-[8%] gap-[8%] grid grid-cols-2 grid-rows-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
              {[0, 1, 2, 3].map((i) => {
                const isTokenValid = myColor === 'green' && isMyTurn && validMoves.includes(i) && myPlayer?.tokens[i]?.state === 'base';
                return (
                  <button 
                    key={i} 
                    type="button"
                    disabled={!isTokenValid}
                    onClick={() => handleTokenClick(i)}
                    className={`rounded-full bg-[#f0fdf4] border-2 flex items-center justify-center shadow-inner aspect-square transition-all ${
                      isTokenValid 
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] cursor-pointer active:scale-95' 
                        : 'border-[#bbf7d0] cursor-default'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. LEFT ARM (grid lines: col 1..7, row 7..10)                      */}
          {/* ================================================================= */}
          <div 
            style={{ 
              gridColumn: '1 / 7', 
              gridRow: '7 / 10',
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
            }}
            className="bg-white border-y border-slate-300"
          >
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
                  {isBlueArrow && (
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0070f3] stroke-[3.5] animate-pulse" />
                  )}

                  {isBlueStart && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white drop-shadow" />
                    </div>
                  )}

                  {isSafeStar && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 fill-slate-400 drop-shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* 5. CENTER 3x3: 4 HOME TRIANGLES & VICTORY CROWN (col 7..10, row 7..10) */}
          {/* ================================================================= */}
          <div 
            style={{ gridColumn: '7 / 10', gridRow: '7 / 10' }}
            className="relative bg-white border border-slate-400/80 overflow-hidden flex items-center justify-center shadow-inner"
          >
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon points="0,0 100,0 50,50" fill="#16a34a" />
                <polygon points="100,0 100,100 50,50" fill="#f59e0b" />
                <polygon points="100,100 0,100 50,50" fill="#dc2626" />
                <polygon points="0,100 0,0 50,50" fill="#0070f3" />
              </svg>
            </div>

            <div 
              className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-950/85 backdrop-blur-sm border-2 border-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.85)] transition-transform duration-700"
              style={{ transform: `rotate(${-boardRotationDeg}deg)` }}
            >
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300 animate-pulse" />
            </div>
          </div>

          {/* ================================================================= */}
          {/* 6. RIGHT ARM (grid lines: col 10..16, row 7..10)                   */}
          {/* ================================================================= */}
          <div 
            style={{ 
              gridColumn: '10 / 16', 
              gridRow: '7 / 10',
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
            }}
            className="bg-white border-y border-slate-300"
          >
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
                  {isYellowArrow && (
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f59e0b] stroke-[3.5] animate-pulse" />
                  )}

                  {isYellowStart && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white drop-shadow" />
                    </div>
                  )}

                  {isSafeStar && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 fill-slate-400 drop-shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* 7. BOTTOM-LEFT BASE: RED (grid lines: col 1..7, row 10..16)        */}
          {/* ================================================================= */}
          <div 
            style={{ gridColumn: '1 / 7', gridRow: '10 / 16' }}
            className="bg-[#dc2626] p-[7%] flex items-center justify-center relative rounded-bl-[1.8rem]"
          >
            <div className="w-full h-full rounded-[1.4rem] sm:rounded-[1.8rem] bg-white border border-slate-200/90 p-[8%] gap-[8%] grid grid-cols-2 grid-rows-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
              {[0, 1, 2, 3].map((i) => {
                const isTokenValid = myColor === 'red' && isMyTurn && validMoves.includes(i) && myPlayer?.tokens[i]?.state === 'base';
                return (
                  <button 
                    key={i} 
                    type="button"
                    disabled={!isTokenValid}
                    onClick={() => handleTokenClick(i)}
                    className={`rounded-full bg-[#fef2f2] border-2 flex items-center justify-center shadow-inner aspect-square transition-all ${
                      isTokenValid 
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] cursor-pointer active:scale-95' 
                        : 'border-[#fecaca] cursor-default'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 8. BOTTOM ARM (grid lines: col 7..10, row 10..16)                  */}
          {/* ================================================================= */}
          <div 
            style={{ 
              gridColumn: '7 / 10', 
              gridRow: '10 / 16',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
            }}
            className="bg-white border-x border-slate-300"
          >
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
                  {isRedArrow && (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#dc2626] stroke-[3.5] animate-bounce" />
                  )}

                  {isRedStart && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white drop-shadow" />
                    </div>
                  )}

                  {isSafeStar && (
                    <div style={{ transform: `rotate(${-boardRotationDeg}deg)` }} className="transition-transform duration-700">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 fill-slate-400 drop-shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* 9. BOTTOM-RIGHT BASE: YELLOW (grid lines: col 10..16, row 10..16)  */}
          {/* ================================================================= */}
          <div 
            style={{ gridColumn: '10 / 16', gridRow: '10 / 16' }}
            className="bg-[#f59e0b] p-[7%] flex items-center justify-center relative rounded-br-[1.8rem]"
          >
            <div className="w-full h-full rounded-[1.4rem] sm:rounded-[1.8rem] bg-white border border-slate-200/90 p-[8%] gap-[8%] grid grid-cols-2 grid-rows-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.18)]">
              {[0, 1, 2, 3].map((i) => {
                const isTokenValid = myColor === 'yellow' && isMyTurn && validMoves.includes(i) && myPlayer?.tokens[i]?.state === 'base';
                return (
                  <button 
                    key={i} 
                    type="button"
                    disabled={!isTokenValid}
                    onClick={() => handleTokenClick(i)}
                    className={`rounded-full bg-[#fefce8] border-2 flex items-center justify-center shadow-inner aspect-square transition-all ${
                      isTokenValid 
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] cursor-pointer active:scale-95' 
                        : 'border-[#fef08a] cursor-default'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 10. ANIMATED 3D GLOSSY TOKENS OVERLAY                               */}
        {/* =================================================================== */}
        <div className="absolute inset-0 pointer-events-none">
          {(() => {
            // Track occupancy to stagger multiple pawns sharing the exact same track tile
            const occupancy: Record<string, number> = {};
            tokensOnBoard.forEach((item) => {
              const k = `${item.row.toFixed(2)}_${item.col.toFixed(2)}`;
              occupancy[k] = (occupancy[k] || 0) + 1;
            });

            const counters: Record<string, number> = {};

            return tokensOnBoard.map((item) => {
              const { token, player, row, col, isValid } = item;
              const k = `${row.toFixed(2)}_${col.toFixed(2)}`;
              const totalOnTile = occupancy[k] || 1;
              const indexOnTile = counters[k] || 0;
              counters[k] = indexOnTile + 1;

              let offsetX = 0;
              let offsetY = 0;
              if (totalOnTile > 1 && token.state !== 'base') {
                const angle = (indexOnTile / totalOnTile) * Math.PI * 2;
                offsetX = Math.cos(angle) * 1.1; // 1.1% of board width
                offsetY = Math.sin(angle) * 1.1;
              }

              // col and row are already exact center coordinates in 0..15 space
              const leftPercent = (col / 15) * 100 + offsetX;
              const topPercent = (row / 15) * 100 + offsetY;

              return (
                <motion.div
                  key={`${player.playerId}_${token.id}`}
                  animate={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    scale: isValid ? [1, 1.12, 1] : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 450, damping: 28 },
                    top: { type: 'spring', stiffness: 450, damping: 28 },
                    scale: isValid ? { repeat: Infinity, duration: 0.85 } : undefined,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer"
                >
                  <button
                    type="button"
                    disabled={!isValid}
                    onClick={() => handleTokenClick(token.id)}
                    className={`relative flex items-center justify-center p-0.5 focus:outline-none transition-transform ${
                      isValid ? 'cursor-pointer active:scale-95' : 'cursor-default'
                    }`}
                    title={`${player.nickname}'s Token #${token.id + 1} (${token.state})`}
                  >
                    {/* Glowing selection halo when it is valid to move */}
                    {isValid && (
                      <span className="absolute -inset-1 rounded-full bg-amber-400/35 border-2 border-amber-400 animate-ping pointer-events-none" />
                    )}
                    {isValid && (
                      <span className="absolute -inset-1 rounded-full border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse pointer-events-none" />
                    )}
                    <div
                      className="transition-transform duration-700"
                      style={{ transform: `rotate(${-boardRotationDeg}deg)` }}
                    >
                      <HDTokenPawn
                        color={player.color}
                        isValid={isValid}
                      />
                    </div>
                  </button>
                </motion.div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
