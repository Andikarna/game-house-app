import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LudoGameState,
  LudoColor,
  LudoToken,
  AvatarId,
} from '@gamehouse/shared';
import { Star, Crown, RotateCcw, Sparkles } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';
import { useGameStore } from '../../../stores/useGameStore';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';

interface LudoBoardProps {
  gameState: LudoGameState;
  myPlayerId: string;
  onSelectToken: (tokenIndex: number) => void;
}

// ============================================================================
// 1A. 6-PLAYER HEXAGONAL BOARD GEOMETRY (1000 x 1000 SVG Space)
// Clockwise Arms:
//   0: Red (6 o'clock, 90°)
//   1: Blue (8 o'clock, 150°)
//   2: Purple (10 o'clock, 210°)
//   3: Green (12 o'clock, 270°)
//   4: Yellow (2 o'clock, 330°)
//   5: Orange (4 o'clock, 30°)
// Total Track: 6 * 13 = 78 tiles (steps 1..77)
// Home Stretch: 5 tiles per arm (steps 78..82)
// Center Finish: step 83
// ============================================================================

export const HEX_COLORS: LudoColor[] = ['red', 'blue', 'purple', 'green', 'yellow', 'orange'];

const CENTER = 500;
const W_ARM = 144;
const CELL_W = W_ARM / 3; // 48
const R_CENTER = W_ARM; // 144
const A_CENTER = (R_CENTER * Math.sqrt(3)) / 2; // ~124.7076
const CELL_H = 52;
const D_BASE = 328;
const BASE_RADIUS = 78;
const BASE_INNER_RADIUS = 56;
const BASE_SLOT_OFFSET = 22;

const COLOR_HEX: Record<LudoColor, { main: string; light: string; border: string; slotBg: string }> = {
  red: { main: '#dc2626', light: '#fef2f2', border: '#fecaca', slotBg: '#fee2e2' },
  blue: { main: '#0070f3', light: '#f0f9ff', border: '#bae6fd', slotBg: '#dbeafe' },
  purple: { main: '#9333ea', light: '#faf5ff', border: '#e9d5ff', slotBg: '#f3e8ff' },
  green: { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', slotBg: '#dcfce7' },
  yellow: { main: '#eab308', light: '#fefce8', border: '#fef08a', slotBg: '#fef9c3' },
  orange: { main: '#ea580c', light: '#fff7ed', border: '#fed7aa', slotBg: '#ffedd5' },
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Returns [y, x] in 0..1000 board space for a cell on Arm k (0..5)
function getArmCellCenter(armIndex: number, lane: -1 | 0 | 1, row: number): [number, number] {
  const alphaDeg = 90 + armIndex * 60;
  const rad = degToRad(alphaDeg);
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const r = A_CENTER + (row + 0.5) * CELL_H;
  const lat = lane * CELL_W;
  const x = CENTER + r * cosA - lat * sinA;
  const y = CENTER + r * sinA + lat * cosA;
  return [y, x];
}

// 78 Global Track Coordinates [y, x] in 0..1000 space
export const TRACK_COORDS: [number, number][] = (() => {
  const coords: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const nextK = (k + 1) % 6;
    coords.push(getArmCellCenter(k, 1, 4)); // k*13 + 0: Start Tile of color k
    coords.push(getArmCellCenter(k, 1, 3)); // +1
    coords.push(getArmCellCenter(k, 1, 2)); // +2
    coords.push(getArmCellCenter(k, 1, 1)); // +3
    coords.push(getArmCellCenter(k, 1, 0)); // +4
    coords.push(getArmCellCenter(nextK, -1, 0)); // +5
    coords.push(getArmCellCenter(nextK, -1, 1)); // +6
    coords.push(getArmCellCenter(nextK, -1, 2)); // +7
    coords.push(getArmCellCenter(nextK, -1, 3)); // +8: Safe Star Tile
    coords.push(getArmCellCenter(nextK, -1, 4)); // +9
    coords.push(getArmCellCenter(nextK, -1, 5)); // +10
    coords.push(getArmCellCenter(nextK, 0, 5));  // +11: Home Stretch Arrow Tip for nextK
    coords.push(getArmCellCenter(nextK, 1, 5));  // +12: Corner Tip
  }
  return coords;
})();

// Home stretch private tiles (steps 78..82) + finish triangle center (step 83)
export const HOME_STRETCHES: Record<LudoColor, [number, number][]> = (() => {
  const map = {} as Record<LudoColor, [number, number][]>;
  HEX_COLORS.forEach((color, k) => {
    const alphaRad = degToRad(90 + k * 60);
    const finishR = A_CENTER * 0.56;
    const finishCoord: [number, number] = [
      CENTER + finishR * Math.sin(alphaRad),
      CENTER + finishR * Math.cos(alphaRad),
    ];
    map[color] = [
      getArmCellCenter(k, 0, 4), // step 78
      getArmCellCenter(k, 0, 3), // step 79
      getArmCellCenter(k, 0, 2), // step 80
      getArmCellCenter(k, 0, 1), // step 81
      getArmCellCenter(k, 0, 0), // step 82
      finishCoord,               // step 83
    ];
  });
  return map;
})();

// Base centers [y, x] in 0..1000 space
export const BASE_CENTERS: Record<LudoColor, [number, number]> = (() => {
  const map = {} as Record<LudoColor, [number, number]>;
  HEX_COLORS.forEach((color, k) => {
    const betaRad = degToRad(120 + k * 60);
    map[color] = [
      CENTER + D_BASE * Math.sin(betaRad),
      CENTER + D_BASE * Math.cos(betaRad),
    ];
  });
  return map;
})();

// Base token slots [y, x] in 0..1000 space (4 slots per base)
export const BASE_SLOTS: Record<LudoColor, [number, number][]> = (() => {
  const map = {} as Record<LudoColor, [number, number][]>;
  HEX_COLORS.forEach((color) => {
    const [cy, cx] = BASE_CENTERS[color];
    map[color] = [
      [cy - BASE_SLOT_OFFSET, cx - BASE_SLOT_OFFSET],
      [cy - BASE_SLOT_OFFSET, cx + BASE_SLOT_OFFSET],
      [cy + BASE_SLOT_OFFSET, cx - BASE_SLOT_OFFSET],
      [cy + BASE_SLOT_OFFSET, cx + BASE_SLOT_OFFSET],
    ];
  });
  return map;
})();

const START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  blue: 13,
  purple: 26,
  green: 39,
  yellow: 52,
  orange: 65,
};

// Returns [y, x] in 0..1000 board space for any step count from 0 to 83
export function getTokenCoordinate(
  color: LudoColor,
  tokenId: number,
  stepCount: number,
  state: 'base' | 'track' | 'home-stretch' | 'finished'
): [number, number] {
  if (state === 'base' || stepCount <= 0) {
    return BASE_SLOTS[color][tokenId];
  }
  if (stepCount >= 1 && stepCount <= 77) {
    const trackIndex = (START_OFFSETS[color] + (stepCount - 1)) % 78;
    return TRACK_COORDS[trackIndex];
  }
  if (stepCount >= 78 && stepCount <= 82) {
    const stretchIdx = stepCount - 78;
    return HOME_STRETCHES[color][stretchIdx];
  }
  return HOME_STRETCHES[color][5];
}

// ============================================================================
// 1B. 4-PLAYER SQUARE BOARD GEOMETRY (1000 x 1000 SVG Space)
// Classic 15x15 grid layout:
//   Yards:  Blue=top-left, Green=top-right, Red=bottom-right, Yellow=bottom-left
//   Home columns: Blue=left (row 7), Green=top (col 7), Red=right (row 7), Yellow=bottom (col 7)
//   Start tiles: Red=(12,8) idx22, Blue=(3,6) idx49, Green=(8,3) idx10, Yellow=(6,11) idx36
//   Safe stars: (7,0) idx6, (14,7) idx19, (7,14) idx32, (0,7) idx45
// Total Track: 52 tiles (steps 1..51)
// Home Stretch: 5 tiles per arm (steps 52..56)
// Center Finish: step 57
// ============================================================================

export const SQ_COLORS: LudoColor[] = ['red', 'blue', 'green', 'yellow'];

const SQ_CELL = 64; // each cell is 64×64 in 1000-unit space
const SQ_GRID_OFFSET = 500 - 7.5 * SQ_CELL; // = 20

function sqCell(col: number, row: number): [number, number] {
  // Returns [y, x] center of cell at grid col (0-14), row (0-14)
  const x = SQ_GRID_OFFSET + col * SQ_CELL + SQ_CELL / 2;
  const y = SQ_GRID_OFFSET + row * SQ_CELL + SQ_CELL / 2;
  return [y, x];
}

// 52-step clockwise ring on the 15x15 grid, index 0 = (6,5).
// Verified: every color's 51st step lands adjacent to its own home column entry.
export const SQ_TRACK_COORDS_FINAL: [number, number][] = (() => {
  const grid: [number, number][] = [
    // Segment 1: top arm left lane going UP — (6,5)..(6,1)
    [6,5],[6,4],[6,3],[6,2],[6,1],
    // Segment 2: top edge — (6,0),(7,0),(8,0)
    [6,0],[7,0],[8,0],
    // Segment 3: top arm right lane going DOWN — (8,1)..(8,5)
    [8,1],[8,2],[8,3],[8,4],[8,5],
    // Segment 4: right arm top lane going RIGHT — (9,6)..(13,6)
    [9,6],[10,6],[11,6],[12,6],[13,6],
    // Segment 5: right edge — (14,6),(14,7),(14,8)
    [14,6],[14,7],[14,8],
    // Segment 6: right arm bottom lane going LEFT — (13,8)..(9,8)
    [13,8],[12,8],[11,8],[10,8],[9,8],
    // Segment 7: bottom arm right lane going DOWN — (8,9)..(8,13)
    [8,9],[8,10],[8,11],[8,12],[8,13],
    // Segment 8: bottom edge — (8,14),(7,14),(6,14)
    [8,14],[7,14],[6,14],
    // Segment 9: bottom arm left lane going UP — (6,13)..(6,9)
    [6,13],[6,12],[6,11],[6,10],[6,9],
    // Segment 10: left arm bottom lane going LEFT — (5,8)..(1,8)
    [5,8],[4,8],[3,8],[2,8],[1,8],
    // Segment 11: left edge — (0,8),(0,7),(0,6)
    [0,8],[0,7],[0,6],
    // Segment 12: left arm top lane going RIGHT — (1,6)..(5,6)
    [1,6],[2,6],[3,6],[4,6],[5,6],
  ];
  return grid.map(([col, row]) => sqCell(col, row));
})();

// Home stretches (steps 52..56) + center finish (step 57) per color.
// Ordered from the track entry (outermost) toward the center.
export const SQ_HOME_STRETCHES_GRID: Record<string, [number, number][]> = {
  red:    [sqCell(13,7), sqCell(12,7), sqCell(11,7), sqCell(10,7), sqCell(9,7),  [500, 500]], // right row, going left to center
  blue:   [sqCell(1,7),  sqCell(2,7),  sqCell(3,7),  sqCell(4,7),  sqCell(5,7),  [500, 500]], // left row, going right to center
  green:  [sqCell(7,1),  sqCell(7,2),  sqCell(7,3),  sqCell(7,4),  sqCell(7,5),  [500, 500]], // top column, going down to center
  yellow: [sqCell(7,13), sqCell(7,12), sqCell(7,11), sqCell(7,10), sqCell(7,9),  [500, 500]], // bottom column, going up to center
};

// Base yard centers: Blue=TL, Green=TR, Red=BR, Yellow=BL
export const SQ_BASE_CENTERS: Record<string, [number, number]> = {
  red:    [788, 788],
  blue:   [212, 212],
  green:  [212, 788],
  yellow: [788, 212],
};

const SQ_BASE_SLOT_OFF = 62;
export const SQ_BASE_SLOTS: Record<string, [number, number][]> = (() => {
  const m: Record<string, [number, number][]> = {};
  for (const color of SQ_COLORS) {
    const [cy, cx] = SQ_BASE_CENTERS[color];
    m[color] = [
      [cy - SQ_BASE_SLOT_OFF, cx - SQ_BASE_SLOT_OFF],
      [cy - SQ_BASE_SLOT_OFF, cx + SQ_BASE_SLOT_OFF],
      [cy + SQ_BASE_SLOT_OFF, cx - SQ_BASE_SLOT_OFF],
      [cy + SQ_BASE_SLOT_OFF, cx + SQ_BASE_SLOT_OFF],
    ];
  }
  return m;
})();

// Ring index of each color's start tile (must match server SQ_START_TILES)
const SQ_START_OFFSETS: Record<string, number> = {
  red: 22,
  blue: 49,
  green: 10,
  yellow: 36,
};

// Grid coords (col,row) of special tiles for rendering
const SQ_START_TILES_GRID: Record<string, [number, number]> = {
  red:    [12, 8],
  blue:   [3, 6],
  green:  [8, 3],
  yellow: [6, 11],
};
const SQ_STAR_TILES_GRID: [number, number][] = [
  [7, 0],
  [14, 7],
  [7, 14],
  [0, 7],
];

// Home lane cells (col,row) per color, for fill rendering
const SQ_HOME_LANE_CELLS: Record<string, [number, number][]> = {
  red:    [[9, 7], [10, 7], [11, 7], [12, 7], [13, 7]],
  blue:   [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[7, 9], [7, 10], [7, 11], [7, 12], [7, 13]],
};

// Returns [y, x] in 0..1000 board space for square layout, steps 0..57
export function getTokenCoordinateSquare(
  color: string,
  tokenId: number,
  stepCount: number,
  state: 'base' | 'track' | 'home-stretch' | 'finished',
): [number, number] {
  if (state === 'base' || stepCount <= 0) {
    return (SQ_BASE_SLOTS[color] || SQ_BASE_SLOTS['red'])[tokenId];
  }
  if (stepCount >= 1 && stepCount <= 51) {
    const idx = (SQ_START_OFFSETS[color] + (stepCount - 1)) % 52;
    return SQ_TRACK_COORDS_FINAL[idx] || [500, 500];
  }
  if (stepCount >= 52 && stepCount <= 56) {
    const hs = SQ_HOME_STRETCHES_GRID[color] || SQ_HOME_STRETCHES_GRID['red'];
    return hs[stepCount - 52] || [500, 500];
  }
  // finished (step 57) → center
  return [500, 500];
}

// ============================================================================
// 2. ULTRA-HD 3D GLOSSY TOKEN (PAWN) COMPONENT
// ============================================================================

interface HDTokenProps {
  color: LudoColor;
  isValid?: boolean;
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
  red: {
    headGradStart: '#fee2e2', headGradMid: '#ef4444', headGradEnd: '#b91c1c',
    bodyGradStart: '#f87171', bodyGradMid: '#dc2626', bodyGradEnd: '#7f1d1d', rimShadow: '#450a0a',
  },
  blue: {
    headGradStart: '#e0f2fe', headGradMid: '#0ea5e9', headGradEnd: '#0369a1',
    bodyGradStart: '#38bdf8', bodyGradMid: '#0284c7', bodyGradEnd: '#0c4a6e', rimShadow: '#082f49',
  },
  purple: {
    headGradStart: '#f3e8ff', headGradMid: '#a855f7', headGradEnd: '#7e22ce',
    bodyGradStart: '#c084fc', bodyGradMid: '#9333ea', bodyGradEnd: '#581c87', rimShadow: '#3b0764',
  },
  green: {
    headGradStart: '#dcfce7', headGradMid: '#22c55e', headGradEnd: '#15803d',
    bodyGradStart: '#4ade80', bodyGradMid: '#16a34a', bodyGradEnd: '#14532d', rimShadow: '#052e16',
  },
  yellow: {
    headGradStart: '#fef9c3', headGradMid: '#facc15', headGradEnd: '#ca8a04',
    bodyGradStart: '#fde047', bodyGradMid: '#eab308', bodyGradEnd: '#854d0e', rimShadow: '#713f12',
  },
  orange: {
    headGradStart: '#ffedd5', headGradMid: '#fb923c', headGradEnd: '#c2410c',
    bodyGradStart: '#fdba74', bodyGradMid: '#ea580c', bodyGradEnd: '#7c2d12', rimShadow: '#431407',
  },
};

const HDTokenPawn: React.FC<HDTokenProps> = ({ color, isValid }) => {
  const conf = TOKEN_COLOR_CONFIG[color];
  const uid = `pawn_grad_${color}`;
  return (
    <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center select-none pointer-events-none">
      <svg viewBox="0 0 44 54" className={`w-full h-full filter ${isValid ? 'drop-shadow-[0_0_8px_rgba(250,204,21,1)] scale-105' : 'drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]'} transition-transform duration-200`}>
        <defs>
          <radialGradient id={`${uid}_head`} cx="35%" cy="32%" r="65%" fx="30%" fy="25%">
            <stop offset="0%" stopColor={conf.headGradStart} />
            <stop offset="45%" stopColor={conf.headGradMid} />
            <stop offset="100%" stopColor={conf.headGradEnd} />
          </radialGradient>
          <linearGradient id={`${uid}_body`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={conf.bodyGradStart} />
            <stop offset="50%" stopColor={conf.bodyGradMid} />
            <stop offset="100%" stopColor={conf.bodyGradEnd} />
          </linearGradient>
          <linearGradient id={`${uid}_rim`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={conf.bodyGradMid} />
            <stop offset="100%" stopColor={conf.rimShadow} />
          </linearGradient>
        </defs>
        <ellipse cx="22" cy="49" rx="15" ry="4.5" fill="rgba(0,0,0,0.4)" />
        <path d="M 14 26 C 11 33, 7 40, 8 45 C 8.5 48, 35.5 48, 36 45 C 37 40, 33 33, 30 26 Z" fill={`url(#${uid}_body)`} />
        <ellipse cx="22" cy="45.5" rx="13.5" ry="2.5" fill={`url(#${uid}_rim)`} opacity="0.85" />
        <path d="M 13 30 C 11 36, 11 41, 13 44" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" fill="none" />
        <ellipse cx="22" cy="26" rx="7" ry="2" fill={conf.bodyGradStart} stroke={conf.headGradEnd} strokeWidth="0.8" />
        <circle cx="22" cy="15" r="9.5" fill={`url(#${uid}_head)`} />
        <ellipse cx="19" cy="12" rx="3.5" ry="2.2" transform="rotate(-25 19 12)" fill="white" opacity="0.88" />
      </svg>
    </div>
  );
};

// ============================================================================
// 2b. BASE SPEECH BUBBLE COMPONENT
// ============================================================================

interface ActiveBaseChat {
  id: string;
  message: string;
  nickname: string;
  avatar: AvatarId;
  timestamp: number;
}

const BaseSpeechBubble: React.FC<{
  chat: ActiveBaseChat | null;
  color: LudoColor;
  boardRotationDeg: number;
  onDismiss?: () => void;
}> = ({ chat, color, boardRotationDeg, onDismiss }) => {
  const colorStyles: Record<LudoColor, { border: string; text: string; glow: string; tailBorder: string }> = {
    red:    { border: 'border-red-500',     text: 'text-red-400',     glow: 'shadow-red-500/40',     tailBorder: 'border-red-500' },
    blue:   { border: 'border-blue-500',    text: 'text-blue-400',    glow: 'shadow-blue-500/40',    tailBorder: 'border-blue-500' },
    purple: { border: 'border-purple-500',  text: 'text-purple-400',  glow: 'shadow-purple-500/40',  tailBorder: 'border-purple-500' },
    green:  { border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/40', tailBorder: 'border-emerald-500' },
    yellow: { border: 'border-yellow-400',  text: 'text-yellow-400',  glow: 'shadow-yellow-400/40',  tailBorder: 'border-yellow-400' },
    orange: { border: 'border-orange-500',  text: 'text-orange-400',  glow: 'shadow-orange-500/40',  tailBorder: 'border-orange-500' },
  };
  const style = colorStyles[color] || colorStyles.red;
  return (
    <div className="flex items-center justify-center pointer-events-none">
      <div className="transition-transform duration-700 ease-out flex items-center justify-center pointer-events-auto"
        style={{ transform: `rotate(${-boardRotationDeg}deg)` }}>
        <AnimatePresence>
          {chat && (
            <motion.div key={chat.id}
              initial={{ scale: 0.3, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.2, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={onDismiss}
              className="relative select-none cursor-pointer"
            >
              <div className={`px-2.5 py-1.5 rounded-2xl bg-slate-950/95 border-2 ${style.border} shadow-2xl ${style.glow} backdrop-blur-md max-w-[140px] sm:max-w-[175px]`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ClimberAvatarIcon avatar={chat.avatar} size={18} />
                  <span className={`text-[10px] font-black truncate ${style.text}`}>{chat.nickname}</span>
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-white leading-tight break-words">{chat.message}</p>
                <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r-2 border-b-2 ${style.tailBorder} rotate-45`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MAIN BOARD COMPONENT — dispatches square vs hex layout
// ============================================================================

const HEX_ROTATION_BY_COLOR: Record<LudoColor, number> = {
  red: 0, blue: 300, purple: 240, green: 180, yellow: 120, orange: 60,
};

// Square POV: rotate board so local player's yard is at bottom
const SQ_ROTATION_BY_COLOR: Record<string, number> = {
  red: 0, blue: 90, green: 180, yellow: 270,
};

interface BoardLogicResult {
  tokensOnBoard: Array<{
    token: LudoToken;
    player: LudoPlayerView;
    y: number;
    x: number;
    isValid: boolean;
  }>;
  handleTokenClick: (tokenIndex: number) => void;
}

type LudoPlayerView = NonNullable<LudoGameState['players'][string]>;

// Shared logic hook: step animation engine + chat bubbles + effects
function useBoardEngine(
  gameState: LudoGameState,
  myPlayerId: string,
  onSelectToken: (tokenIndex: number) => void,
  coordFn: (color: string, tokenId: number, stepCount: number, state: LudoToken['state']) => [number, number],
) {
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const validMoves = gameState.validMoves || [];

  const [animatedSteps, setAnimatedSteps] = useState<Record<string, number>>({});
  const displayedStepsRef = useRef<Record<string, number>>({});
  const targetStepsRef = useRef<Record<string, number>>({});
  const activeIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const captureTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [impactBurst, setImpactBurst] = useState<{ coord: [number, number]; id: number } | null>(null);
  const [isBoardShaking, setIsBoardShaking] = useState(false);
  const [finishCelebrate, setFinishCelebrate] = useState<{ color: LudoColor; id: number } | null>(null);

  const { chatMessages } = useGameStore();
  const [activeBaseChats, setActiveBaseChats] = useState<Record<string, ActiveBaseChat | null>>({});
  const lastProcessedChatIdRef = useRef<string | null>(null);
  const chatTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const gameStatePlayersRef = useRef(gameState.players);
  gameStatePlayersRef.current = gameState.players;

  const handleDismissChat = (color: string) => {
    if (chatTimeoutsRef.current[color]) {
      clearTimeout(chatTimeoutsRef.current[color]!);
      chatTimeoutsRef.current[color] = null;
    }
    setActiveBaseChats((prev) => ({ ...prev, [color]: null }));
  };

  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    const latestChat = chatMessages[chatMessages.length - 1];
    if (!latestChat) return;
    if (latestChat.id === lastProcessedChatIdRef.current) return;
    lastProcessedChatIdRef.current = latestChat.id;
    if (Date.now() - latestChat.timestamp > 5000) return;

    let targetColor: string | undefined;
    if (latestChat.color) {
      targetColor = latestChat.color;
    } else if (gameStatePlayersRef.current?.[latestChat.playerId]?.color) {
      targetColor = gameStatePlayersRef.current[latestChat.playerId].color;
    }
    if (!targetColor) return;

    const chatInfo: ActiveBaseChat = {
      id: latestChat.id,
      message: latestChat.message,
      nickname: latestChat.nickname,
      avatar: latestChat.avatar,
      timestamp: latestChat.timestamp,
    };
    if (chatTimeoutsRef.current[targetColor]) {
      clearTimeout(chatTimeoutsRef.current[targetColor]!);
      chatTimeoutsRef.current[targetColor] = null;
    }
    setActiveBaseChats((prev) => ({ ...prev, [targetColor!]: chatInfo }));
    chatTimeoutsRef.current[targetColor] = setTimeout(() => {
      setActiveBaseChats((prev) => ({ ...prev, [targetColor!]: null }));
      chatTimeoutsRef.current[targetColor] = null;
    }, 4000);
  }, [chatMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(activeIntervalsRef.current).forEach((t) => clearInterval(t));
      Object.values(captureTimeoutsRef.current).forEach((t) => clearTimeout(t));
      Object.values(chatTimeoutsRef.current).forEach((t) => { if (t) clearTimeout(t); });
    };
  }, []);

  // Token movement sync
  useEffect(() => {
    let maxWalkDuration = 0;
    Object.values(gameState.players).forEach((p) => {
      p.tokens.forEach((t) => {
        const k = `${p.playerId}_${t.id}`;
        const target = t.state === 'base' ? 0 : t.stepCount;
        const cur = displayedStepsRef.current[k] ?? target;
        if (target > cur) {
          maxWalkDuration = Math.max(maxWalkDuration, (target - cur) * 105);
        }
      });
    });

    Object.values(gameState.players).forEach((player) => {
      player.tokens.forEach((token) => {
        const key = `${player.playerId}_${token.id}`;
        const serverTarget = token.state === 'base' ? 0 : token.stepCount;
        const currentDisplayed = displayedStepsRef.current[key];

        if (currentDisplayed === undefined) {
          displayedStepsRef.current[key] = serverTarget;
          targetStepsRef.current[key] = serverTarget;
          setAnimatedSteps((prev) => ({ ...prev, [key]: serverTarget }));
          return;
        }

        if (serverTarget < currentDisplayed) {
          if (activeIntervalsRef.current[key]) {
            clearInterval(activeIntervalsRef.current[key]);
            delete activeIntervalsRef.current[key];
          }
          if (captureTimeoutsRef.current[key]) return;

          const isActualCapture = token.state === 'base' && currentDisplayed > 0;
          if (isActualCapture) {
            const capturedCoord = coordFn(player.color, token.id, currentDisplayed, 'track');
            targetStepsRef.current[key] = 0;
            const executeCaptureVisuals = () => {
              soundManager.playTokenCapture();
              setIsBoardShaking(true);
              setTimeout(() => setIsBoardShaking(false), 320);
              setImpactBurst({ coord: capturedCoord, id: Date.now() });
              setTimeout(() => setImpactBurst(null), 950);
              displayedStepsRef.current[key] = 0;
              targetStepsRef.current[key] = 0;
              setAnimatedSteps((prev) => ({ ...prev, [key]: 0 }));
              delete captureTimeoutsRef.current[key];
            };
            if (maxWalkDuration > 0) {
              captureTimeoutsRef.current[key] = setTimeout(executeCaptureVisuals, maxWalkDuration);
            } else {
              executeCaptureVisuals();
            }
            return;
          }

          displayedStepsRef.current[key] = serverTarget;
          targetStepsRef.current[key] = serverTarget;
          setAnimatedSteps((prev) => ({ ...prev, [key]: serverTarget }));
          return;
        }

        if (token.state === 'track' && token.stepCount === 1) {
          if (activeIntervalsRef.current[key]) {
            clearInterval(activeIntervalsRef.current[key]);
            delete activeIntervalsRef.current[key];
          }
          if (captureTimeoutsRef.current[key]) {
            clearTimeout(captureTimeoutsRef.current[key]);
            delete captureTimeoutsRef.current[key];
          }
          if (displayedStepsRef.current[key] !== 1) {
            displayedStepsRef.current[key] = 1;
            targetStepsRef.current[key] = 1;
            setAnimatedSteps((prev) => ({ ...prev, [key]: 1 }));
            soundManager.playTokenMove();
          }
          return;
        }

        const prevTarget = targetStepsRef.current[key] ?? currentDisplayed;
        if (serverTarget > prevTarget) {
          targetStepsRef.current[key] = serverTarget;
          if (!activeIntervalsRef.current[key]) {
            activeIntervalsRef.current[key] = setInterval(() => {
              const cur = displayedStepsRef.current[key] ?? 0;
              const target = targetStepsRef.current[key] ?? cur;
              if (cur < target) {
                const next = cur + 1;
                displayedStepsRef.current[key] = next;
                setAnimatedSteps((prev) => ({ ...prev, [key]: next }));
                soundManager.playTokenMove();
                if (next >= target) {
                  clearInterval(activeIntervalsRef.current[key]);
                  delete activeIntervalsRef.current[key];
                  if (next === 57 || next === 83 || token.state === 'finished') {
                    soundManager.playTokenFinish();
                    setFinishCelebrate({ color: player.color, id: Date.now() });
                    setTimeout(() => setFinishCelebrate(null), 2500);
                  }
                }
              } else {
                clearInterval(activeIntervalsRef.current[key]);
                delete activeIntervalsRef.current[key];
              }
            }, 105);
          }
        }
      });
    });
  }, [gameState]);

  // Finish step for this layout
  const finishStep = gameState.boardLayout === 'square' ? 57 : 83;

  const tokensOnBoard: BoardLogicResult['tokensOnBoard'] = [];
  Object.values(gameState.players).forEach((player) => {
    player.tokens.forEach((token) => {
      const key = `${player.playerId}_${token.id}`;
      const serverStep = token.state === 'base' ? 0 : token.stepCount;
      const animStep = animatedSteps[key];
      const isAwaitingCaptureArrival = captureTimeoutsRef.current[key] !== undefined;
      const currentStep = isAwaitingCaptureArrival
        ? (animStep ?? serverStep)
        : (token.state === 'base' ? 0 : (animStep ?? serverStep));
      const effectiveState = (isAwaitingCaptureArrival && currentStep > 0) ? 'track' : token.state;
      const [y, x] = coordFn(player.color, token.id, currentStep, effectiveState);
      const isValid = isMyTurn && player.playerId === myPlayerId && validMoves.includes(token.id);
      tokensOnBoard.push({ token, player, y, x, isValid });
    });
  });

  const handleTokenClick = (tokenIndex: number) => {
    if (!isMyTurn || !validMoves.includes(tokenIndex)) return;
    soundManager.playTokenMove();
    onSelectToken(tokenIndex);
  };

  return {
    isMyTurn, myPlayer, validMoves, myColor: (myPlayer?.color || 'red') as LudoColor,
    tokensOnBoard, handleTokenClick, impactBurst, isBoardShaking, finishCelebrate,
    activeBaseChats, handleDismissChat, finishStep,
  };
}

// ============================================================================
// 4. HEX BOARD RENDERER (2/3/5/6 players)
// ============================================================================

const LudoHexBoard: React.FC<LudoBoardProps> = ({ gameState, myPlayerId, onSelectToken }) => {
  const engine = useBoardEngine(gameState, myPlayerId, onSelectToken, (color, tokenId, step, state) =>
    getTokenCoordinate(color as LudoColor, tokenId, step, state),
  );
  const [povMode, setPovMode] = useState<'player' | 'global'>('player');
  const boardRotationDeg = povMode === 'player' ? HEX_ROTATION_BY_COLOR[engine.myColor] : 0;

  const { tokensOnBoard, handleTokenClick, impactBurst, isBoardShaking, finishCelebrate, activeBaseChats, handleDismissChat } = engine;

  const centerHexVertices: [number, number][] = HEX_COLORS.map((_, k) => {
    const rad = degToRad(60 + k * 60);
    return [CENTER + R_CENTER * Math.cos(rad), CENTER + R_CENTER * Math.sin(rad)];
  });

  const outerHexPoints = Array.from({ length: 6 })
    .map((_, k) => {
      const rad = degToRad(k * 60);
      return `${CENTER + 480 * Math.cos(rad)},${CENTER + 480 * Math.sin(rad)}`;
    })
    .join(' ');

  const playerByColor = {} as Partial<Record<LudoColor, LudoPlayerView>>;
  Object.values(gameState.players).forEach((p) => { playerByColor[p.color] = p; });

  return (
    <motion.div
      animate={isBoardShaking ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -3, 2, -2, 0] } : { x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative w-full max-w-[500px] sm:max-w-[580px] aspect-square bg-[#0c121e] border-[5px] border-slate-700/80 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 sm:p-3 select-none touch-manipulation overflow-hidden"
    >
      {/* POV Badge */}
      <div className="absolute top-3 right-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setPovMode((prev) => (prev === 'player' ? 'global' : 'player'))}
          className="px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 hover:border-amber-400 text-[10px] font-mono font-bold text-slate-200 hover:text-amber-300 flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Ubah Sudut Pandang Kamera Ludo"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>POV: {povMode === 'player' ? `${engine.myColor.toUpperCase()} (BAWAH)` : 'GLOBAL'}</span>
        </button>
      </div>

      {/* Rotatable wrapper */}
      <div className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${boardRotationDeg}deg)` }}>

        <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-2xl">
          <defs>
            <radialGradient id="hexBoardBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          <polygon points={outerHexPoints} fill="url(#hexBoardBg)" stroke="#475569" strokeWidth="8" strokeLinejoin="round" />

          {/* 6 radial arms */}
          {HEX_COLORS.map((color, k) => {
            const palette = COLOR_HEX[color];
            const rot = k * 60;
            return (
              <g key={`arm_${color}`} transform={`rotate(${rot} 500 500)`}>
                {([-1, 0, 1] as const).map((lane) =>
                  [0, 1, 2, 3, 4, 5].map((row) => {
                    const laneOffset = lane * CELL_W;
                    const cellX = 500 + 0.5 * CELL_W - laneOffset - CELL_W / 2;
                    const cellY = CENTER + A_CENTER + row * CELL_H;
                    const isStartTile = lane === 1 && row === 4;
                    const isHomeStretch = lane === 0 && row >= 0 && row <= 4;
                    const isEntryArrow = lane === 0 && row === 5;
                    const isSafeStar = lane === -1 && row === 3;
                    const fill = isStartTile || isHomeStretch ? palette.main : '#ffffff';
                    return (
                      <g key={`cell_${color}_${lane}_${row}`}>
                        <rect x={cellX} y={cellY} width={CELL_W} height={CELL_H} fill={fill} stroke="#cbd5e1" strokeWidth="1.6" />
                        {isStartTile && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2}) rotate(${-rot - boardRotationDeg})`}>
                            <polygon points="0,-13 3.8,-4.5 13,-4.5 5.6,1.2 8.2,10.5 0,5.2 -8.2,10.5 -5.6,1.2 -13,-4.5 -3.8,-4.5" fill="#ffffff" opacity="0.95" />
                          </g>
                        )}
                        {isSafeStar && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2}) rotate(${-rot - boardRotationDeg})`}>
                            <polygon points="0,-12 3.5,-4.2 12,-4.2 5.2,1.1 7.6,9.8 0,4.8 -7.6,9.8 -5.2,1.1 -12,-4.2 -3.5,-4.2" fill="#94a3b8" />
                          </g>
                        )}
                        {isEntryArrow && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2})`}>
                            <path d="M -10 5 L 0 -8 L 10 5" fill="none" stroke={palette.main} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        )}
                      </g>
                    );
                  })
                )}
              </g>
            );
          })}

          {/* Center hexagon triangles */}
          {HEX_COLORS.map((color, k) => {
            const v1 = centerHexVertices[k];
            const v2 = centerHexVertices[(k + 1) % 6];
            return (
              <polygon key={`tri_${color}`}
                points={`${CENTER},${CENTER} ${v1[0]},${v1[1]} ${v2[0]},${v2[1]}`}
                fill={COLOR_HEX[color].main} stroke="#f8fafc" strokeWidth="2.5" />
            );
          })}

          {/* 6 bases */}
          {HEX_COLORS.map((color) => {
            const [cy, cx] = BASE_CENTERS[color];
            const palette = COLOR_HEX[color];
            const occupant = playerByColor[color];
            const isCurrentTurnBase = occupant && gameState.currentTurnPlayerId === occupant.playerId;
            return (
              <g key={`base_${color}`}>
                {isCurrentTurnBase && (
                  <circle cx={cx} cy={cy} r={BASE_RADIUS + 8} fill="none" stroke="#fbbf24" strokeWidth="5" strokeDasharray="12 6" />
                )}
                <circle cx={cx} cy={cy} r={BASE_RADIUS} fill={palette.main} stroke="#f8fafc" strokeWidth="3.5" opacity={occupant ? 1 : 0.45} />
                <circle cx={cx} cy={cy} r={BASE_INNER_RADIUS} fill="#ffffff" stroke={palette.border} strokeWidth="2" />
                {BASE_SLOTS[color].map(([sy, sx], idx) => (
                  <circle key={`slot_${color}_${idx}`} cx={sx} cy={sy} r={16} fill={palette.slotBg} stroke={palette.main} strokeWidth="2" opacity={occupant ? 1 : 0.5} />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Center Crown */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-950/90 backdrop-blur-sm border-2 border-amber-300 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.9)] pointer-events-none"
          style={{ transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)` }}>
          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300 animate-pulse" />
        </div>

        {/* Overlays: name tags, base buttons, chat */}
        <div className="absolute inset-0 pointer-events-none">
          {HEX_COLORS.map((color) => {
            const [cy, cx] = BASE_CENTERS[color];
            const occupant = playerByColor[color];
            return (
              <React.Fragment key={`overlay_${color}`}>
                {occupant && (
                  <div className="absolute z-10 pointer-events-none transition-transform duration-700"
                    style={{
                      left: `${(cx / 1000) * 100}%`,
                      top: `${((cy + BASE_RADIUS + 14) / 1000) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)`,
                    }}>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-[8px] sm:text-[9px] font-black text-white whitespace-nowrap shadow-md">
                      {occupant.nickname}
                    </span>
                  </div>
                )}
                {engine.myColor === color && engine.isMyTurn && engine.validMoves.length > 0 &&
                  BASE_SLOTS[color].map(([sy, sx], i) => {
                    const isTokenValid = engine.validMoves.includes(i) && engine.myPlayer?.tokens[i]?.state === 'base';
                    if (!isTokenValid) return null;
                    return (
                      <button key={`base_btn_${color}_${i}`} type="button" onClick={() => handleTokenClick(i)}
                        style={{ left: `${(sx / 1000) * 100}%`, top: `${(sy / 1000) * 100}%`, transform: 'translate(-50%, -50%)' }}
                        className="absolute z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.95)] pointer-events-auto cursor-pointer active:scale-95"
                        title={`Keluarkan Bidak #${i + 1}`} />
                    );
                  })}
                <div className="absolute z-40 pointer-events-none"
                  style={{ left: `${(cx / 1000) * 100}%`, top: `${(cy / 1000) * 100}%`, transform: 'translate(-50%, -50%)' }}>
                  <BaseSpeechBubble chat={activeBaseChats[color] || null} color={color} boardRotationDeg={boardRotationDeg} onDismiss={() => handleDismissChat(color)} />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Tokens */}
        <div className="absolute inset-0 pointer-events-none">
          {(() => {
            const occupancy: Record<string, number> = {};
            tokensOnBoard.forEach((item) => {
              const k = `${item.y.toFixed(1)}_${item.x.toFixed(1)}`;
              occupancy[k] = (occupancy[k] || 0) + 1;
            });
            const counters: Record<string, number> = {};
            return tokensOnBoard.map((item) => {
              const { token, player, y, x, isValid } = item;
              const k = `${y.toFixed(1)}_${x.toFixed(1)}`;
              const totalOnTile = occupancy[k] || 1;
              const indexOnTile = counters[k] || 0;
              counters[k] = indexOnTile + 1;
              let offsetX = 0;
              let offsetY = 0;
              if (totalOnTile > 1 && token.state !== 'base') {
                const angle = (indexOnTile / totalOnTile) * Math.PI * 2;
                offsetX = Math.cos(angle) * 1.1;
                offsetY = Math.sin(angle) * 1.1;
              }
              return (
                <motion.div
                  key={`${player.playerId}_${token.id}`}
                  animate={{ left: `${(x / 1000) * 100 + offsetX}%`, top: `${(y / 1000) * 100 + offsetY}%`, x: '-50%', y: '-50%', scale: isValid ? [1, 1.14, 1] : 1 }}
                  transition={{ left: { type: 'spring', stiffness: 450, damping: 28 }, top: { type: 'spring', stiffness: 450, damping: 28 }, x: { duration: 0 }, y: { duration: 0 }, scale: isValid ? { repeat: Infinity, duration: 0.85 } : undefined }}
                  className="absolute z-20 pointer-events-auto cursor-pointer"
                >
                  <button type="button" disabled={!isValid} onClick={() => handleTokenClick(token.id)}
                    className={`relative flex items-center justify-center p-0.5 focus:outline-none ${isValid ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}>
                    {isValid && <span className="absolute -inset-1 rounded-full bg-amber-400/35 border-2 border-amber-400 animate-ping pointer-events-none" />}
                    {isValid && <span className="absolute -inset-1 rounded-full border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse pointer-events-none" />}
                    <div className="transition-transform duration-700" style={{ transform: `rotate(${-boardRotationDeg}deg)` }}>
                      <HDTokenPawn color={player.color} isValid={isValid} />
                    </div>
                  </button>
                </motion.div>
              );
            });
          })()}

          {impactBurst && (
            <motion.div key={impactBurst.id}
              initial={{ scale: 0.25, opacity: 1, x: '-50%', y: '-50%' }}
              animate={{ scale: [0.25, 1.4, 1.15], opacity: [1, 1, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ left: `${(impactBurst.coord[1] / 1000) * 100}%`, top: `${(impactBurst.coord[0] / 1000) * 100}%` }}
              className="absolute z-40 pointer-events-none flex flex-col items-center justify-center select-none">
              <div className="relative flex items-center justify-center" style={{ transform: `rotate(${-boardRotationDeg}deg)` }}>
                <span className="absolute w-16 h-16 rounded-full border-4 border-rose-500 bg-rose-500/35 animate-ping" />
                <span className="absolute w-11 h-11 rounded-full border-2 border-amber-300 bg-amber-400/30 animate-pulse" />
                <span className="relative text-3xl sm:text-4xl filter drop-shadow-[0_0_16px_rgba(239,68,68,1)]">💥</span>
                <span className="absolute -top-4 font-black text-[10px] tracking-widest text-amber-200 uppercase bg-gradient-to-r from-rose-600 to-amber-600 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xl whitespace-nowrap">BONK! PULANG!</span>
              </div>
            </motion.div>
          )}

          {finishCelebrate && (
            <motion.div key={finishCelebrate.id}
              initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 2.3, ease: 'easeOut' }}
              style={{ left: '50%', top: '50%' }}
              className="absolute z-40 pointer-events-none flex flex-col items-center justify-center select-none">
              <div className="relative flex flex-col items-center justify-center">
                <span className="absolute w-24 h-24 rounded-full border-4 border-amber-400 bg-amber-400/25 animate-ping" />
                <Sparkles className="w-12 h-12 text-amber-300 fill-amber-300 animate-spin filter drop-shadow-[0_0_20px_rgba(251,191,36,1)]" />
                <span className="mt-1 font-black text-[11px] sm:text-xs text-amber-300 uppercase bg-slate-950/95 px-2.5 py-1 rounded-full border-2 border-amber-400 shadow-2xl tracking-wider animate-bounce">GOAL! HOME! 🎉</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// 5. SQUARE BOARD RENDERER (4 players)
// ============================================================================

const SQ_COLOR_CSS: Record<string, { main: string; light: string; border: string; slotBg: string }> = {
  red:    { main: '#dc2626', light: '#fef2f2', border: '#fecaca', slotBg: '#fee2e2' },
  blue:   { main: '#0070f3', light: '#f0f9ff', border: '#bae6fd', slotBg: '#dbeafe' },
  green:  { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', slotBg: '#dcfce7' },
  yellow: { main: '#eab308', light: '#fefce8', border: '#fef08a', slotBg: '#fef9c3' },
};

// Center zone cells (col,row) that form the diamond/arrow pointing to center
const SQ_CENTER_CELLS: [number,number][] = [
  [7,6],[7,8],[6,7],[8,7], // 4 arms entry adjacent to center
];

const LudoSquareBoard: React.FC<LudoBoardProps> = ({ gameState, myPlayerId, onSelectToken }) => {
  const engine = useBoardEngine(gameState, myPlayerId, onSelectToken, (color, tokenId, step, state) =>
    getTokenCoordinateSquare(color, tokenId, step, state),
  );
  const [povMode, setPovMode] = useState<'player' | 'global'>('player');
  const myColorStr = engine.myColor as string;
  const boardRotationDeg = povMode === 'player' ? (SQ_ROTATION_BY_COLOR[myColorStr] ?? 0) : 0;

  const { tokensOnBoard, handleTokenClick, impactBurst, isBoardShaking, finishCelebrate, activeBaseChats, handleDismissChat } = engine;

  const playerByColor = {} as Record<string, LudoPlayerView>;
  Object.values(gameState.players).forEach((p) => { playerByColor[p.color] = p; });

  // Build a set of track cell (col,row) for fast lookup
  const trackSet = new Set(SQ_TRACK_COORDS_FINAL.map(([y, x]) => {
    // reverse to (col,row) for lookup — approximate from y/x
    const col = Math.round((x - SQ_GRID_OFFSET - SQ_CELL / 2) / SQ_CELL);
    const row = Math.round((y - SQ_GRID_OFFSET - SQ_CELL / 2) / SQ_CELL);
    return `${col},${row}`;
  }));

  return (
    <motion.div
      animate={isBoardShaking ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -3, 2, -2, 0] } : { x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative w-full max-w-[500px] sm:max-w-[560px] aspect-square bg-[#0c121e] border-[5px] border-slate-700/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-1.5 sm:p-2 select-none touch-manipulation overflow-hidden"
    >
      {/* POV Badge */}
      <div className="absolute top-3 right-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setPovMode((prev) => (prev === 'player' ? 'global' : 'player'))}
          className="px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 hover:border-amber-400 text-[10px] font-mono font-bold text-slate-200 hover:text-amber-300 flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Ubah Sudut Pandang"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>POV: {povMode === 'player' ? `${myColorStr.toUpperCase()} (BAWAH)` : 'GLOBAL'}</span>
        </button>
      </div>

      {/* Rotatable wrapper */}
      <div
        className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${boardRotationDeg}deg)` }}
      >
        {/* SVG 15×15 Grid Board */}
        <svg viewBox="0 0 1000 1000" className="w-full h-full">
          <defs>
            <radialGradient id="sqBoardBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Board background */}
          <rect x="20" y="20" width="960" height="960" rx="12" fill="url(#sqBoardBg)" stroke="#475569" strokeWidth="6" />

          {/* Render all 15×15 cells */}
          {Array.from({ length: 15 }, (_, row) =>
            Array.from({ length: 15 }, (_, col) => {
              const [cellY, cellX] = sqCell(col, row);
              const cx = cellX - SQ_CELL / 2;
              const cy = cellY - SQ_CELL / 2;

              // Determine cell type
              const isYardRed    = row >= 9 && row <= 13 && col >= 9 && col <= 13;
              const isYardBlue   = row >= 1 && row <= 5  && col >= 1 && col <= 5;
              const isYardGreen  = row >= 1 && row <= 5  && col >= 9 && col <= 13;
              const isYardYellow = row >= 9 && row <= 13 && col >= 1 && col <= 5;

              const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
              const isCenterExact = row === 7 && col === 7;

              const isHomeLane = (
                (SQ_HOME_LANE_CELLS['red'].some(([c,r]) => c === col && r === row)) ||
                (SQ_HOME_LANE_CELLS['blue'].some(([c,r]) => c === col && r === row)) ||
                (SQ_HOME_LANE_CELLS['green'].some(([c,r]) => c === col && r === row)) ||
                (SQ_HOME_LANE_CELLS['yellow'].some(([c,r]) => c === col && r === row))
              );

              const homeLaneColor = isHomeLane
                ? SQ_HOME_LANE_CELLS['red'].some(([c,r]) => c === col && r === row)   ? 'red'
                : SQ_HOME_LANE_CELLS['blue'].some(([c,r]) => c === col && r === row)  ? 'blue'
                : SQ_HOME_LANE_CELLS['green'].some(([c,r]) => c === col && r === row) ? 'green'
                : 'yellow'
                : null;

              const isStartTile = Object.entries(SQ_START_TILES_GRID).some(([, [sc, sr]]) => sc === col && sr === row);
              const startTileColor = isStartTile
                ? Object.entries(SQ_START_TILES_GRID).find(([, [sc, sr]]) => sc === col && sr === row)?.[0] ?? null
                : null;

              const isStarTile = SQ_STAR_TILES_GRID.some(([sc, sr]) => sc === col && sr === row);

              // Skip center 3×3 (drawn separately)
              if (isCenter && !isCenterExact && row !== 7 && col !== 7) {
                // The center zone — draw colored triangles inside SVG instead
              }

              // Yard cells
              if (isYardRed || isYardBlue || isYardGreen || isYardYellow) {
                const yardColor = isYardRed ? 'red' : isYardBlue ? 'blue' : isYardGreen ? 'green' : 'yellow';
                const palette = SQ_COLOR_CSS[yardColor];
                // Inner slots (3×3) — skip corners
                const isInnerSlot = row >= (isYardBlue||isYardGreen ? 2 : 10) && row <= (isYardBlue||isYardGreen ? 4 : 12)
                  && col >= (isYardRed||isYardGreen ? 10 : 2) && col <= (isYardRed||isYardGreen ? 12 : 4);
                return (
                  <rect key={`cell_${col}_${row}`} x={cx} y={cy} width={SQ_CELL} height={SQ_CELL}
                    fill={palette.main} stroke="#f8fafc" strokeWidth="1" opacity={0.9} />
                );
              }

              // Track cells
              const isTrackCell = trackSet.has(`${col},${row}`);
              let fill = '#ffffff';
              if (homeLaneColor) fill = SQ_COLOR_CSS[homeLaneColor]?.main ?? fill;
              if (startTileColor) fill = SQ_COLOR_CSS[startTileColor]?.main ?? fill;

              return (
                <g key={`cell_${col}_${row}`}>
                  <rect x={cx} y={cy} width={SQ_CELL} height={SQ_CELL}
                    fill={fill}
                    stroke={isCenter ? 'none' : '#cbd5e1'}
                    strokeWidth="1.5"
                    opacity={isCenter && !homeLaneColor ? 0 : 1}
                  />
                  {/* Star tile marker */}
                  {isStarTile && (
                    <g transform={`translate(${cellX}, ${cellY}) rotate(${-boardRotationDeg})`}>
                      <polygon points="0,-14 4,-5 14,-5 6,1.5 9,12 0,6 -9,12 -6,1.5 -14,-5 -4,-5"
                        fill="#94a3b8" />
                    </g>
                  )}
                  {/* Start tile star */}
                  {isStartTile && startTileColor && (
                    <g transform={`translate(${cellX}, ${cellY}) rotate(${-boardRotationDeg})`}>
                      <polygon points="0,-13 3.8,-4.5 13,-4.5 5.6,1.2 8.2,10.5 0,5.2 -8.2,10.5 -5.6,1.2 -13,-4.5 -3.8,-4.5"
                        fill="#ffffff" opacity="0.9" />
                    </g>
                  )}
                </g>
              );
            })
          )}

          {/* Center diamond — 4 colored triangles meeting at (7,7) */}
          {(['red','blue','green','yellow'] as const).map((color) => {
            const [ccy, ccx] = sqCell(7, 7);
            const palette = SQ_COLOR_CSS[color];
            // Triangle vertices: center + two adjacent home-lane entry cells
            const entries: Record<string, [[number,number],[number,number]]> = {
              red:    [sqCell(8,7), sqCell(8,7)], // right → (8,7)
              blue:   [sqCell(6,7), sqCell(6,7)], // left  → (6,7)
              green:  [sqCell(7,6), sqCell(7,6)], // top   → (7,6)
              yellow: [sqCell(7,8), sqCell(7,8)], // bot   → (7,8)
            };
            const [a] = entries[color];
            const [ey, ex] = a;
            // Build a slim triangle from center to the entry cell face
            const hw = SQ_CELL * 0.42;
            const isHoriz = color === 'red' || color === 'blue';
            const p1x = isHoriz ? ccx : ccx - hw;
            const p1y = isHoriz ? ccy - hw : ccy;
            const p2x = isHoriz ? ccx : ccx + hw;
            const p2y = isHoriz ? ccy + hw : ccy;
            return (
              <polygon key={`ctri_${color}`}
                points={`${ccx},${ccy} ${p1x},${p1y} ${ex},${ey} ${p2x},${p2y}`}
                fill={palette.main} stroke="#f8fafc" strokeWidth="1.5" />
            );
          })}

          {/* Yard inner white circles */}
          {SQ_COLORS.map((color) => {
            const [cy, cx] = SQ_BASE_CENTERS[color];
            const palette = SQ_COLOR_CSS[color];
            const occupant = playerByColor[color];
            const isCurrentTurn = occupant && gameState.currentTurnPlayerId === occupant.playerId;
            return (
              <g key={`yard_${color}`}>
                {isCurrentTurn && (
                  <circle cx={cx} cy={cy} r={105} fill="none" stroke="#fbbf24" strokeWidth="5" strokeDasharray="14 7" />
                )}
                <circle cx={cx} cy={cy} r={92} fill={palette.main} stroke="#f8fafc" strokeWidth="3" opacity={occupant ? 1 : 0.5} />
                <circle cx={cx} cy={cy} r={70} fill="white" stroke={palette.border} strokeWidth="2" />
                {SQ_BASE_SLOTS[color].map(([sy, sx], i) => (
                  <circle key={i} cx={sx} cy={sy} r={22} fill={palette.slotBg} stroke={palette.main} strokeWidth="2" opacity={occupant ? 1 : 0.5} />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Center Crown badge */}
        <div
          className="absolute left-1/2 top-1/2 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-950/90 backdrop-blur-sm border-2 border-amber-300 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.9)] pointer-events-none"
          style={{ transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)` }}
        >
          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300 animate-pulse" />
        </div>

        {/* HTML Overlays: name tags, base buttons, chat */}
        <div className="absolute inset-0 pointer-events-none">
          {SQ_COLORS.map((color) => {
            const [cy, cx] = SQ_BASE_CENTERS[color];
            const occupant = playerByColor[color];
            return (
              <React.Fragment key={`sqoverlay_${color}`}>
                {occupant && (
                  <div
                    className="absolute z-10 pointer-events-none transition-transform duration-700"
                    style={{
                      left: `${(cx / 1000) * 100}%`,
                      top: `${((cy + 108) / 1000) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)`,
                    }}
                  >
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-[8px] sm:text-[9px] font-black text-white whitespace-nowrap shadow-md">
                      {occupant.nickname}
                    </span>
                  </div>
                )}

                {/* Clickable base slots for local player */}
                {engine.myColor === color && engine.isMyTurn &&
                  SQ_BASE_SLOTS[color].map(([sy, sx], i) => {
                    const isTokenValid = engine.validMoves.includes(i) && engine.myPlayer?.tokens[i]?.state === 'base';
                    if (!isTokenValid) return null;
                    return (
                      <button
                        key={`sq_base_btn_${color}_${i}`}
                        type="button"
                        onClick={() => handleTokenClick(i)}
                        style={{ left: `${(sx / 1000) * 100}%`, top: `${(sy / 1000) * 100}%`, transform: 'translate(-50%, -50%)' }}
                        className="absolute z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.95)] pointer-events-auto cursor-pointer active:scale-95"
                        title={`Keluarkan Bidak #${i + 1}`}
                      />
                    );
                  })}

                {/* Speech bubble */}
                <div
                  className="absolute z-40 pointer-events-none"
                  style={{ left: `${(cx / 1000) * 100}%`, top: `${(cy / 1000) * 100}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <BaseSpeechBubble
                    chat={activeBaseChats[color] || null}
                    color={color as LudoColor}
                    boardRotationDeg={boardRotationDeg}
                    onDismiss={() => handleDismissChat(color)}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Tokens overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {(() => {
            const occupancy: Record<string, number> = {};
            tokensOnBoard.forEach((item) => {
              const k = `${item.y.toFixed(1)}_${item.x.toFixed(1)}`;
              occupancy[k] = (occupancy[k] || 0) + 1;
            });
            const counters: Record<string, number> = {};
            return tokensOnBoard.map((item) => {
              const { token, player, y, x, isValid } = item;
              const k = `${y.toFixed(1)}_${x.toFixed(1)}`;
              const totalOnTile = occupancy[k] || 1;
              const indexOnTile = counters[k] || 0;
              counters[k] = indexOnTile + 1;
              let offsetX = 0;
              let offsetY = 0;
              if (totalOnTile > 1 && token.state !== 'base') {
                const angle = (indexOnTile / totalOnTile) * Math.PI * 2;
                offsetX = Math.cos(angle) * 1.4;
                offsetY = Math.sin(angle) * 1.4;
              }
              return (
                <motion.div
                  key={`${player.playerId}_${token.id}`}
                  animate={{
                    left: `${(x / 1000) * 100 + offsetX}%`,
                    top: `${(y / 1000) * 100 + offsetY}%`,
                    x: '-50%', y: '-50%',
                    scale: isValid ? [1, 1.14, 1] : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 450, damping: 28 },
                    top: { type: 'spring', stiffness: 450, damping: 28 },
                    x: { duration: 0 }, y: { duration: 0 },
                    scale: isValid ? { repeat: Infinity, duration: 0.85 } : undefined,
                  }}
                  className="absolute z-20 pointer-events-auto cursor-pointer"
                >
                  <button
                    type="button"
                    disabled={!isValid}
                    onClick={() => handleTokenClick(token.id)}
                    className={`relative flex items-center justify-center p-0.5 focus:outline-none ${isValid ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                    title={`${player.nickname} Bidak #${token.id + 1}`}
                  >
                    {isValid && <span className="absolute -inset-1 rounded-full bg-amber-400/35 border-2 border-amber-400 animate-ping pointer-events-none" />}
                    {isValid && <span className="absolute -inset-1 rounded-full border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse pointer-events-none" />}
                    <div className="transition-transform duration-700" style={{ transform: `rotate(${-boardRotationDeg}deg)` }}>
                      <HDTokenPawn color={player.color} isValid={isValid} />
                    </div>
                  </button>
                </motion.div>
              );
            });
          })()}

          {/* Impact burst */}
          {impactBurst && (
            <motion.div
              key={impactBurst.id}
              initial={{ scale: 0.25, opacity: 1, x: '-50%', y: '-50%' }}
              animate={{ scale: [0.25, 1.4, 1.15], opacity: [1, 1, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ left: `${(impactBurst.coord[1] / 1000) * 100}%`, top: `${(impactBurst.coord[0] / 1000) * 100}%` }}
              className="absolute z-40 pointer-events-none flex items-center justify-center select-none"
            >
              <div className="relative flex items-center justify-center" style={{ transform: `rotate(${-boardRotationDeg}deg)` }}>
                <span className="absolute w-16 h-16 rounded-full border-4 border-rose-500 bg-rose-500/35 animate-ping" />
                <span className="relative text-3xl filter drop-shadow-[0_0_16px_rgba(239,68,68,1)]">💥</span>
                <span className="absolute -top-4 font-black text-[10px] tracking-widest text-amber-200 uppercase bg-gradient-to-r from-rose-600 to-amber-600 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xl whitespace-nowrap">BONK! PULANG!</span>
              </div>
            </motion.div>
          )}

          {/* Finish celebrate */}
          {finishCelebrate && (
            <motion.div
              key={finishCelebrate.id}
              initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 2.3, ease: 'easeOut' }}
              style={{ left: '50%', top: '50%' }}
              className="absolute z-40 pointer-events-none flex flex-col items-center justify-center select-none"
            >
              <div className="relative flex flex-col items-center justify-center">
                <span className="absolute w-24 h-24 rounded-full border-4 border-amber-400 bg-amber-400/25 animate-ping" />
                <Sparkles className="w-12 h-12 text-amber-300 fill-amber-300 animate-spin filter drop-shadow-[0_0_20px_rgba(251,191,36,1)]" />
                <span className="mt-1 font-black text-[11px] sm:text-xs text-amber-300 uppercase bg-slate-950/95 px-2.5 py-1 rounded-full border-2 border-amber-400 shadow-2xl tracking-wider animate-bounce">
                  GOAL! HOME! 🎉
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// 6. MAIN EXPORT — dispatches to square or hex board based on boardLayout
// ============================================================================

export const LudoBoard: React.FC<LudoBoardProps> = (props) => {
  const isSquare = props.gameState.boardLayout === 'square';
  return isSquare
    ? <LudoSquareBoard {...props} />
    : <LudoHexBoard {...props} />;
};
