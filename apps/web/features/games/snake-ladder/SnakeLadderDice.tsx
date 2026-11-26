'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Sparkles, Flame } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface SnakeLadderDiceProps {
  value: number | null;
  moveSeq: number;
  canRoll: boolean;
  isMyTurn: boolean;
  isAnimatingBoard: boolean;
  onRoll: () => void;
}

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [26, 26],
    [74, 26],
    [50, 50],
    [26, 74],
    [74, 74],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

const FACE_ANGLES: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: -90 },
  3: { rx: -90, ry: 0 },
  4: { rx: 90, ry: 0 },
  5: { rx: 0, ry: 90 },
  6: { rx: 0, ry: 180 },
};

const CUBE_FACES: Array<{ num: number; transform: string }> = [
  { num: 1, transform: 'rotateY(0deg) translateZ(34px)' },
  { num: 6, transform: 'rotateY(180deg) translateZ(34px)' },
  { num: 2, transform: 'rotateY(90deg) translateZ(34px)' },
  { num: 5, transform: 'rotateY(-90deg) translateZ(34px)' },
  { num: 3, transform: 'rotateX(90deg) translateZ(34px)' },
  { num: 4, transform: 'rotateX(-90deg) translateZ(34px)' },
];

const CORE_FACES: string[] = [
  'rotateY(0deg) translateZ(32px)',
  'rotateY(180deg) translateZ(32px)',
  'rotateY(90deg) translateZ(32px)',
  'rotateY(-90deg) translateZ(32px)',
  'rotateX(90deg) translateZ(32px)',
  'rotateX(-90deg) translateZ(32px)',
];

const DiceFacePips: React.FC<{ face: number }> = ({ face }) => {
  const coords = PIP_POSITIONS[face] || PIP_POSITIONS[1];
  const isOne = face === 1;
  const isSix = face === 6;

  return (
    <div className="relative w-full h-full">
      {coords.map(([x, y], idx) => (
        <span
          key={idx}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={
            isOne
              ? 'absolute w-[20px] h-[20px] rounded-full bg-gradient-to-br from-rose-400 via-red-600 to-red-900 border-2 border-amber-300 shadow-[0_0_8px_rgba(239,68,68,0.75)]'
              : isSix
              ? 'absolute w-[11px] h-[11px] rounded-full bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950 border border-amber-400/90'
              : 'absolute w-[12px] h-[12px] rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950 border border-amber-300/60'
          }
        />
      ))}
    </div>
  );
};

export const SnakeLadderDice: React.FC<SnakeLadderDiceProps> = ({
  value,
  moveSeq,
  canRoll,
  isMyTurn,
  isAnimatingBoard,
  onRoll,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(value);
  const [showBanner, setShowBanner] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);

  const initialVal = value && value >= 1 && value <= 6 ? value : 1;
  const initialAngle = FACE_ANGLES[initialVal];
  const [cubeRotation, setCubeRotation] = useState({
    rx: initialAngle.rx,
    ry: initialAngle.ry,
    rz: 0,
  });

  const cubeRotRef = useRef(cubeRotation);
  cubeRotRef.current = cubeRotation;

  const isAwaitingServerRef = useRef(false);
  const rollStartTimeRef = useRef(0);
  const prevSeqRef = useRef<number>(moveSeq);
  const landTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const nextForwardAngle = (current: number, targetDeg: number, extraTurns: number = 1) => {
    const mod = ((current % 360) + 360) % 360;
    const targetMod = ((targetDeg % 360) + 360) % 360;
    let delta = targetMod - mod;
    if (delta <= 0) delta += 360;
    return current + delta + extraTurns * 360;
  };

  const startTumbling = () => {
    setIsRolling(true);
    setIsLanding(false);
    setShowBanner(false);
    setShowShockwave(false);
    soundManager.playDiceRoll();

    const cur = cubeRotRef.current;
    setCubeRotation({
      rx: cur.rx + 540 + Math.floor(Math.random() * 140),
      ry: cur.ry + 640 + Math.floor(Math.random() * 140),
      rz: cur.rz + 360,
    });
  };

  const landOnNumber = (finalVal: number) => {
    if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    const clamped = Math.max(1, Math.min(6, Math.floor(finalVal || 1)));
    const target = FACE_ANGLES[clamped] || FACE_ANGLES[1];
    const cur = cubeRotRef.current;

    setCubeRotation({
      rx: nextForwardAngle(cur.rx, target.rx, 1),
      ry: nextForwardAngle(cur.ry, target.ry, 1),
      rz: nextForwardAngle(cur.rz, 0, 0),
    });

    setRevealedNumber(clamped);
    setIsRolling(false);
    setIsLanding(true);

    setTimeout(() => {
      setShowShockwave(true);
      setShowBanner(true);
      soundManager.playDiceImpact();
      soundManager.playNumberReveal(clamped);
      setTimeout(() => {
        setIsLanding(false);
        setShowShockwave(false);
      }, 360);
    }, 220);

    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setShowBanner(false);
    }, 2200);
  };

  useEffect(() => {
    if (moveSeq > prevSeqRef.current && value !== null) {
      prevSeqRef.current = moveSeq;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      if (isAwaitingServerRef.current) {
        isAwaitingServerRef.current = false;
        const elapsed = Date.now() - rollStartTimeRef.current;
        const remaining = Math.max(0, 320 - elapsed);
        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        landTimeoutRef.current = setTimeout(() => landOnNumber(value), remaining);
      } else {
        startTumbling();
        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        landTimeoutRef.current = setTimeout(() => landOnNumber(value), 320);
      }
    }
  }, [moveSeq, value]);

  const isClickable = canRoll && isMyTurn && !isRolling && !isLanding && !isAnimatingBoard;

  const handleRoll = () => {
    if (!isClickable) return;
    isAwaitingServerRef.current = true;
    rollStartTimeRef.current = Date.now();
    startTumbling();
    onRoll();

    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      isAwaitingServerRef.current = false;
      setIsRolling(false);
      setIsLanding(false);
    }, 4500);
  };

  // Spacebar shortcut to roll when it's your turn (ignoring text inputs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (isClickable) {
        e.preventDefault();
        handleRoll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    return () => {
      if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none pt-10 pb-1">
      {/* Result Announcement Banner */}
      <AnimatePresence>
        {showBanner && revealedNumber !== null && (
          <motion.div
            key={`snake-dice-banner-${moveSeq}`}
            initial={{ scale: 0.75, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap"
          >
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border shadow-2xl backdrop-blur-md ${
                revealedNumber === 6
                  ? 'bg-gradient-to-r from-emerald-600 via-amber-500 to-orange-500 border-yellow-200'
                  : 'bg-slate-950/95 border-emerald-400/70'
              }`}
            >
              <span className="w-6 h-6 rounded-lg bg-amber-300 text-slate-950 font-black text-sm font-mono flex items-center justify-center">
                {revealedNumber}
              </span>
              <span className="text-xs font-black text-white uppercase tracking-wide font-mono">
                {revealedNumber === 6 ? 'ANGKA 6! BONUS LEMPAR! 🎉' : `MAJU ${revealedNumber} PETAK`}
              </span>
              {revealedNumber === 6 ? (
                <Flame className="w-4 h-4 text-yellow-200 animate-bounce" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Cube Stage */}
      <div className="relative flex items-center justify-center w-28 h-24">
        <motion.div
          animate={{
            scaleX: isRolling ? 0.45 : isLanding ? 1.25 : 1,
            scaleY: isRolling ? 0.35 : isLanding ? 1.15 : 1,
            opacity: isRolling ? 0.25 : isLanding ? 0.8 : 0.55,
          }}
          className="absolute bottom-1 w-16 h-4 rounded-full bg-black/75 blur-sm pointer-events-none"
        />

        <AnimatePresence>
          {showShockwave && (
            <motion.div
              initial={{ scale: 0.45, opacity: 0.9 }}
              animate={{ scale: 2.0, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="absolute bottom-0.5 w-16 h-4 rounded-full border-2 border-emerald-300 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {isClickable && (
          <motion.div
            animate={{ scale: [0.95, 1.14, 0.95], opacity: [0.45, 0.85, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
            className="absolute w-20 h-20 rounded-full bg-emerald-400/20 blur-md border border-emerald-400/50 pointer-events-none"
          />
        )}

        <motion.button
          type="button"
          disabled={!isClickable}
          onClick={handleRoll}
          whileHover={isClickable ? { scale: 1.08 } : undefined}
          whileTap={isClickable ? { scale: 0.92 } : undefined}
          animate={
            isRolling
              ? { y: -40, scale: 1.2 }
              : isLanding
              ? { y: [0, 3, -8, 0], scale: [1.06, 0.95, 1.02, 1] }
              : isClickable
              ? {
                  y: [0, -5, 0],
                  transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                }
              : { y: 0, scale: 1 }
          }
          style={{ perspective: 720 }}
          className={`relative z-10 w-[68px] h-[68px] flex items-center justify-center focus:outline-none ${
            isClickable ? 'cursor-pointer' : 'cursor-default'
          }`}
          title={isClickable ? 'Klik atau tekan Spasi untuk Melempar Dadu!' : undefined}
        >
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isRolling ? 'rotateX(-8deg) rotateY(10deg)' : 'rotateX(-16deg) rotateY(22deg)',
            }}
          >
            <motion.div
              animate={{
                rotateX: cubeRotation.rx,
                rotateY: cubeRotation.ry,
                rotateZ: cubeRotation.rz,
              }}
              transition={
                isRolling
                  ? { duration: 0.42, ease: [0.3, 0.85, 0.4, 1] }
                  : { duration: 0.42, ease: [0.18, 1.15, 0.32, 1] }
              }
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-[68px] h-[68px]"
            >
              {CORE_FACES.map((t, i) => (
                <div
                  key={`core_${i}`}
                  style={{ transform: t }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950"
                />
              ))}

              {CUBE_FACES.map(({ num, transform }) => (
                <div
                  key={`face_${num}`}
                  style={{
                    transform,
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 60%, #d1fae5 100%)',
                    boxShadow: 'inset 0 0 10px rgba(15,23,42,0.12), inset 0 2px 3px rgba(255,255,255,0.9)',
                  }}
                  className="absolute inset-0 rounded-[14px] border-2 border-emerald-700/80 p-1.5"
                >
                  <DiceFacePips face={num} />
                </div>
              ))}
            </motion.div>
          </div>
        </motion.button>
      </div>

      {/* Action CTA */}
      <div className="mt-1 flex flex-col items-center gap-1">
        {isClickable ? (
          <motion.button
            type="button"
            onClick={handleRoll}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94, y: 2 }}
            className="group relative px-7 py-2 rounded-2xl bg-gradient-to-b from-emerald-300 via-emerald-500 to-teal-700 border-t-2 border-emerald-200 border-b-[5px] border-emerald-950 shadow-[0_8px_22px_rgba(16,185,129,0.45)] active:border-b-[2px] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Dices className="w-5 h-5 text-slate-950 group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-wider font-mono">
              LEMPAR DADU!
            </span>
            <span className="hidden sm:inline text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950">
              SPACE
            </span>
          </motion.button>
        ) : isRolling || isLanding ? (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-xs font-black text-emerald-300">
            <Dices className="w-4 h-4 animate-spin" />
            <span>Melempar Dadu...</span>
          </div>
        ) : isAnimatingBoard ? (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/70 text-xs font-black text-amber-300 animate-pulse">
            <span>✨ Bidak Sedang Melangkah...</span>
          </div>
        ) : (
          <div className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400">
            Menunggu giliran lawan...
          </div>
        )}
      </div>
    </div>
  );
};
