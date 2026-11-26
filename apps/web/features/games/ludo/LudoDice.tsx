import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Sparkles, Flame, Zap } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface LudoDiceProps {
  value: number | null;
  moveSeq: number;
  canRoll: boolean;
  isMyTurn: boolean;
  onRoll: () => void;
  accentColor?: string;
  validMovesLength?: number;
}

// ============================================================================
// 1. TRUE 3D CSS CUBE DICE COMPONENT (6 PHYSICAL FACES, PRESERVE-3D)
// ============================================================================

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

// Target Euler angles (degrees) so each face (1..6) faces the front (+Z) cleanly
const FACE_ANGLES: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: -90 },
  3: { rx: -90, ry: 0 },
  4: { rx: 90, ry: 0 },
  5: { rx: 0, ry: 90 },
  6: { rx: 0, ry: 180 },
};

const CUBE_FACES: Array<{ num: number; transform: string }> = [
  { num: 1, transform: 'rotateY(0deg) translateZ(36px)' },
  { num: 6, transform: 'rotateY(180deg) translateZ(36px)' },
  { num: 2, transform: 'rotateY(90deg) translateZ(36px)' },
  { num: 5, transform: 'rotateY(-90deg) translateZ(36px)' },
  { num: 3, transform: 'rotateX(90deg) translateZ(36px)' },
  { num: 4, transform: 'rotateX(-90deg) translateZ(36px)' },
];

// Inner core planes slightly recessed behind each face to give rich crimson-gold rim depth
const CORE_FACES: string[] = [
  'rotateY(0deg) translateZ(34px)',
  'rotateY(180deg) translateZ(34px)',
  'rotateY(90deg) translateZ(34px)',
  'rotateY(-90deg) translateZ(34px)',
  'rotateX(90deg) translateZ(34px)',
  'rotateX(-90deg) translateZ(34px)',
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
              ? 'absolute w-[22px] h-[22px] rounded-full bg-gradient-to-br from-rose-400 via-red-600 to-red-900 border-2 border-amber-300 shadow-[0_0_10px_rgba(239,68,68,0.75),inset_0_2px_3px_rgba(255,255,255,0.7)] flex items-center justify-center'
              : isSix
              ? 'absolute w-[12px] h-[12px] rounded-full bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-950 border border-amber-400/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.25)]'
              : 'absolute w-[13px] h-[13px] rounded-full bg-gradient-to-br from-indigo-700 via-indigo-950 to-slate-950 border border-amber-300/70 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.25)]'
          }
        >
          {isOne && (
            <span className="w-2 h-1 rounded-full bg-white/85 -translate-y-1 -rotate-12 blur-[0.3px]" />
          )}
        </span>
      ))}
    </div>
  );
};

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  moveSeq,
  canRoll,
  isMyTurn,
  onRoll,
  validMovesLength,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(value);
  const [showNumberBanner, setShowNumberBanner] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [rollSeqId, setRollSeqId] = useState(0);

  // Continuous cumulative 3D cube rotation angles (never snaps backwards!)
  const initialVal = value && value >= 1 && value <= 6 ? value : 1;
  const initialAngle = FACE_ANGLES[initialVal];
  const [cubeRotation, setCubeRotation] = useState<{ rx: number; ry: number; rz: number }>({
    rx: initialAngle.rx,
    ry: initialAngle.ry,
    rz: 0,
  });

  const cubeRotRef = useRef(cubeRotation);
  cubeRotRef.current = cubeRotation;

  const landTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const impactTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAwaitingServerResultRef = useRef<boolean>(false);
  const rollStartTimeRef = useRef<number>(0);
  const prevValueRef = useRef<number | null>(value);

  // RAF spin loop — keeps the cube tumbling until the server value arrives
  const rollingRafRef = useRef<number | null>(null);
  const isRollingRef = useRef(false);
  const prevSeqRef = useRef<number>(moveSeq);

  // Computes next forward Euler angle aligned modulo 360 to targetDeg
  const nextForwardAngle = (current: number, targetDeg: number, extraTurns: number = 1): number => {
    const mod = ((current % 360) + 360) % 360;
    const targetMod = ((targetDeg % 360) + 360) % 360;
    let delta = targetMod - mod;
    if (delta <= 0) delta += 360;
    return current + delta + extraTurns * 360;
  };

  const stopRafSpin = () => {
    if (rollingRafRef.current !== null) {
      cancelAnimationFrame(rollingRafRef.current);
      rollingRafRef.current = null;
    }
  };

  // 1. Launch dice into continuous 3D spin — RAF loop keeps it moving every frame
  const startTumbling = () => {
    isRollingRef.current = true;
    setIsRolling(true);
    setIsLanding(false);
    setShowNumberBanner(false);
    setShowShockwave(false);
    setRollSeqId((prev) => prev + 1);

    soundManager.playDiceRoll();

    // Continuous RAF spin loop — increments rotation every animation frame
    // so the cube never freezes while awaiting the server response.
    const spin = () => {
      if (!isRollingRef.current) return;
      const cur = cubeRotRef.current;
      const next = {
        rx: cur.rx + 5.5,
        ry: cur.ry + 7.5,
        rz: cur.rz + 3.5,
      };
      cubeRotRef.current = next;
      setCubeRotation(next);
      rollingRafRef.current = requestAnimationFrame(spin);
    };
    stopRafSpin(); // cancel any stale loop before starting
    rollingRafRef.current = requestAnimationFrame(spin);
  };

  // 2. Smoothly ease onto the authoritative 3D face + subtle impact bounce
  const landOnAuthoritativeNumber = (finalVal: number) => {
    // Stop the continuous spin loop before snapping to the face
    isRollingRef.current = false;
    stopRafSpin();

    if (landTimeoutRef.current) {
      clearTimeout(landTimeoutRef.current);
      landTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    const clampedVal = Math.max(1, Math.min(6, Math.floor(finalVal || 1)));
    const target = FACE_ANGLES[clampedVal] || FACE_ANGLES[1];
    const cur = cubeRotRef.current;

    setCubeRotation({
      rx: nextForwardAngle(cur.rx, target.rx, 0),
      ry: nextForwardAngle(cur.ry, target.ry, 0),
      rz: nextForwardAngle(cur.rz, 0, 0),
    });

    setRevealedNumber(clampedVal);
    setIsRolling(false);
    setIsLanding(true);
    setShowNumberBanner(true);
    setShowShockwave(true);
    soundManager.playDiceImpact();
    soundManager.playNumberReveal(clampedVal);

    if (impactTimeoutRef.current) clearTimeout(impactTimeoutRef.current);
    impactTimeoutRef.current = setTimeout(() => {
      setIsLanding(false);
      setShowShockwave(false);
    }, 300);

    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setShowNumberBanner(false);
    }, 2400);
  };

  // Sync with incoming server value changes — triggered by moveSeq (state version)
  useEffect(() => {
    if (moveSeq > prevSeqRef.current && value !== null) {
      prevSeqRef.current = moveSeq;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      if (isAwaitingServerResultRef.current) {
        isAwaitingServerResultRef.current = false;
        const elapsed = Date.now() - rollStartTimeRef.current;
        const minFlightDuration = 320;
        const remaining = Math.max(0, minFlightDuration - elapsed);

        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        landTimeoutRef.current = setTimeout(() => {
          landOnAuthoritativeNumber(value);
        }, remaining);
      } else {
        // Opponent or Bot rolled — tumble then land
        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        startTumbling();
        landTimeoutRef.current = setTimeout(() => {
          landOnAuthoritativeNumber(value);
        }, 320);
      }
    }
  }, [moveSeq, value]);

  const handleClick = () => {
    if (!canRoll || !isMyTurn || isRolling || isLanding) return;

    isAwaitingServerResultRef.current = true;
    rollStartTimeRef.current = Date.now();

    startTumbling();
    onRoll();

    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (isAwaitingServerResultRef.current) {
        isAwaitingServerResultRef.current = false;
        isRollingRef.current = false;
        stopRafSpin();
        setIsRolling(false);
        setIsLanding(false);
      }
    }, 4500);
  };

  useEffect(() => {
    return () => {
      isRollingRef.current = false;
      stopRafSpin();
      if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      if (impactTimeoutRef.current) clearTimeout(impactTimeoutRef.current);
    };
  }, []);

  const isClickable = canRoll && isMyTurn && !isRolling && !isLanding;

  return (
    <div className="relative flex flex-col items-center justify-center select-none pt-11 pb-1">
      {/* 1. FLOATING RESULT BANNER */}
      <AnimatePresence>
        {showNumberBanner && revealedNumber !== null && (
          <motion.div
            key={`announcement-${rollSeqId}`}
            initial={{ scale: 0.75, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 24 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center whitespace-nowrap"
          >
            <div
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md ${
                revealedNumber === 6
                  ? 'bg-gradient-to-r from-rose-600 via-amber-500 to-orange-500 border-yellow-200 shadow-[0_0_28px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-950/95 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-black text-sm font-mono shadow-inner ${
                  revealedNumber === 6
                    ? 'bg-yellow-300 text-red-950'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
                }`}
              >
                {revealedNumber}
              </div>

              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider font-mono">
                  {revealedNumber === 6
                    ? 'ANGKA 6! LEMPAR LAGI! 🎉'
                    : `DAPAT ANGKA ${revealedNumber}!`}
                </span>
                <span className={`text-[9px] font-bold ${revealedNumber === 6 ? 'text-yellow-100' : 'text-amber-300'}`}>
                  {revealedNumber === 6
                    ? 'Keluarkan bidak atau maju 6 kotak'
                    : `Maju ${revealedNumber} kotak di lintasan`}
                </span>
              </div>

              {revealedNumber === 6 ? (
                <Flame className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TRUE 3D CUBE DICE STAGE */}
      <div className="relative flex items-center justify-center w-28 h-24">
        {/* Dynamic Ground Shadow */}
        <motion.div
          animate={{
            scaleX: isRolling ? 0.45 : isLanding ? 1.25 : 1,
            scaleY: isRolling ? 0.35 : isLanding ? 1.15 : 1,
            opacity: isRolling ? 0.25 : isLanding ? 0.8 : 0.55,
          }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="absolute bottom-1 w-16 h-4 rounded-full bg-black/75 blur-sm pointer-events-none"
        />

        {/* Impact Shockwave Ring */}
        <AnimatePresence>
          {showShockwave && (
            <motion.div
              initial={{ scale: 0.45, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute bottom-0.5 w-16 h-4 rounded-full border-2 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.9)] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Active Turn Ambient Glow */}
        {isClickable && (
          <motion.div
            animate={{ scale: [0.95, 1.12, 0.95], opacity: [0.45, 0.85, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="absolute w-20 h-20 rounded-full bg-amber-400/20 blur-md border border-amber-400/50 pointer-events-none"
          />
        )}

        {/* Clickable 3D Cube Container */}
        <motion.button
          type="button"
          disabled={!isClickable}
          onClick={handleClick}
          whileHover={isClickable ? { scale: 1.08 } : undefined}
          whileTap={isClickable ? { scale: 0.93 } : undefined}
          animate={
            isRolling
              ? { y: -44, scale: 1.22 }
              : isLanding
              ? { y: [0, 3, -9, 0], scale: [1.08, 0.95, 1.03, 1] }
              : isClickable
              ? {
                  y: [0, -5, 0],
                  transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                }
              : { y: 0, scale: 1 }
          }
          transition={{
            duration: isRolling ? 0.22 : isLanding ? 0.24 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ perspective: 720 }}
          className={`relative z-10 w-[72px] h-[72px] flex items-center justify-center focus:outline-none ${
            isClickable ? 'cursor-pointer' : 'cursor-default'
          }`}
          title={isClickable ? 'Klik untuk Melempar Dadu!' : undefined}
        >
          {/* Camera Perspective Tilt Wrapper (Shows 3 faces cleanly at rest!) */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isRolling
                ? 'rotateX(-8deg) rotateY(10deg)'
                : 'rotateX(-16deg) rotateY(22deg)',
            }}
          >
            {/* Actual Rotating 3D Cube */}
            <motion.div
              animate={{
                rotateX: cubeRotation.rx,
                rotateY: cubeRotation.ry,
                rotateZ: cubeRotation.rz,
              }}
              transition={
                isRolling
                  ? { duration: 0.012, ease: 'linear' }
                  : { duration: 0.24, ease: [0.18, 1.15, 0.32, 1] }
              }
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-[72px] h-[72px]"
            >
              {/* Crimson-Gold Solid Inner Core (prevents gaps at rounded edges) */}
              {CORE_FACES.map((t, i) => (
                <div
                  key={`core_${i}`}
                  style={{ transform: t }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-600 via-red-800 to-red-950"
                />
              ))}

              {/* 6 Porcelain Ivory Outer Faces */}
              {CUBE_FACES.map(({ num, transform }) => (
                <div
                  key={`face_${num}`}
                  style={{
                    transform,
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 55%, #dbeafe 100%)',
                    boxShadow:
                      'inset 0 0 10px rgba(15, 23, 42, 0.12), inset 0 2px 3px rgba(255, 255, 255, 0.9)',
                  }}
                  className="absolute inset-0 rounded-[15px] border-[2px] border-red-700/80 p-1.5"
                >
                  <DiceFacePips face={num} />
                </div>
              ))}
            </motion.div>
          </div>
        </motion.button>
      </div>

      {/* 3. JUICY ARCADE "ROLL!" ACTION BUTTON & STATUS */}
      <div className="mt-1 flex flex-col items-center gap-1">
        {isClickable ? (
          <motion.button
            type="button"
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94, y: 2 }}
            className="group relative px-7 py-2 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 border-t-2 border-amber-200 border-b-[5px] border-amber-900 shadow-[0_8px_22px_rgba(245,158,11,0.5)] active:border-b-[2px] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-white/40 pointer-events-none" />
            <Dices className="w-5 h-5 text-slate-950 group-hover:rotate-45 transition-transform duration-300 drop-shadow-sm" />
            <span className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-widest drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] font-mono">
              ROLL!
            </span>
            <Sparkles className="w-4 h-4 text-amber-950" />
          </motion.button>
        ) : isRolling || isLanding ? (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300 shadow-md">
            <Dices className="w-4 h-4 animate-spin text-amber-300" />
            <span>Melempar Dadu...</span>
          </div>
        ) : isMyTurn && !canRoll ? (
          validMovesLength === 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-amber-500/40 text-[11px] font-bold text-amber-400 shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tidak ada langkah valid, lanjut giliran...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-[11px] font-black text-amber-300 animate-pulse shadow-md">
              <span>👉 Pilih Bidak Yang Berpendar Di Papan!</span>
            </div>
          )
        ) : (
          <div className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400">
            Menunggu giliran lawan...
          </div>
        )}
      </div>
    </div>
  );
};
