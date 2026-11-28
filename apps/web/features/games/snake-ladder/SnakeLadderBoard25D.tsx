'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  SnakeLadderGameState,
  SnakeLadderColor,
  SnakeLadderMoveEvent,
  SNAKE_LADDER_LADDERS,
  SNAKE_LADDER_SNAKES,
  PRIMARY_AVATARS,
  SnakeLink,
  LadderLink,
  normalizeAvatarId,
} from '@gamehouse/shared';
import { soundManager } from '../../../components/audio/SoundManager';

interface SnakeLadderBoard25DProps {
  gameState: SnakeLadderGameState;
  myPlayerId: string;
  is25D: boolean;
  onAnimationBusyChange?: (busy: boolean) => void;
  onMoveCompleted?: (seq: number) => void;
}

interface Point2D {
  x: number;
  y: number;
}

interface ParticleFX {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'circle' | 'star' | 'ring';
}

interface FloatingBannerFX {
  x: number;
  y: number;
  text: string;
  color: string;
  bgColor: string;
  life: number;
  maxLife: number;
}

interface ActivePawnAnim {
  move: SnakeLadderMoveEvent;
  phase: 'walk' | 'trigger' | 'victory_hold';
  startTime: number;
  stepDuration: number;
  triggerDuration: number;
  victoryHoldDuration: number;
  bouncedTriggered: boolean;
  triggerSoundPlayed: boolean;
  victorySoundPlayed: boolean;
  lastHopIndex: number;
}

interface QueuedPawnMove {
  move: SnakeLadderMoveEvent;
  readyAt: number;
}

interface StepTrailFX {
  tile: number;
  stepNum: number;
  color: string;
  expiresAt: number;
}

const STEP_DURATION_MS = 290;
const VICTORY_HOLD_MS = 950;
const PAWN_START_DELAY_MS = 1450; // ~450ms dice land & reveal + 1000ms pause so players can read the number

const BOARD_SIZE = 1000;
const CELL_SIZE = 100;

const PAWN_COLORS: Record<
  SnakeLadderColor,
  { main: string; dark: string; light: string; glow: string }
> = {
  red: { main: '#ef4444', dark: '#991b1b', light: '#fca5a5', glow: 'rgba(239,68,68,0.65)' },
  blue: { main: '#3b82f6', dark: '#1e40af', light: '#93c5fd', glow: 'rgba(59,130,246,0.65)' },
  purple: { main: '#a855f7', dark: '#6b21a8', light: '#d8b4fe', glow: 'rgba(168,85,247,0.65)' },
  green: { main: '#22c55e', dark: '#166534', light: '#86efac', glow: 'rgba(34,197,94,0.65)' },
  yellow: { main: '#eab308', dark: '#854d0e', light: '#fef08a', glow: 'rgba(234,179,8,0.65)' },
  orange: { main: '#f97316', dark: '#9a3412', light: '#fdba74', glow: 'rgba(249,115,22,0.65)' },
};

const SNAKE_WAVE_CONFIG: Record<string, { waves: number; amp: number; speed: number; phase: number }> = {
  'snake-1': { waves: 2.5, amp: 26, speed: 2.1, phase: 0.4 },
  'snake-2': { waves: 3.0, amp: 32, speed: 1.85, phase: 1.2 },
  'snake-3': { waves: 2.5, amp: 28, speed: 2.25, phase: 2.1 },
  'snake-4': { waves: 3.0, amp: 30, speed: 1.95, phase: 3.0 },
  'snake-5': { waves: 2.5, amp: 26, speed: 2.35, phase: 3.9 },
  'snake-6': { waves: 3.5, amp: 34, speed: 1.75, phase: 4.7 },
  'snake-7': { waves: 2.5, amp: 25, speed: 2.4, phase: 5.5 },
  'snake-8': { waves: 3.5, amp: 36, speed: 1.9, phase: 6.2 },
};

export function getTileGridPos(tile: number): { rowFromTop: number; col: number } {
  const clamped = Math.max(1, Math.min(100, tile));
  const zeroIdx = clamped - 1;
  const rowFromBottom = Math.floor(zeroIdx / 10);
  const colInRow = zeroIdx % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  const rowFromTop = 9 - rowFromBottom;
  return { rowFromTop, col };
}

export function getTileCenter(tile: number): Point2D {
  if (tile <= 0) {
    // Just outside the left edge of petak 1 so characters enter into the arena on their first roll
    return { x: -32, y: 956 };
  }
  const { rowFromTop, col } = getTileGridPos(tile);
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: rowFromTop * CELL_SIZE + CELL_SIZE / 2,
  };
}

function getSnakeSpinePoint(
  snake: SnakeLink,
  t: number,
  timeSec: number,
  isAngry: boolean
): { x: number; y: number; z: number } {
  const head = getTileCenter(snake.from);
  const tail = getTileCenter(snake.to);
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const cfg = SNAKE_WAVE_CONFIG[snake.id] || { waves: 2.5, amp: 28, speed: 2.0, phase: 0 };
  const envelope = Math.sin(t * Math.PI);
  const staticS = Math.sin(t * Math.PI * cfg.waves) * cfg.amp * envelope;
  const slitherAmp = isAngry ? 16 : 9;
  const dynamicWiggle =
    Math.sin(timeSec * cfg.speed * (isAngry ? 2.4 : 1) - t * 8.5 + cfg.phase) *
    slitherAmp *
    (0.2 + 0.8 * envelope);
  const tailWag = t > 0.8 ? Math.sin(timeSec * 4.5 + cfg.phase) * 8 * ((t - 0.8) / 0.2) * (1 - (t - 0.8) / 0.22) : 0;

  const lateral = staticS + dynamicWiggle + tailWag;
  const archZ = (6 + 9 * Math.abs(Math.sin(t * Math.PI * 2.2))) * (1 - 0.45 * t);
  const headLift = isAngry && t < 0.22 ? (1 - t / 0.22) * 18 : 0;

  return {
    x: head.x + dx * t + nx * lateral,
    y: head.y + dy * t + ny * lateral,
    z: archZ + headLift,
  };
}

export const SnakeLadderBoard25D: React.FC<SnakeLadderBoard25DProps> = ({
  gameState,
  myPlayerId,
  is25D,
  onAnimationBusyChange,
  onMoveCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const onAnimationBusyChangeRef = useRef(onAnimationBusyChange);
  onAnimationBusyChangeRef.current = onAnimationBusyChange;
  const onMoveCompletedRef = useRef(onMoveCompleted);
  onMoveCompletedRef.current = onMoveCompleted;

  const moveQueueRef = useRef<QueuedPawnMove[]>([]);
  const activeAnimRef = useRef<ActivePawnAnim | null>(null);
  const lastQueuedSeqRef = useRef<number>(gameState.lastMove?.seq || 0);
  const visualPositionsRef = useRef<Record<string, number>>({});
  const particlesRef = useRef<ParticleFX[]>([]);
  const bannersRef = useRef<FloatingBannerFX[]>([]);
  const stepTrailRef = useRef<StepTrailFX[]>([]);
  const boardShakeRef = useRef<number>(0);
  const activeLadderIdRef = useRef<string | null>(null);
  const angrySnakeIdRef = useRef<string | null>(null);
  const [boardShakeCss, setBoardShakeCss] = useState(false);

  const ladderStartSet = useMemo(() => new Set(SNAKE_LADDER_LADDERS.map((l) => l.from)), []);
  const snakeHeadSet = useMemo(() => new Set(SNAKE_LADDER_SNAKES.map((s) => s.from)), []);

  // Preload ALL 12 character avatar PNGs (including Luna, Bima, Nala, Rama) for 3D pawns
  useEffect(() => {
    PRIMARY_AVATARS.forEach((id) => {
      if (!avatarImagesRef.current[id]) {
        const img = new Image();
        img.src = `/assets/characters/${id}/avatar.png`;
        avatarImagesRef.current[id] = img;
      }
    });
  }, []);

  // Initialize or reset visual positions (e.g. on game start or rematch when all reset to 0)
  useEffect(() => {
    if (!gameState.lastMove) {
      lastQueuedSeqRef.current = 0;
      moveQueueRef.current = [];
      activeAnimRef.current = null;
      stepTrailRef.current = [];
      activeLadderIdRef.current = null;
      angrySnakeIdRef.current = null;
      Object.values(gameState.players).forEach((p) => {
        visualPositionsRef.current[p.playerId] = p.position;
      });
      onAnimationBusyChangeRef.current?.(false);
      return;
    }

    Object.values(gameState.players).forEach((p) => {
      if (visualPositionsRef.current[p.playerId] === undefined) {
        visualPositionsRef.current[p.playerId] = p.position;
      }
    });
  }, [gameState.players, gameState.lastMove]);

  // Queue incoming moves cleanly so animations never skip or collide
  useEffect(() => {
    const move = gameState.lastMove;
    if (!move) return;
    if (move.seq <= lastQueuedSeqRef.current) return;

    lastQueuedSeqRef.current = move.seq;
    // Keep visual position anchored at move.fromTile until its animation runs
    if (!activeAnimRef.current && moveQueueRef.current.length === 0) {
      visualPositionsRef.current[move.playerId] = move.fromTile;
    }
    onAnimationBusyChangeRef.current?.(true);
    moveQueueRef.current.push({
      move,
      readyAt: performance.now() + PAWN_START_DELAY_MS,
    });
  }, [gameState.lastMove]);

  const spawnBurst = (
    x: number,
    y: number,
    colors: string[],
    count: number,
    kind: ParticleFX['kind'] = 'circle',
    upwardBias: number = 0
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.6 + Math.random() * 4.2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - upwardBias,
        size: kind === 'ring' ? 12 : 4 + Math.random() * 5,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0,
        maxLife: kind === 'ring' ? 32 : 28 + Math.random() * 18,
        kind,
      });
    }
  };

  const spawnBanner = (x: number, y: number, text: string, color: string, bgColor: string) => {
    bannersRef.current.push({
      x: Math.max(120, Math.min(880, x)),
      y: Math.max(90, Math.min(920, y)),
      text,
      color,
      bgColor,
      life: 0,
      maxLife: 78,
    });
  };

  // Main 60fps Canvas 2.5D Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastFrameTime = performance.now();

    const renderFrame = (nowMs: number) => {
      const dt = Math.min(0.05, (nowMs - lastFrameTime) / 1000);
      lastFrameTime = nowMs;
      const timeSec = nowMs / 1000;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const dpr = Math.min(2.25, window.devicePixelRatio || 1);
      const targetW = Math.round(BOARD_SIZE * dpr);
      if (canvas.width !== targetW || canvas.height !== targetW) {
        canvas.width = targetW;
        canvas.height = targetW;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Subtle screen shake offset when snake strikes
      if (boardShakeRef.current > 0) {
        boardShakeRef.current = Math.max(0, boardShakeRef.current - dt * 3.5);
        const mag = boardShakeRef.current * 7;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const state = gameStateRef.current;

      // ------------------------------------------------------------------
      // 1. ADVANCE ACTIVE PAWN ANIMATION QUEUE
      // ------------------------------------------------------------------
      if (!activeAnimRef.current && moveQueueRef.current.length > 0 && nowMs >= moveQueueRef.current[0].readyAt) {
        const { move: nextMove } = moveQueueRef.current.shift()!;
        visualPositionsRef.current[nextMove.playerId] = nextMove.fromTile;
        activeLadderIdRef.current = null;
        angrySnakeIdRef.current = null;
        stepTrailRef.current = [];
        onAnimationBusyChangeRef.current?.(true);

        activeAnimRef.current = {
          move: nextMove,
          phase: nextMove.walkPath.length > 0 ? 'walk' : nextMove.trigger ? 'trigger' : 'victory_hold',
          startTime: nowMs,
          stepDuration: STEP_DURATION_MS,
          triggerDuration: nextMove.trigger?.type === 'snake' ? 980 : 860,
          victoryHoldDuration: VICTORY_HOLD_MS,
          bouncedTriggered: false,
          triggerSoundPlayed: false,
          victorySoundPlayed: false,
          lastHopIndex: -1,
        };
      }

      const overridePawnPos: Record<
        string,
        {
          x: number;
          y: number;
          z: number;
          spin: number;
          scale: number;
          facing: 1 | -1;
          walkCycle: number;
          isWalking: boolean;
          isClimbing: boolean;
          isCelebrating: boolean;
          stepBadge?: string;
        }
      > = {};

      if (activeAnimRef.current) {
        const anim = activeAnimRef.current;
        const { move } = anim;
        const elapsed = nowMs - anim.startTime;

        if (anim.phase === 'walk') {
          const totalWalkTime = move.walkPath.length * anim.stepDuration;
          if (elapsed < totalWalkTime) {
            const stepIdx = Math.floor(elapsed / anim.stepDuration);
            const localT = (elapsed % anim.stepDuration) / anim.stepDuration;
            const prevTile = stepIdx === 0 ? move.fromTile : move.walkPath[stepIdx - 1];
            const nextTile = move.walkPath[stepIdx];

            if (stepIdx !== anim.lastHopIndex) {
              anim.lastHopIndex = stepIdx;
              soundManager.playPawnHop(stepIdx);

              // Record step badge trail matching the dice count (1, 2, 3...)
              const moverPalette = PAWN_COLORS[state.players[move.playerId]?.color || 'red'] || PAWN_COLORS.red;
              stepTrailRef.current.push({
                tile: nextTile,
                stepNum: stepIdx + 1,
                color: moverPalette.main,
                expiresAt: nowMs + 1650,
              });

              if (prevTile === 0 && nextTile === 1) {
                // Character enters the arena for the first time!
                const t1 = getTileCenter(1);
                spawnBurst(t1.x, t1.y, ['#34d399', '#facc15', '#ffffff'], 16, 'star', 1.4);
                spawnBanner(t1.x + 28, t1.y - 26, '✨ MASUK ARENA!', '#ecfdf5', '#059669');
              }

              if (prevTile === 100 && nextTile === 99 && !anim.bouncedTriggered) {
                anim.bouncedTriggered = true;
                const p100 = getTileCenter(100);
                soundManager.playBounce100();
                spawnBurst(p100.x, p100.y, ['#facc15', '#fb923c', '#ffffff'], 16, 'star', 1.2);
                spawnBanner(p100.x + 25, p100.y + 30, 'BOING! 💥', '#fef08a', '#b45309');
              }

              if (stepIdx > 0) {
                const landPt = getTileCenter(prevTile);
                spawnBurst(landPt.x, landPt.y, ['rgba(255,255,255,0.8)', '#fde68a'], 5, 'circle', 0.45);
              }
            }

            const pA = getTileCenter(prevTile);
            const pB = getTileCenter(nextTile);
            const facing: 1 | -1 = pB.x >= pA.x ? 1 : -1;
            const smoothT = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;
            const zHop = Math.sin(localT * Math.PI) * 26;

            overridePawnPos[move.playerId] = {
              x: pA.x + (pB.x - pA.x) * smoothT,
              y: pA.y + (pB.y - pA.y) * smoothT,
              z: zHop,
              spin: 0,
              scale: 1 + Math.sin(localT * Math.PI) * 0.1,
              facing,
              walkCycle: localT,
              isWalking: true,
              isClimbing: false,
              isCelebrating: false,
              stepBadge: `${stepIdx + 1}/${move.walkPath.length}`,
            };
            visualPositionsRef.current[move.playerId] = nextTile;
          } else {
            // Walk finished!
            const landTile = move.walkPath[move.walkPath.length - 1] ?? move.fromTile;
            const landPt = getTileCenter(landTile);
            spawnBurst(landPt.x, landPt.y, ['#ffffff', '#fde68a'], 8, 'circle', 0.6);

            if (move.trigger) {
              anim.phase = 'trigger';
              anim.startTime = nowMs;
            } else if (move.toTile >= 100) {
              // Hold the pawn clearly stopped at tile 100 before opening the victory popup
              visualPositionsRef.current[move.playerId] = 100;
              anim.phase = 'victory_hold';
              anim.startTime = nowMs;
              anim.victorySoundPlayed = true;
              soundManager.playVictory();
              spawnBurst(landPt.x, landPt.y, ['#facc15', '#22c55e', '#38bdf8', '#f43f5e'], 36, 'star', 2.2);
              spawnBanner(landPt.x + 30, landPt.y + 38, '🏆 JUARA 100!', '#ffffff', '#d97706');
            } else {
              visualPositionsRef.current[move.playerId] = move.toTile;
              if (move.bonusRoll) {
                spawnBanner(landPt.x, landPt.y - 28, '🎲 BONUS DADU 6!', '#fef08a', '#4f46e5');
              }
              activeAnimRef.current = null;
              onMoveCompletedRef.current?.(move.seq);
              if (moveQueueRef.current.length === 0) {
                onAnimationBusyChangeRef.current?.(false);
              }
            }
          }
        }

        if (activeAnimRef.current && activeAnimRef.current.phase === 'trigger') {
          const trigAnim = activeAnimRef.current;
          const trigElapsed = nowMs - trigAnim.startTime;
          const trig = move.trigger;

          if (!trig) {
            visualPositionsRef.current[move.playerId] = move.toTile;
            activeAnimRef.current = null;
            onMoveCompletedRef.current?.(move.seq);
            if (moveQueueRef.current.length === 0) onAnimationBusyChangeRef.current?.(false);
          } else {
            if (!trigAnim.triggerSoundPlayed) {
              trigAnim.triggerSoundPlayed = true;
              const startPt = getTileCenter(trig.from);
              if (trig.type === 'ladder') {
                activeLadderIdRef.current = trig.linkId;
                soundManager.playLadderClimb();
                spawnBurst(startPt.x, startPt.y, ['#4ade80', '#facc15', '#fef08a'], 18, 'star', 2.2);
                spawnBanner(
                  startPt.x,
                  startPt.y - 24,
                  `🪜 NAIK +${trig.to - trig.from}!`,
                  '#ecfdf5',
                  '#059669'
                );
              } else {
                angrySnakeIdRef.current = trig.linkId;
                boardShakeRef.current = 1.0;
                setBoardShakeCss(true);
                setTimeout(() => setBoardShakeCss(false), 380);
                soundManager.playSnakeSlide();
                spawnBurst(startPt.x, startPt.y, ['#f43f5e', '#c084fc', '#fb923c'], 20, 'star', 0.8);
                particlesRef.current.push({
                  x: startPt.x,
                  y: startPt.y,
                  vx: 0,
                  vy: 0,
                  size: 16,
                  color: '#f43f5e',
                  alpha: 1,
                  life: 0,
                  maxLife: 30,
                  kind: 'ring',
                });
                spawnBanner(
                  startPt.x,
                  startPt.y - 24,
                  `🐍 TURUN -${trig.from - trig.to}!`,
                  '#fff1f2',
                  '#be123c'
                );
              }
            }

            const p = Math.min(1, trigElapsed / trigAnim.triggerDuration);
            if (trig.type === 'ladder') {
              const fromPt = getTileCenter(trig.from);
              const toPt = getTileCenter(trig.to);
              const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              const px = fromPt.x + (toPt.x - fromPt.x) * ease;
              const py = fromPt.y + (toPt.y - fromPt.y) * ease;
              const climbBob = Math.abs(Math.sin(p * Math.PI * 6)) * 10 + 18;

              if (Math.random() < 0.45) {
                particlesRef.current.push({
                  x: px + (Math.random() - 0.5) * 20,
                  y: py - climbBob + 10,
                  vx: (Math.random() - 0.5) * 1.4,
                  vy: -1.5 - Math.random() * 1.5,
                  size: 4 + Math.random() * 4,
                  color: Math.random() > 0.4 ? '#facc15' : '#4ade80',
                  alpha: 0.95,
                  life: 0,
                  maxLife: 24,
                  kind: 'star',
                });
              }

              overridePawnPos[move.playerId] = {
                x: px,
                y: py,
                z: climbBob,
                spin: Math.sin(p * Math.PI * 6) * 0.14,
                scale: 1.12,
                facing: toPt.x >= fromPt.x ? 1 : -1,
                walkCycle: (p * 6) % 1,
                isWalking: false,
                isClimbing: true,
                isCelebrating: false,
              };
            } else {
              // Slide down the exact curved 2.5D snake spine!
              const snakeObj =
                SNAKE_LADDER_SNAKES.find((s) => s.id === trig.linkId) || SNAKE_LADDER_SNAKES[0];
              const ease = 1 - Math.pow(1 - p, 2.1);
              const spinePt = getSnakeSpinePoint(snakeObj, ease, timeSec, true);

              if (Math.random() < 0.5) {
                particlesRef.current.push({
                  x: spinePt.x + (Math.random() - 0.5) * 16,
                  y: spinePt.y - spinePt.z,
                  vx: (Math.random() - 0.5) * 2.2,
                  vy: (Math.random() - 0.5) * 2.2 - 0.6,
                  size: 4 + Math.random() * 4,
                  color: Math.random() > 0.5 ? '#fb7185' : '#fde047',
                  alpha: 0.9,
                  life: 0,
                  maxLife: 22,
                  kind: Math.random() > 0.5 ? 'star' : 'circle',
                });
              }

              overridePawnPos[move.playerId] = {
                x: spinePt.x,
                y: spinePt.y,
                z: spinePt.z + 10,
                spin: p * Math.PI * 4,
                scale: 1.02 - p * 0.08,
                facing: 1,
                walkCycle: 0,
                isWalking: false,
                isClimbing: false,
                isCelebrating: false,
              };
            }

            if (p >= 1) {
              const endPt = getTileCenter(move.toTile);
              if (trig.type === 'ladder') {
                spawnBurst(endPt.x, endPt.y, ['#4ade80', '#facc15', '#ffffff'], 16, 'star', 1.4);
              } else {
                spawnBurst(endPt.x, endPt.y, ['#fb7185', '#e2e8f0'], 12, 'circle', 0.8);
              }
              visualPositionsRef.current[move.playerId] = move.toTile;
              activeLadderIdRef.current = null;
              angrySnakeIdRef.current = null;

              if (move.toTile >= 100) {
                anim.phase = 'victory_hold';
                anim.startTime = nowMs;
                anim.victorySoundPlayed = true;
                soundManager.playVictory();
                spawnBurst(endPt.x, endPt.y, ['#facc15', '#22c55e', '#38bdf8', '#f43f5e'], 36, 'star', 2.2);
                spawnBanner(endPt.x + 30, endPt.y + 38, '🏆 JUARA 100!', '#ffffff', '#d97706');
              } else {
                activeAnimRef.current = null;
                onMoveCompletedRef.current?.(move.seq);
                if (moveQueueRef.current.length === 0) {
                  onAnimationBusyChangeRef.current?.(false);
                }
              }
            }
          }
        }

        if (activeAnimRef.current && activeAnimRef.current.phase === 'victory_hold') {
          const holdAnim = activeAnimRef.current;
          const holdElapsed = nowMs - holdAnim.startTime;
          const winPt = getTileCenter(100);
          visualPositionsRef.current[move.playerId] = 100;

          if (!holdAnim.victorySoundPlayed) {
            holdAnim.victorySoundPlayed = true;
            soundManager.playVictory();
            spawnBurst(winPt.x, winPt.y, ['#facc15', '#22c55e', '#38bdf8', '#f43f5e'], 36, 'star', 2.2);
            spawnBanner(winPt.x + 30, winPt.y + 38, '🏆 JUARA 100!', '#ffffff', '#d97706');
          }

          if (Math.random() < 0.28) {
            particlesRef.current.push({
              x: winPt.x + (Math.random() - 0.5) * 44,
              y: winPt.y - 10,
              vx: (Math.random() - 0.5) * 2.4,
              vy: -1.8 - Math.random() * 2.0,
              size: 5 + Math.random() * 4,
              color: ['#facc15', '#34d399', '#38bdf8', '#fb7185'][Math.floor(Math.random() * 4)],
              alpha: 1,
              life: 0,
              maxLife: 28,
              kind: 'star',
            });
          }

          const jumpBounce = Math.abs(Math.sin((holdElapsed / 320) * Math.PI)) * 18;
          overridePawnPos[move.playerId] = {
            x: winPt.x,
            y: winPt.y,
            z: jumpBounce,
            spin: 0,
            scale: 1.15,
            facing: 1,
            walkCycle: 0,
            isWalking: false,
            isClimbing: false,
            isCelebrating: true,
          };

          if (holdElapsed >= holdAnim.victoryHoldDuration) {
            activeAnimRef.current = null;
            onMoveCompletedRef.current?.(move.seq);
            if (moveQueueRef.current.length === 0) {
              onAnimationBusyChangeRef.current?.(false);
            }
          }
        }
      }

      // ------------------------------------------------------------------
      // 2. DRAW 2.5D WOODEN / BAMBOO LADDERS
      // ------------------------------------------------------------------
      SNAKE_LADDER_LADDERS.forEach((ladder) => {
        draw25DLadder(
          ctx,
          ladder,
          timeSec,
          activeLadderIdRef.current === ladder.id
        );
      });

      // ------------------------------------------------------------------
      // 3. DRAW 2.5D LIVING ANIMATED SNAKES (SLITHERING + SHADED + TONGUE)
      // ------------------------------------------------------------------
      const curTurnVPos =
        state.currentTurnPlayerId && state.players[state.currentTurnPlayerId]
          ? visualPositionsRef.current[state.currentTurnPlayerId] ??
            state.players[state.currentTurnPlayerId].position
          : 0;
      const activePlayerPos = curTurnVPos > 0 ? getTileCenter(curTurnVPos) : { x: 500, y: 500 };

      SNAKE_LADDER_SNAKES.forEach((snake, idx) => {
        draw25DSnake(
          ctx,
          snake,
          idx,
          timeSec,
          angrySnakeIdRef.current === snake.id,
          activePlayerPos
        );
      });

      // ------------------------------------------------------------------
      // 3B. DRAW STEP-COUNT TRAIL ON BOARD TILES (FOLLOWS DICE NUMBER)
      // ------------------------------------------------------------------
      if (stepTrailRef.current.length > 0) {
        const activeSteps: StepTrailFX[] = [];
        for (const st of stepTrailRef.current) {
          if (nowMs >= st.expiresAt) continue;
          activeSteps.push(st);
          const remainingRatio = Math.min(1, (st.expiresAt - nowMs) / 450);
          const pt = getTileCenter(st.tile);

          ctx.save();
          ctx.globalAlpha = Math.max(0, remainingRatio) * 0.92;
          // Glowing footprint highlight ring
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + 4, 24, 15, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Small step badge pill (1, 2, 3...) at bottom-left of tile
          ctx.fillStyle = st.color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x - 24, pt.y + 24, 11.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(st.stepNum), pt.x - 24, pt.y + 24.5);
          ctx.restore();
        }
        stepTrailRef.current = activeSteps;
      }

      // ------------------------------------------------------------------
      // 4. DRAW 3D CHARACTER PAWNS (HIDDEN BEFORE FIRST ROLL)
      // ------------------------------------------------------------------
      const playerList = state.playerOrder
        .map((id) => state.players[id])
        .filter(Boolean);

      // Group stationary entered pawns by tile so they sit cleanly side-by-side
      const tileGroups: Record<number, string[]> = {};
      playerList.forEach((p) => {
        if (overridePawnPos[p.playerId]) return;
        const vPos = visualPositionsRef.current[p.playerId] ?? p.position;
        if (vPos <= 0) return; // Not yet in arena
        if (!tileGroups[vPos]) tileGroups[vPos] = [];
        tileGroups[vPos].push(p.playerId);
      });

      const drawQueue: Array<{
        playerId: string;
        x: number;
        y: number;
        z: number;
        spin: number;
        scale: number;
        facing: 1 | -1;
        walkCycle: number;
        isWalking: boolean;
        isClimbing: boolean;
        isCelebrating: boolean;
        stepBadge?: string;
        isTurn: boolean;
        isMe: boolean;
        color: SnakeLadderColor;
        avatarId: string;
        nickname: string;
      }> = [];

      playerList.forEach((p) => {
        const animOverride = overridePawnPos[p.playerId];
        const isTurn = state.currentTurnPlayerId === p.playerId && !state.winnerId;
        const isMe = p.playerId === myPlayerId;
        const avatarId = normalizeAvatarId(p.avatar);

        if (animOverride) {
          drawQueue.push({
            playerId: p.playerId,
            x: animOverride.x,
            y: animOverride.y,
            z: animOverride.z,
            spin: animOverride.spin,
            scale: animOverride.scale,
            facing: animOverride.facing,
            walkCycle: animOverride.walkCycle,
            isWalking: animOverride.isWalking,
            isClimbing: animOverride.isClimbing,
            isCelebrating: animOverride.isCelebrating,
            stepBadge: animOverride.stepBadge,
            isTurn,
            isMe,
            color: p.color,
            avatarId,
            nickname: p.nickname,
          });
        } else {
          const vPos = visualPositionsRef.current[p.playerId] ?? p.position;
          // Rule 1: Character stays off-arena until their first dice roll enters them into the board
          if (vPos <= 0) return;

          const basePt = getTileCenter(vPos);
          const group = tileGroups[vPos] || [p.playerId];
          const idxInGroup = group.indexOf(p.playerId);
          let offX = 0;
          let offY = 0;

          if (group.length > 1) {
            const angle = (Math.PI * 2 * idxInGroup) / group.length - Math.PI / 2;
            const spread = group.length <= 2 ? 19 : 23;
            offX = Math.cos(angle) * spread;
            offY = Math.sin(angle) * spread * 0.78;
          }

          const rowDir: 1 | -1 = Math.floor((vPos - 1) / 10) % 2 === 0 ? 1 : -1;
          const idleBob = isTurn ? Math.abs(Math.sin(timeSec * 3.8)) * 6 : 0;

          drawQueue.push({
            playerId: p.playerId,
            x: basePt.x + offX,
            y: basePt.y + offY,
            z: idleBob,
            spin: 0,
            scale: isTurn ? 1.07 : 0.98,
            facing: rowDir,
            walkCycle: 0,
            isWalking: false,
            isClimbing: false,
            isCelebrating: state.winnerId === p.playerId && vPos >= 100,
            isTurn,
            isMe,
            color: p.color,
            avatarId,
            nickname: p.nickname,
          });
        }
      });

      // Depth-sort by y so lower pawns naturally overlap higher pawns in 2.5D
      drawQueue.sort((a, b) => a.y - b.y);
      drawQueue.forEach((pawn) => {
        draw3DCharacterPawn(ctx, pawn, avatarImagesRef.current[pawn.avatarId], timeSec);
      });

      // Dedicated overlay pass for local player's "YOU" Arrow & active step counter
      drawQueue.forEach((pawn) => {
        if (pawn.stepBadge) {
          drawActiveStepPill(ctx, pawn);
        }
        if (pawn.isMe) {
          drawYouArrow(ctx, pawn, timeSec);
        }
      });

      // ------------------------------------------------------------------
      // 5. UPDATE & DRAW PARTICLES + FLOATING FX BANNERS
      // ------------------------------------------------------------------
      const nextParticles: ParticleFX[] = [];
      for (const pt of particlesRef.current) {
        pt.life += 1;
        if (pt.life >= pt.maxLife) continue;
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.kind !== 'ring') {
          pt.vy += 0.08;
        } else {
          pt.size += 3.6;
        }
        const progress = pt.life / pt.maxLife;
        const alpha = (1 - progress) * pt.alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (pt.kind === 'ring') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 4 * (1 - progress) + 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.kind === 'star') {
          ctx.fillStyle = pt.color;
          drawStar(ctx, pt.x, pt.y, 4, pt.size, pt.size * 0.45);
          ctx.fill();
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * (1 - progress * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        nextParticles.push(pt);
      }
      particlesRef.current = nextParticles;

      const nextBanners: FloatingBannerFX[] = [];
      for (const b of bannersRef.current) {
        b.life += 1;
        if (b.life >= b.maxLife) continue;
        const progress = b.life / b.maxLife;
        const rise = progress * 46;
        const alpha = progress < 0.15 ? progress / 0.15 : progress > 0.72 ? (1 - progress) / 0.28 : 1;
        const scale = progress < 0.14 ? 0.6 + (progress / 0.14) * 0.5 : 1;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(b.x, b.y - rise);
        ctx.scale(scale, scale);
        ctx.font = '900 22px system-ui, -apple-system, sans-serif';
        const metrics = ctx.measureText(b.text);
        const padX = 16;
        const w = metrics.width + padX * 2;
        const h = 38;

        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = b.bgColor;
        roundRect(ctx, -w / 2, -h / 2, w, h, 19);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = b.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.text, 0, 1);
        ctx.restore();

        nextBanners.push(b);
      }
      bannersRef.current = nextBanners;

      ctx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [myPlayerId]);

  // Build the 100 board tiles in visual top-to-bottom, left-to-right grid order
  const gridTiles = useMemo(() => {
    const tiles: Array<{
      num: number;
      rowFromTop: number;
      col: number;
      isLadderStart: boolean;
      isSnakeHead: boolean;
    }> = [];

    for (let rTop = 0; rTop < 10; rTop++) {
      const rowFromBottom = 9 - rTop;
      for (let col = 0; col < 10; col++) {
        const colInRow = rowFromBottom % 2 === 0 ? col : 9 - col;
        const num = rowFromBottom * 10 + colInRow + 1;
        tiles.push({
          num,
          rowFromTop: rTop,
          col,
          isLadderStart: ladderStartSet.has(num),
          isSnakeHead: snakeHeadSet.has(num),
        });
      }
    }
    return tiles;
  }, [ladderStartSet, snakeHeadSet]);

  return (
    <div
      className="relative w-full max-w-[600px] mx-auto select-none"
      style={{ perspective: '1150px' }}
    >
      {/* 2.5D Tilted Tabletop Slab */}
      <div
        className={`relative w-full aspect-square rounded-2xl sm:rounded-3xl p-2 sm:p-3 transition-transform duration-500 ease-out ${
          boardShakeCss ? 'translate-x-0.5 -translate-y-0.5' : ''
        }`}
        style={{
          transform: is25D ? 'rotateX(14deg) scale(0.98)' : 'rotateX(0deg) scale(1)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, #78350f 0%, #451a03 55%, #271002 100%)',
          boxShadow: is25D
            ? '0 22px 0 #2e1204, 0 34px 48px rgba(0, 0, 0, 0.72), inset 0 2px 3px rgba(253, 224, 71, 0.35)'
            : '0 10px 0 #2e1204, 0 18px 34px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(253, 224, 71, 0.35)',
        }}
      >
        {/* Decorative Gold Corner Studs */}
        <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-20" />
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-20" />
        <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-20" />
        <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-20" />

        {/* Inner Board Playfield */}
        <div className="relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-inner bg-amber-50">
          {/* 10x10 Zig-Zag Tiles Grid */}
          <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
            {gridTiles.map((tile) => {
              const isFinish = tile.num === 100;
              const isStart = tile.num === 1;
              const paletteIdx = (tile.rowFromTop + tile.col) % 4;
              const tileBg = isFinish
                ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400'
                : isStart
                ? 'bg-gradient-to-br from-emerald-200 to-teal-300'
                : paletteIdx === 0
                ? 'bg-[#FFFBEB]'
                : paletteIdx === 1
                ? 'bg-[#D1FAE5]'
                : paletteIdx === 2
                ? 'bg-[#FEF3C7]'
                : 'bg-[#E0F2FE]';

              return (
                <div
                  key={tile.num}
                  className={`relative border-[0.5px] border-amber-900/20 flex flex-col justify-between p-0.5 sm:p-1 ${tileBg}`}
                  style={{
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.65), inset 0 -2px 3px rgba(120,53,15,0.08)',
                  }}
                >
                  <div className="flex items-start justify-between leading-none">
                    <span
                      className={`text-[9px] sm:text-[11px] font-black tracking-tight ${
                        isFinish
                          ? 'text-amber-950'
                          : tile.isSnakeHead
                          ? 'text-rose-700'
                          : tile.isLadderStart
                          ? 'text-emerald-800'
                          : 'text-slate-700/90'
                      }`}
                    >
                      {tile.num}
                    </span>

                    {isFinish && <span className="text-[10px] sm:text-xs leading-none">👑</span>}
                    {isStart && <span className="text-[8px] sm:text-[10px] font-black text-emerald-900">GO</span>}
                  </div>

                  {tile.isLadderStart && (
                    <div className="absolute inset-0 bg-emerald-400/15 pointer-events-none flex items-end justify-end p-0.5">
                      <span className="text-[8px] sm:text-[10px] opacity-80">🪜</span>
                    </div>
                  )}
                  {tile.isSnakeHead && (
                    <div className="absolute inset-0 bg-rose-400/15 pointer-events-none flex items-end justify-end p-0.5">
                      <span className="text-[8px] sm:text-[10px] opacity-80">🐍</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 60FPS 2.5D Snakes, Ladders, Pawns & Particle Effects Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2.5D CANVAS DRAWING HELPERS
// ============================================================================

function draw25DLadder(
  ctx: CanvasRenderingContext2D,
  ladder: LadderLink,
  timeSec: number,
  isClimbing: boolean
) {
  const start = getTileCenter(ladder.from);
  const end = getTileCenter(ladder.to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const halfWidth = 17;

  // 1. Ground 2.5D cast shadow
  ctx.save();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.26)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;

  const shX = 8;
  const shY = 12;
  const rungCount = Math.max(4, Math.floor(len / 34));

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(start.x + nx * halfWidth * side + shX, start.y + ny * halfWidth * side + shY);
    ctx.lineTo(end.x + nx * halfWidth * side + shX, end.y + ny * halfWidth * side + shY);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const cx = start.x + dx * t + shX;
    const cy = start.y + dy * t + shY;
    ctx.beginPath();
    ctx.moveTo(cx - nx * halfWidth, cy - ny * halfWidth);
    ctx.lineTo(cx + nx * halfWidth, cy + ny * halfWidth);
    ctx.stroke();
  }
  ctx.restore();

  // Active climb golden energy aura!
  if (isClimbing) {
    ctx.save();
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 12);
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 * pulse})`;
    ctx.lineWidth = 44;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Wooden Rungs (underneath side rails)
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const cx = start.x + dx * t;
    const cy = start.y + dy * t;
    const x1 = cx - nx * halfWidth;
    const y1 = cy - ny * halfWidth;
    const x2 = cx + nx * halfWidth;
    const y2 = cy + ny * halfWidth;

    ctx.save();
    ctx.lineCap = 'round';
    // Dark outline
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Warm bamboo fill
    ctx.strokeStyle = isClimbing ? '#fde047' : '#d97706';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Top specular highlight
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x1 - 1, y1 - 1.5);
    ctx.lineTo(x2 - 1, y2 - 1.5);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Side Rails with 2.5D cylindrical gradient
  for (const side of [-1, 1]) {
    const x1 = start.x + nx * halfWidth * side;
    const y1 = start.y + ny * halfWidth * side;
    const x2 = end.x + nx * halfWidth * side;
    const y2 = end.y + ny * halfWidth * side;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = isClimbing ? '#facc15' : '#b45309';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(253, 230, 138, 0.65)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x1 - 1.5, y1 - 1.5);
    ctx.lineTo(x2 - 1.5, y2 - 1.5);
    ctx.stroke();
    ctx.restore();
  }
}

function draw25DSnake(
  ctx: CanvasRenderingContext2D,
  snake: SnakeLink,
  idx: number,
  timeSec: number,
  isAngry: boolean,
  activePawnPos: Point2D
) {
  const STEPS = 44;
  const pts: Array<{ x: number; y: number; z: number; r: number }> = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const p = getSnakeSpinePoint(snake, t, timeSec, isAngry);
    // Natural snake taper: plump mid-body, sleek neck & sharp tail
    const radius =
      t < 0.12
        ? 11 + (t / 0.12) * 5
        : t < 0.58
        ? 16
        : Math.max(3.2, 16 * (1 - (t - 0.58) / 0.44));
    pts.push({ ...p, r: radius });
  }

  // 1. Cast 2.5D ground shadow along the undulating body
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < STEPS; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.lineWidth = a.r * 1.9;
    ctx.beginPath();
    ctx.moveTo(a.x + 8 + a.z * 0.45, a.y + 11 + a.z * 0.55);
    ctx.lineTo(b.x + 8 + b.z * 0.45, b.y + 11 + b.z * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // Angry strike halo at head
  if (isAngry) {
    const headPt = pts[0];
    const pulse = 0.6 + 0.4 * Math.sin(timeSec * 18);
    ctx.save();
    ctx.fillStyle = `rgba(244, 63, 94, ${0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(headPt.x, headPt.y - headPt.z, 38 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Outer dark silhouette rim
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < STEPS; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = a.r * 2 + 5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - a.z);
    ctx.lineTo(b.x, b.y - b.z);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Main 3D shaded cylindrical body
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < STEPS; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.strokeStyle = snake.bodyColor;
    ctx.lineWidth = a.r * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - a.z);
    ctx.lineTo(b.x, b.y - b.z);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Patterned 2.5D scales (stripes, diamonds, or spots)
  ctx.save();
  for (let i = 3; i < STEPS - 3; i += 3) {
    const p = pts[i];
    const next = pts[i + 1];
    const ang = Math.atan2(next.y - next.z - (p.y - p.z), next.x - p.x);

    ctx.save();
    ctx.translate(p.x, p.y - p.z);
    ctx.rotate(ang);
    ctx.fillStyle = snake.accentColor;

    if (snake.pattern === 'stripes') {
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.36, p.r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (snake.pattern === 'diamonds') {
      ctx.globalAlpha = 0.78;
      const d = p.r * 0.62;
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(0, d * 0.75);
      ctx.lineTo(-d, 0);
      ctx.lineTo(0, -d * 0.75);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, -p.r * 0.25, p.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  // 5. Glossy 2.5D specular highlight ridge along top of cylinder
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < STEPS - 2; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
    ctx.lineWidth = Math.max(2, a.r * 0.45);
    ctx.beginPath();
    ctx.moveTo(a.x - a.r * 0.25, a.y - a.z - a.r * 0.38);
    ctx.lineTo(b.x - b.r * 0.25, b.y - b.z - b.r * 0.38);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Expressive 2.5D Snake Head
  const head = pts[0];
  const neck = pts[2];
  // Point head slightly forward opposite to neck direction
  const hx = head.x;
  const hy = head.y - head.z;
  const nx = neck.x;
  const ny = neck.y - neck.z;
  const baseAngle = Math.atan2(hy - ny, hx - nx);
  const sway = Math.sin(timeSec * 2.4 + idx) * 0.12;
  const headAngle = baseAngle + sway;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(headAngle);

  // Flicking forked tongue!
  const tongueCycle = Math.sin(timeSec * 2.6 + idx * 1.9);
  if (isAngry || tongueCycle > 0.45) {
    const ext = isAngry ? 22 + Math.sin(timeSec * 25) * 5 : 10 + (tongueCycle - 0.45) * 20;
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(18 + ext, 0);
    ctx.lineTo(18 + ext + 6, -5);
    ctx.moveTo(18 + ext, 0);
    ctx.lineTo(18 + ext + 6, 5);
    ctx.stroke();
  }

  // Head silhouette & 3D shading
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(2, 0, 23, 18.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-4, -5, 3, 2, 0, 22);
  headGrad.addColorStop(0, snake.accentColor);
  headGrad.addColorStop(0.55, snake.bodyColor);
  headGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(2, 0, 20.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snout gloss
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(6, -5, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(15, -4, 1.5, 0, Math.PI * 2);
  ctx.arc(15, 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Blinking & Tracking Eyes
  const isBlinking = Math.sin(timeSec * 1.1 + idx * 2.7) > 0.96 && !isAngry;
  const lookAngle = Math.atan2(activePawnPos.y - hy, activePawnPos.x - hx) - headAngle;
  const pxOff = Math.cos(lookAngle) * 1.7;
  const pyOff = Math.sin(lookAngle) * 1.7;

  for (const eyeY of [-8.5, 8.5]) {
    if (isBlinking) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-2, eyeY - 3);
      ctx.lineTo(4, eyeY + 3);
      ctx.stroke();
    } else {
      ctx.fillStyle = isAngry ? '#fef08a' : '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1, eyeY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isAngry ? '#dc2626' : '#0f172a';
      ctx.beginPath();
      ctx.ellipse(1.5 + pxOff, eyeY + pyOff, isAngry ? 1.8 : 2.6, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0.3, eyeY - 1.6, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

interface Character3DProfile {
  torsoLight: string;
  torsoDark: string;
  pantsColor: string;
  shoeColor: string;
  skinColor: string;
  accentColor: string;
  handColor?: string;
  capeColor?: string;
  scarfColor?: string;
  headgear?: 'headband' | 'caping' | 'tophat' | 'crown' | 'visor' | 'stars';
}

const CHARACTER_3D_PROFILES: Record<string, Character3DProfile> = {
  budi: {
    torsoLight: '#ffffff',
    torsoDark: '#cbd5e1',
    pantsColor: '#1d4ed8',
    shoeColor: '#dc2626',
    skinColor: '#e09f70',
    accentColor: '#ef4444',
    headgear: 'headband',
  },
  ujang: {
    torsoLight: '#ef4444',
    torsoDark: '#991b1b',
    pantsColor: '#1e293b',
    shoeColor: '#b91c1c',
    skinColor: '#d99163',
    accentColor: '#ffffff',
    handColor: '#dc2626', // Boxing gloves!
  },
  rara: {
    torsoLight: '#22d3ee',
    torsoDark: '#0e7490',
    pantsColor: '#0f172a',
    shoeColor: '#06b6d4',
    skinColor: '#f1b58d',
    accentColor: '#a5f3fc',
    headgear: 'visor',
  },
  koko: {
    torsoLight: '#34d399',
    torsoDark: '#047857',
    pantsColor: '#14532d',
    shoeColor: '#f97316',
    skinColor: '#e6a87c',
    accentColor: '#fb923c',
    headgear: 'visor',
  },
  jaya: {
    torsoLight: '#fb923c',
    torsoDark: '#c2410c',
    pantsColor: '#334155',
    shoeColor: '#ea580c',
    skinColor: '#e09f70',
    accentColor: '#fef08a',
  },
  bayu: {
    torsoLight: '#f97316',
    torsoDark: '#9a3412',
    pantsColor: '#1e1b4b',
    shoeColor: '#facc15',
    skinColor: '#dfa072',
    accentColor: '#fde047',
    scarfColor: '#ef4444',
  },
  siti: {
    torsoLight: '#a78bfa',
    torsoDark: '#5b21b6',
    pantsColor: '#312e81',
    shoeColor: '#ec4899',
    skinColor: '#f0b690',
    accentColor: '#22d3ee',
    headgear: 'caping',
  },
  jago: {
    torsoLight: '#dc2626',
    torsoDark: '#7f1d1d',
    pantsColor: '#0f172a',
    shoeColor: '#f59e0b',
    skinColor: '#e2a375',
    accentColor: '#facc15',
    capeColor: '#ef4444',
    headgear: 'crown',
  },
  luna: {
    torsoLight: '#9333ea',
    torsoDark: '#4c1d95',
    pantsColor: '#1e1b4b',
    shoeColor: '#c084fc',
    skinColor: '#f4bfa0',
    accentColor: '#e879f9',
    capeColor: '#6b21a8',
    headgear: 'tophat',
  },
  bima: {
    torsoLight: '#10b981',
    torsoDark: '#064e3b',
    pantsColor: '#0f172a',
    shoeColor: '#34d399',
    skinColor: '#e2a478',
    accentColor: '#facc15',
    headgear: 'visor',
  },
  nala: {
    torsoLight: '#f472b6',
    torsoDark: '#be185d',
    pantsColor: '#3b0764',
    shoeColor: '#fbbf24',
    skinColor: '#ecb18c',
    accentColor: '#fde047',
    headgear: 'stars',
  },
  rama: {
    torsoLight: '#3b82f6',
    torsoDark: '#1e3a8a',
    pantsColor: '#0f172a',
    shoeColor: '#ef4444',
    skinColor: '#e4a77b',
    accentColor: '#fbbf24',
    scarfColor: '#ef4444',
    headgear: 'crown',
  },
};

interface DrawnPawnData {
  playerId: string;
  x: number;
  y: number;
  z: number;
  spin: number;
  scale: number;
  facing: 1 | -1;
  walkCycle: number;
  isWalking: boolean;
  isClimbing: boolean;
  isCelebrating: boolean;
  stepBadge?: string;
  isTurn: boolean;
  isMe: boolean;
  color: SnakeLadderColor;
  avatarId: string;
  nickname: string;
}

function draw3DCharacterPawn(
  ctx: CanvasRenderingContext2D,
  pawn: DrawnPawnData,
  avatarImg: HTMLImageElement | undefined,
  timeSec: number
) {
  const palette = PAWN_COLORS[pawn.color] || PAWN_COLORS.red;
  const char3D = CHARACTER_3D_PROFILES[pawn.avatarId] || CHARACTER_3D_PROFILES.budi;
  const px = pawn.x;
  const py = pawn.y - pawn.z;

  // 1. Cast ground shadow & 3D Base Pedestal
  const shadowScale = Math.max(0.45, 1 - pawn.z / 75);
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.beginPath();
  ctx.ellipse(
    px + 5 + pawn.z * 0.25,
    pawn.y + 11 + pawn.z * 0.2,
    21 * shadowScale * pawn.scale,
    11 * shadowScale * pawn.scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // "YOU" floor aura or active turn pulsing ring
  if (pawn.isMe) {
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 4.5);
    ctx.save();
    ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 * pulse})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(px, pawn.y + 7, 25 + pulse * 3, 14 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (pawn.isTurn) {
    const pulse = 0.6 + 0.4 * Math.sin(timeSec * 5.5);
    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.9 * pulse})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(px, pawn.y + 7, 28 + pulse * 5, 16 + pulse * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Transform into Pawn Figurine Space
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(pawn.scale, pawn.scale);
  if (pawn.spin !== 0) {
    ctx.rotate(pawn.spin);
  }

  // 3D Metallic/Glossy Pedestal Disc under the character's feet
  ctx.fillStyle = palette.dark;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 7, 19, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const plinthGrad = ctx.createLinearGradient(-18, -2, 18, 9);
  plinthGrad.addColorStop(0, palette.light);
  plinthGrad.addColorStop(0.5, palette.main);
  plinthGrad.addColorStop(1, palette.dark);
  ctx.fillStyle = plinthGrad;
  ctx.beginPath();
  ctx.ellipse(0, 3.5, 19, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pawn.isMe ? '#6ee7b7' : '#ffffff';
  ctx.lineWidth = pawn.isMe ? 2.6 : 1.8;
  ctx.stroke();

  // Compute limb walk/climb/celebration kinematics
  const phase = pawn.isWalking
    ? pawn.walkCycle * Math.PI * 2
    : pawn.isClimbing
    ? timeSec * 16
    : 0;
  const strideX = pawn.isWalking ? Math.sin(phase) * 7.5 : 0;
  const legLiftL = pawn.isWalking
    ? Math.max(0, Math.cos(phase)) * 4.5
    : pawn.isClimbing
    ? Math.max(0, Math.sin(phase)) * 5
    : 0;
  const legLiftR = pawn.isWalking
    ? Math.max(0, -Math.cos(phase)) * 4.5
    : pawn.isClimbing
    ? Math.max(0, -Math.sin(phase)) * 5
    : 0;
  const bodyBob = pawn.isWalking
    ? Math.abs(Math.sin(phase)) * 2.5
    : pawn.isCelebrating
    ? Math.abs(Math.sin(timeSec * 8)) * 3
    : Math.sin(timeSec * 3.2) * 1.1;

  // Orient 3D body left/right along travel direction
  ctx.save();
  ctx.scale(pawn.facing, 1);
  if (pawn.isWalking) {
    ctx.rotate(0.08); // Subtle forward sprint lean
  }

  // Flowing 3D Cape or Scarf (Jago, Luna, Bayu, Rama)
  if (char3D.capeColor || char3D.scarfColor) {
    const flutter = Math.sin(timeSec * 9 + (pawn.isWalking ? 4 : 0)) * 3;
    ctx.fillStyle = char3D.capeColor || char3D.scarfColor!;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (char3D.capeColor) {
      ctx.moveTo(-4, -18 - bodyBob);
      ctx.quadraticCurveTo(-18, -10 - bodyBob + flutter, -16, 2 - bodyBob + flutter * 0.6);
      ctx.lineTo(-4, 0 - bodyBob);
    } else {
      ctx.moveTo(-3, -18 - bodyBob);
      ctx.quadraticCurveTo(-17, -20 - bodyBob + flutter, -19, -12 - bodyBob + flutter);
      ctx.quadraticCurveTo(-11, -13 - bodyBob, -3, -14 - bodyBob);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 3. Back Arm (shaded darker for 3D depth)
  const backArmAngle = pawn.isCelebrating
    ? -2.35
    : pawn.isClimbing
    ? -1.8 + Math.sin(phase) * 0.5
    : pawn.isWalking
    ? -Math.sin(phase) * 0.7
    : 0.25;
  draw3DLimb(
    ctx,
    -7,
    -16 - bodyBob,
    backArmAngle,
    11,
    4.6,
    char3D.torsoDark,
    char3D.handColor || char3D.skinColor
  );

  // 4. Back & Front 3D Legs + Sneakers
  const drawLeg = (hipX: number, liftY: number, swingX: number, isBack: boolean) => {
    const footX = hipX + swingX;
    const footY = 2 - liftY;
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, -6 - bodyBob);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    ctx.strokeStyle = isBack ? '#0f172a' : char3D.pantsColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hipX, -6 - bodyBob);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    // 3D Sneaker with white sole highlight
    ctx.fillStyle = char3D.shoeColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(footX + 2.2, footY + 1.5, 5.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(footX + 2.5, footY + 3.1, 4.4, 1.1, 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  };

  drawLeg(-4.5, legLiftL, -strideX, true);
  drawLeg(4.5, legLiftR, strideX, false);

  // 5. 3D Sculpted Torso / Outfit
  ctx.save();
  const torsoGrad = ctx.createLinearGradient(-10, -21 - bodyBob, 11, -4 - bodyBob);
  torsoGrad.addColorStop(0, char3D.torsoLight);
  torsoGrad.addColorStop(0.65, char3D.torsoLight);
  torsoGrad.addColorStop(1, char3D.torsoDark);
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  roundRect(ctx, -9.5, -21 - bodyBob, 19, 17, 7);
  ctx.fill();
  ctx.stroke();

  // Outfit accent stripe / belt / chest emblem
  ctx.fillStyle = char3D.accentColor;
  if (pawn.avatarId === 'ujang') {
    // Classic red-white Madura stripes
    ctx.fillRect(-8, -16 - bodyBob, 16, 3);
    ctx.fillRect(-8, -10 - bodyBob, 16, 3);
  } else if (pawn.avatarId === 'bima' || pawn.avatarId === 'jago') {
    // Belt / Cyber trim
    ctx.fillRect(-8.5, -8.5 - bodyBob, 17, 3.5);
  } else {
    // Center emblem / zipper highlight
    ctx.beginPath();
    ctx.arc(2, -13.5 - bodyBob, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 6. Front 3D Arm
  const frontArmAngle = pawn.isCelebrating
    ? -2.45
    : pawn.isClimbing
    ? -1.8 - Math.sin(phase) * 0.5
    : pawn.isWalking
    ? Math.sin(phase) * 0.75
    : -0.22;
  draw3DLimb(
    ctx,
    7.5,
    -16 - bodyBob,
    frontArmAngle,
    11,
    4.8,
    char3D.torsoLight,
    char3D.handColor || char3D.skinColor
  );

  ctx.restore(); // End facing flip

  // 7. 3D Glossy Pixar-Style Head Bust
  const headY = -36 - bodyBob;
  const headR = 17.5;
  ctx.save();
  ctx.translate(pawn.facing * (pawn.isWalking ? 1.5 : 0), headY);

  // Subtle neck & chin shadow
  ctx.fillStyle = char3D.skinColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.fillRect(-4, headR - 4, 8, 6);

  // 3D Outer Sphere & Team Ring
  ctx.fillStyle = palette.main;
  ctx.beginPath();
  ctx.arc(0, 0, headR + 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, -headR, -headR, headR * 2, headR * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = char3D.torsoLight;
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pawn.nickname.slice(0, 2).toUpperCase(), 0, 1);
  }

  // 3D Rim Light + Top Specular Dome Highlight
  ctx.strokeStyle = pawn.isMe ? '#6ee7b7' : '#ffffff';
  ctx.lineWidth = pawn.isMe ? 2.6 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-4.5, -headR * 0.52, 7.5, 3.2, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Golden Crown when celebrating victory at tile 100!
  if (pawn.isCelebrating) {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -headR + 1);
    ctx.lineTo(-12, -headR - 11);
    ctx.lineTo(-4, -headR - 5);
    ctx.lineTo(0, -headR - 13);
    ctx.lineTo(4, -headR - 5);
    ctx.lineTo(12, -headR - 11);
    ctx.lineTo(10, -headR + 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // End head
  ctx.restore(); // End pawn transform
}

function draw3DLimb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  thickness: number,
  sleeveColor: string,
  handColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';

  // Dark silhouette outline
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = thickness + 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.stroke();

  // Colored 3D arm
  ctx.strokeStyle = sleeveColor;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.stroke();

  // Hand / Glove sphere
  ctx.fillStyle = handColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, length + 1.5, thickness * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawActiveStepPill(ctx: CanvasRenderingContext2D, pawn: DrawnPawnData) {
  if (!pawn.stepBadge) return;
  const x = Math.max(40, Math.min(960, pawn.x));
  const y = Math.max(24, pawn.y - pawn.z - 68);

  ctx.save();
  ctx.font = '900 14px system-ui, sans-serif';
  const text = `👣 ${pawn.stepBadge}`;
  const w = ctx.measureText(text).width + 16;
  const h = 24;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function drawYouArrow(ctx: CanvasRenderingContext2D, pawn: DrawnPawnData, timeSec: number) {
  const bob = Math.sin(timeSec * 4.5) * 4.5;
  const baseX = Math.max(36, Math.min(964, pawn.x));
  const tipOffset = pawn.isCelebrating ? 76 : pawn.stepBadge ? 84 : 62;
  const tipY = Math.max(42, pawn.y - pawn.z - tipOffset + bob);

  ctx.save();
  ctx.shadowColor = 'rgba(16, 185, 129, 0.85)';
  ctx.shadowBlur = 10;

  // Crisp "YOU" Pill above arrow
  const pillW = 46;
  const pillH = 21;
  const pillY = tipY - 26;
  const pillGrad = ctx.createLinearGradient(baseX, pillY, baseX, pillY + pillH);
  pillGrad.addColorStop(0, '#34d399');
  pillGrad.addColorStop(1, '#059669');
  ctx.fillStyle = pillGrad;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.2;
  roundRect(ctx, baseX - pillW / 2, pillY, pillW, pillH, 10.5);
  ctx.fill();
  ctx.stroke();

  // Downward Triangle Pointer Arrow aimed directly at player's character
  ctx.fillStyle = '#10b981';
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX - 8, pillY + pillH - 1);
  ctx.lineTo(baseX + 8, pillY + pillH - 1);
  ctx.lineTo(baseX, tipY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // "YOU" Label Text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#022c22';
  ctx.font = '900 12.5px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOU', baseX, pillY + pillH / 2 + 0.5);
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
