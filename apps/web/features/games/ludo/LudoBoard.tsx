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
// 1. 6-PLAYER HEXAGONAL BOARD GEOMETRY (1000 x 1000 SVG Space)
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
// lane: +1 = clockwise-leading (incoming), 0 = center (home stretch), -1 = outgoing
// row: 0 (innermost, adjacent to center hexagon) .. 5 (outermost tip)
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
    // +0..+4: Arm k incoming lane (+1), rows 4 down to 0
    coords.push(getArmCellCenter(k, 1, 4)); // k*13 + 0: Start Tile of color k
    coords.push(getArmCellCenter(k, 1, 3)); // +1
    coords.push(getArmCellCenter(k, 1, 2)); // +2
    coords.push(getArmCellCenter(k, 1, 1)); // +3
    coords.push(getArmCellCenter(k, 1, 0)); // +4
    // +5..+10: Arm nextK outgoing lane (-1), rows 0 up to 5
    coords.push(getArmCellCenter(nextK, -1, 0)); // +5
    coords.push(getArmCellCenter(nextK, -1, 1)); // +6
    coords.push(getArmCellCenter(nextK, -1, 2)); // +7
    coords.push(getArmCellCenter(nextK, -1, 3)); // +8: Safe Star Tile
    coords.push(getArmCellCenter(nextK, -1, 4)); // +9
    coords.push(getArmCellCenter(nextK, -1, 5)); // +10
    // +11..+12: Arm nextK tip
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
  red: {
    headGradStart: '#fee2e2',
    headGradMid: '#ef4444',
    headGradEnd: '#b91c1c',
    bodyGradStart: '#f87171',
    bodyGradMid: '#dc2626',
    bodyGradEnd: '#7f1d1d',
    rimShadow: '#450a0a',
  },
  blue: {
    headGradStart: '#e0f2fe',
    headGradMid: '#0ea5e9',
    headGradEnd: '#0369a1',
    bodyGradStart: '#38bdf8',
    bodyGradMid: '#0284c7',
    bodyGradEnd: '#0c4a6e',
    rimShadow: '#082f49',
  },
  purple: {
    headGradStart: '#f3e8ff',
    headGradMid: '#a855f7',
    headGradEnd: '#7e22ce',
    bodyGradStart: '#c084fc',
    bodyGradMid: '#9333ea',
    bodyGradEnd: '#581c87',
    rimShadow: '#3b0764',
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
  orange: {
    headGradStart: '#ffedd5',
    headGradMid: '#fb923c',
    headGradEnd: '#c2410c',
    bodyGradStart: '#fdba74',
    bodyGradMid: '#ea580c',
    bodyGradEnd: '#7c2d12',
    rimShadow: '#431407',
  },
};

const HDTokenPawn: React.FC<HDTokenProps> = ({ color, isValid, stackCount }) => {
  const conf = TOKEN_COLOR_CONFIG[color];
  const uniqueId = `pawn_grad_${color}`;

  return (
    <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 flex items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 44 54"
        className={`w-full h-full filter ${
          isValid
            ? 'drop-shadow-[0_0_8px_rgba(250,204,21,1)] scale-105'
            : 'drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]'
        } transition-transform duration-200`}
      >
        <defs>
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

        <ellipse cx="22" cy="49" rx="15" ry="4.5" fill="rgba(0,0,0,0.4)" />

        <path
          d="M 14 26 C 11 33, 7 40, 8 45 C 8.5 48, 35.5 48, 36 45 C 37 40, 33 33, 30 26 Z"
          fill={`url(#${uniqueId}_body)`}
        />

        <ellipse
          cx="22"
          cy="45.5"
          rx="13.5"
          ry="2.5"
          fill={`url(#${uniqueId}_rim)`}
          opacity="0.85"
        />

        <path
          d="M 13 30 C 11 36, 11 41, 13 44"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.75"
          fill="none"
        />

        <ellipse
          cx="22"
          cy="26"
          rx="7"
          ry="2"
          fill={conf.bodyGradStart}
          stroke={conf.headGradEnd}
          strokeWidth="0.8"
        />

        <circle
          cx="22"
          cy="15"
          r="9.5"
          fill={`url(#${uniqueId}_head)`}
        />

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

      {stackCount && stackCount > 1 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-950/90 text-white font-mono font-black text-[9px] border border-amber-400 shadow-md">
          {stackCount}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 2b. BASE SPEECH BUBBLE COMPONENT (Pops up at base, always upright)
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
    red: { border: 'border-red-500', text: 'text-red-400', glow: 'shadow-red-500/40', tailBorder: 'border-red-500' },
    blue: { border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/40', tailBorder: 'border-blue-500' },
    purple: { border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/40', tailBorder: 'border-purple-500' },
    green: { border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/40', tailBorder: 'border-emerald-500' },
    yellow: { border: 'border-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/40', tailBorder: 'border-yellow-400' },
    orange: { border: 'border-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/40', tailBorder: 'border-orange-500' },
  };

  const style = colorStyles[color] || colorStyles.red;

  return (
    <div className="flex items-center justify-center pointer-events-none">
      <div
        className="transition-transform duration-700 ease-out flex items-center justify-center pointer-events-auto"
        style={{ transform: `rotate(${-boardRotationDeg}deg)` }}
      >
        <AnimatePresence>
          {chat && (
            <motion.div
              key={chat.id}
              initial={{ scale: 0.3, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.2, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={onDismiss}
              className="relative select-none cursor-pointer"
              title="Klik untuk menutup balon chat"
            >
              <div className={`px-2.5 py-1.5 rounded-2xl bg-slate-950/95 border-2 ${style.border} shadow-2xl ${style.glow} backdrop-blur-md max-w-[140px] sm:max-w-[175px]`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ClimberAvatarIcon avatar={chat.avatar} size={18} />
                  <span className={`text-[10px] font-black truncate ${style.text}`}>
                    {chat.nickname}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-white leading-tight break-words">
                  {chat.message}
                </p>
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
// 3. MAIN 6-PLAYER HEXAGONAL LUDO BOARD COMPONENT
// ============================================================================

const ROTATION_BY_COLOR: Record<LudoColor, number> = {
  red: 0,
  blue: 300,
  purple: 240,
  green: 180,
  yellow: 120,
  orange: 60,
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myPlayerId,
  onSelectToken,
}) => {
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const myPlayer = gameState.players[myPlayerId];
  const validMoves = gameState.validMoves || [];

  // Default to player POV: local player's arm is always oriented at the Bottom
  const [povMode, setPovMode] = useState<'player' | 'global'>('player');
  const myColor: LudoColor = myPlayer?.color || 'red';
  const boardRotationDeg = povMode === 'player' ? ROTATION_BY_COLOR[myColor] : 0;

  // Step-by-step token movement animation engine
  const [animatedSteps, setAnimatedSteps] = useState<Record<string, number>>({});
  const displayedStepsRef = useRef<Record<string, number>>({});
  const targetStepsRef = useRef<Record<string, number>>({});
  const activeIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const captureTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Visual effects state
  const [impactBurst, setImpactBurst] = useState<{ coord: [number, number]; id: number } | null>(null);
  const [finishCelebrate, setFinishCelebrate] = useState<{ color: LudoColor; id: number } | null>(null);

  // Base Speech Bubbles State
  const { chatMessages } = useGameStore();
  const [activeBaseChats, setActiveBaseChats] = useState<Record<LudoColor, ActiveBaseChat | null>>({
    red: null,
    blue: null,
    purple: null,
    green: null,
    yellow: null,
    orange: null,
  });

  const lastProcessedChatIdRef = useRef<string | null>(null);
  const chatTimeoutsRef = useRef<Record<LudoColor, NodeJS.Timeout | null>>({
    red: null,
    blue: null,
    purple: null,
    green: null,
    yellow: null,
    orange: null,
  });
  const gameStatePlayersRef = useRef(gameState.players);
  gameStatePlayersRef.current = gameState.players;

  const handleDismissChat = (color: LudoColor) => {
    if (chatTimeoutsRef.current[color]) {
      clearTimeout(chatTimeoutsRef.current[color]!);
      chatTimeoutsRef.current[color] = null;
    }
    setActiveBaseChats((prev) => ({
      ...prev,
      [color]: null,
    }));
  };

  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    const latestChat = chatMessages[chatMessages.length - 1];
    if (!latestChat) return;

    if (latestChat.id === lastProcessedChatIdRef.current) return;
    lastProcessedChatIdRef.current = latestChat.id;

    if (Date.now() - latestChat.timestamp > 5000) return;

    let targetColor: LudoColor | undefined = undefined;
    if (latestChat.color && HEX_COLORS.includes(latestChat.color as LudoColor)) {
      targetColor = latestChat.color as LudoColor;
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

    setActiveBaseChats((prev) => ({
      ...prev,
      [targetColor!]: chatInfo,
    }));

    chatTimeoutsRef.current[targetColor] = setTimeout(() => {
      setActiveBaseChats((prev) => ({
        ...prev,
        [targetColor!]: null,
      }));
      chatTimeoutsRef.current[targetColor] = null;
    }, 4000);
  }, [chatMessages]);

  // Cleanup on unmount ONLY
  useEffect(() => {
    return () => {
      Object.values(activeIntervalsRef.current).forEach((t) => clearInterval(t));
      Object.values(captureTimeoutsRef.current).forEach((t) => clearTimeout(t));
      Object.values(chatTimeoutsRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  // Synchronize token movements whenever gameState updates
  useEffect(() => {
    let maxWalkDuration = 0;
    Object.values(gameState.players).forEach((p) => {
      p.tokens.forEach((t) => {
        const k = `${p.playerId}_${t.id}`;
        const target = t.state === 'base' ? 0 : t.stepCount;
        const cur = displayedStepsRef.current[k] ?? target;
        if (target > cur) {
          const steps = target - cur;
          maxWalkDuration = Math.max(maxWalkDuration, steps * 105);
        }
      });
    });

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

        // 2. Token knocked back to base by capture
        if (serverTarget < currentDisplayed) {
          if (activeIntervalsRef.current[key]) {
            clearInterval(activeIntervalsRef.current[key]);
            delete activeIntervalsRef.current[key];
          }

          if (captureTimeoutsRef.current[key]) {
            return;
          }

          const isActualCapture = Boolean(
            gameState.lastMoveNotice?.includes('memulangkan bidak') &&
            player.color !== gameState.currentTurnColor
          );

          if (maxWalkDuration > 0 && isActualCapture) {
            const capturedCoord = getTokenCoordinate(player.color, token.id, currentDisplayed, 'track');
            targetStepsRef.current[key] = 0;

            captureTimeoutsRef.current[key] = setTimeout(() => {
              soundManager.playTokenCapture();
              setImpactBurst({
                coord: capturedCoord,
                id: Date.now(),
              });
              setTimeout(() => setImpactBurst(null), 700);

              displayedStepsRef.current[key] = 0;
              targetStepsRef.current[key] = 0;
              setAnimatedSteps((prev) => ({ ...prev, [key]: 0 }));
              delete captureTimeoutsRef.current[key];
            }, maxWalkDuration);
            return;
          }

          displayedStepsRef.current[key] = 0;
          targetStepsRef.current[key] = 0;
          setAnimatedSteps((prev) => ({ ...prev, [key]: 0 }));
          return;
        }

        // 3. Token advanced forward
        // Case A: Moving from base (0) directly to start tile (1)
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

        // Case B: Advancing along track (walking tile by tile)
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

                  if (next === 83 || token.state === 'finished') {
                    soundManager.playTokenFinish();
                    setFinishCelebrate({
                      color: player.color,
                      id: Date.now(),
                    });
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

  // Compute screen coordinates for each token using its animated step
  const tokensOnBoard: Array<{
    token: LudoToken;
    player: typeof myPlayer;
    y: number;
    x: number;
    isValid: boolean;
  }> = [];

  Object.values(gameState.players).forEach((player) => {
    player.tokens.forEach((token) => {
      const key = `${player.playerId}_${token.id}`;
      const serverStep = token.state === 'base' ? 0 : token.stepCount;
      const animStep = animatedSteps[key];

      const isAwaitingCaptureArrival = captureTimeoutsRef.current[key] !== undefined;

      const currentStep = isAwaitingCaptureArrival
        ? (animStep ?? serverStep)
        : (token.state === 'base' ? 0 : (animStep ?? serverStep));

      const effectiveState = (isAwaitingCaptureArrival && currentStep > 0)
        ? 'track'
        : token.state;

      const [y, x] = getTokenCoordinate(player.color, token.id, currentStep, effectiveState);

      const isValid = isMyTurn && player.playerId === myPlayerId && validMoves.includes(token.id);

      tokensOnBoard.push({
        token,
        player,
        y,
        x,
        isValid,
      });
    });
  });

  const handleTokenClick = (tokenIndex: number) => {
    if (!isMyTurn || !validMoves.includes(tokenIndex)) return;
    soundManager.playTokenMove();
    onSelectToken(tokenIndex);
  };

  // Precompute center hexagon vertices (angles 60°, 120°, 180°, 240°, 300°, 0°)
  const centerHexVertices: [number, number][] = HEX_COLORS.map((_, k) => {
    const rad = degToRad(60 + k * 60);
    return [CENTER + R_CENTER * Math.cos(rad), CENTER + R_CENTER * Math.sin(rad)];
  });

  // Outer hexagonal board frame vertices (radius 480)
  const outerHexPoints = Array.from({ length: 6 })
    .map((_, k) => {
      const rad = degToRad(k * 60);
      return `${CENTER + 480 * Math.cos(rad)},${CENTER + 480 * Math.sin(rad)}`;
    })
    .join(' ');

  // Map color -> player occupying that base (if any)
  const playerByColor = {} as Partial<Record<LudoColor, typeof myPlayer>>;
  Object.values(gameState.players).forEach((p) => {
    playerByColor[p.color] = p;
  });

  return (
    <div className="relative w-full max-w-[500px] sm:max-w-[580px] aspect-square bg-[#0c121e] border-[5px] border-slate-700/80 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 sm:p-3 select-none touch-manipulation overflow-hidden">
      {/* POV CAMERA BADGE */}
      <div className="absolute top-3 right-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setPovMode((prev) => (prev === 'player' ? 'global' : 'player'))}
          className="px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 hover:border-amber-400 text-[10px] font-mono font-bold text-slate-200 hover:text-amber-300 flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Ubah Sudut Pandang Kamera Ludo"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>POV: {povMode === 'player' ? `${myColor.toUpperCase()} (BAWAH)` : 'GLOBAL'}</span>
        </button>
      </div>

      {/* ROTATABLE BOARD WRAPPER */}
      <div
        className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${boardRotationDeg}deg)` }}
      >
        {/* 1. HEXAGONAL 6-PLAYER SVG BOARD */}
        <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-2xl">
          <defs>
            <radialGradient id="hexBoardBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Outer Hexagonal Frame */}
          <polygon
            points={outerHexPoints}
            fill="url(#hexBoardBg)"
            stroke="#475569"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          {/* 6 Radial Arms (each rotated by k * 60° around 500,500) */}
          {HEX_COLORS.map((color, k) => {
            const palette = COLOR_HEX[color];
            const rot = k * 60;
            return (
              <g key={`arm_${color}`} transform={`rotate(${rot} 500 500)`}>
                {/* 3 lanes x 6 rows = 18 cells */}
                {([-1, 0, 1] as const).map((lane) =>
                  [0, 1, 2, 3, 4, 5].map((row) => {
                    // In local coords (arm pointing DOWN):
                    // lane = +1 is Left (x = 500 - 1.5 * CELL_W)
                    // lane = 0  is Middle (x = 500 - 0.5 * CELL_W)
                    // lane = -1 is Right (x = 500 + 0.5 * CELL_W)
                    const cellX = CENTER - (lane + 0.5) * CELL_W;
                    const cellY = CENTER + A_CENTER + row * CELL_H;

                    const isStartTile = lane === 1 && row === 4;
                    const isHomeStretch = lane === 0 && row >= 0 && row <= 4;
                    const isEntryArrow = lane === 0 && row === 5;
                    const isSafeStar = lane === -1 && row === 3;

                    const fill = isStartTile || isHomeStretch ? palette.main : '#ffffff';

                    return (
                      <g key={`cell_${color}_${lane}_${row}`}>
                        <rect
                          x={cellX}
                          y={cellY}
                          width={CELL_W}
                          height={CELL_H}
                          fill={fill}
                          stroke="#cbd5e1"
                          strokeWidth="1.6"
                        />

                        {/* Start Tile White Star */}
                        {isStartTile && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2}) rotate(${-rot - boardRotationDeg})`}>
                            <polygon
                              points="0,-13 3.8,-4.5 13,-4.5 5.6,1.2 8.2,10.5 0,5.2 -8.2,10.5 -5.6,1.2 -13,-4.5 -3.8,-4.5"
                              fill="#ffffff"
                              opacity="0.95"
                            />
                          </g>
                        )}

                        {/* Safe Star Tile */}
                        {isSafeStar && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2}) rotate(${-rot - boardRotationDeg})`}>
                            <polygon
                              points="0,-12 3.5,-4.2 12,-4.2 5.2,1.1 7.6,9.8 0,4.8 -7.6,9.8 -5.2,1.1 -12,-4.2 -3.5,-4.2"
                              fill="#94a3b8"
                            />
                          </g>
                        )}

                        {/* Home Stretch Entry Arrow (pointing UP toward center) */}
                        {isEntryArrow && (
                          <g transform={`translate(${cellX + CELL_W / 2}, ${cellY + CELL_H / 2})`}>
                            <path
                              d="M -10 5 L 0 -8 L 10 5"
                              fill="none"
                              stroke={palette.main}
                              strokeWidth="4.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })
                )}
              </g>
            );
          })}

          {/* Center Hexagon: 6 Colored Home Triangles */}
          {HEX_COLORS.map((color, k) => {
            const v1 = centerHexVertices[k];
            const v2 = centerHexVertices[(k + 1) % 6];
            return (
              <polygon
                key={`tri_${color}`}
                points={`${CENTER},${CENTER} ${v1[0]},${v1[1]} ${v2[0]},${v2[1]}`}
                fill={COLOR_HEX[color].main}
                stroke="#f8fafc"
                strokeWidth="2.5"
              />
            );
          })}

          {/* 6 Colored Bases (Yards) in the 60° Wedges */}
          {HEX_COLORS.map((color) => {
            const [cy, cx] = BASE_CENTERS[color];
            const palette = COLOR_HEX[color];
            const occupant = playerByColor[color];
            const isCurrentTurnBase = occupant && gameState.currentTurnPlayerId === occupant.playerId;

            return (
              <g key={`base_${color}`}>
                {/* Active Turn Glow Ring */}
                {isCurrentTurnBase && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={BASE_RADIUS + 8}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="5"
                    strokeDasharray="12 6"
                  />
                )}

                {/* Outer Colored Base */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={BASE_RADIUS}
                  fill={palette.main}
                  stroke="#f8fafc"
                  strokeWidth="3.5"
                  opacity={occupant ? 1 : 0.45}
                />

                {/* Inner White Capsule */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={BASE_INNER_RADIUS}
                  fill="#ffffff"
                  stroke={palette.border}
                  strokeWidth="2"
                />

                {/* 4 Token Slot Circles */}
                {BASE_SLOTS[color].map(([sy, sx], idx) => (
                  <circle
                    key={`slot_${color}_${idx}`}
                    cx={sx}
                    cy={sy}
                    r={16}
                    fill={palette.slotBg}
                    stroke={palette.main}
                    strokeWidth="2"
                    opacity={occupant ? 1 : 0.5}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* 2. CENTER CROWN BADGE (HTML overlay for crisp icon & counter-rotation) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-950/90 backdrop-blur-sm border-2 border-amber-300 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.9)] transition-transform duration-700 pointer-events-none"
          style={{ transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)` }}
        >
          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300 animate-pulse" />
        </div>

        {/* 3. CLICKABLE BASE SLOT OVERLAYS + BASE SPEECH BUBBLES */}
        <div className="absolute inset-0 pointer-events-none">
          {HEX_COLORS.map((color) => {
            const [cy, cx] = BASE_CENTERS[color];
            const occupant = playerByColor[color];

            return (
              <React.Fragment key={`overlay_${color}`}>
                {/* Player Name Tag on Occupied Base */}
                {occupant && (
                  <div
                    className="absolute z-10 pointer-events-none transition-transform duration-700"
                    style={{
                      left: `${(cx / 1000) * 100}%`,
                      top: `${((cy + BASE_RADIUS + 14) / 1000) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${-boardRotationDeg}deg)`,
                    }}
                  >
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-[8px] sm:text-[9px] font-black text-white whitespace-nowrap shadow-md">
                      {occupant.nickname}
                    </span>
                  </div>
                )}

                {/* Clickable Base Slots for Local Player */}
                {myColor === color &&
                  isMyTurn &&
                  BASE_SLOTS[color].map(([sy, sx], i) => {
                    const isTokenValid =
                      validMoves.includes(i) && myPlayer?.tokens[i]?.state === 'base';
                    if (!isTokenValid) return null;
                    return (
                      <button
                        key={`base_btn_${color}_${i}`}
                        type="button"
                        onClick={() => handleTokenClick(i)}
                        style={{
                          left: `${(sx / 1000) * 100}%`,
                          top: `${(sy / 1000) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className="absolute z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.95)] pointer-events-auto cursor-pointer active:scale-95"
                        title={`Keluarkan Bidak #${i + 1}`}
                      />
                    );
                  })}

                {/* Pop-up Speech Bubble at Base */}
                <div
                  className="absolute z-40 pointer-events-none"
                  style={{
                    left: `${(cx / 1000) * 100}%`,
                    top: `${(cy / 1000) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <BaseSpeechBubble
                    chat={activeBaseChats[color]}
                    color={color}
                    boardRotationDeg={boardRotationDeg}
                    onDismiss={() => handleDismissChat(color)}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 4. ANIMATED 3D GLOSSY TOKENS OVERLAY */}
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

              const leftPercent = (x / 1000) * 100 + offsetX;
              const topPercent = (y / 1000) * 100 + offsetY;

              return (
                <motion.div
                  key={`${player.playerId}_${token.id}`}
                  animate={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    x: '-50%',
                    y: '-50%',
                    scale: isValid ? [1, 1.14, 1] : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 450, damping: 28 },
                    top: { type: 'spring', stiffness: 450, damping: 28 },
                    x: { duration: 0 },
                    y: { duration: 0 },
                    scale: isValid ? { repeat: Infinity, duration: 0.85 } : undefined,
                  }}
                  style={{
                    x: '-50%',
                    y: '-50%',
                  }}
                  className="absolute z-20 pointer-events-auto cursor-pointer"
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

          {/* Comic KAPOW Impact Burst Effect */}
          {impactBurst && (
            <motion.div
              key={impactBurst.id}
              initial={{ scale: 0.2, opacity: 1, rotate: -20, x: '-50%', y: '-50%' }}
              animate={{ scale: [0.2, 1.35, 1.1], opacity: [1, 1, 0], rotate: [-20, 10, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{
                left: `${(impactBurst.coord[1] / 1000) * 100}%`,
                top: `${(impactBurst.coord[0] / 1000) * 100}%`,
                x: '-50%',
                y: '-50%',
              }}
              className="absolute z-40 pointer-events-none flex flex-col items-center justify-center select-none"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full border-4 border-amber-400 bg-amber-400/30 animate-ping" />
                <span className="relative text-3xl filter drop-shadow-[0_0_12px_rgba(239,68,68,1)]">
                  💥
                </span>
                <span className="absolute -top-3.5 font-black text-[9px] tracking-widest text-amber-300 uppercase bg-slate-950/95 px-2 py-0.5 rounded-full border border-amber-400 shadow-xl">
                  BONK!
                </span>
              </div>
            </motion.div>
          )}

          {/* Celebratory Finish Crown / Sparkles Burst */}
          {finishCelebrate && (
            <motion.div
              key={finishCelebrate.id}
              initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 2.3, ease: 'easeOut' }}
              style={{
                left: '50%',
                top: '50%',
                x: '-50%',
                y: '-50%',
              }}
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
    </div>
  );
};
