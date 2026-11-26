import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Sparkles, Flame, Zap } from 'lucide-react';
import { soundManager } from '../../../components/audio/SoundManager';

interface LudoDiceProps {
  value: number | null;
  canRoll: boolean;
  isMyTurn: boolean;
  onRoll: () => void;
  accentColor?: string;
  validMovesLength?: number;
}

// ============================================================================
// 1. ISOMETRIC 3D DICE COMPONENT (MATCHES USER REFERENCE ASSET DESIGN)
// - 3D Beveled Isometric Cube with Crimson/Ruby Trim
// - Glossy Porcelain Face Plates
// - Face 1: Glowing Ruby Red Gem with Gold Aura Rim
// - Faces 2-6: Sapphire Indigo Dots with Metallic Gold Bevel Rings
// - Perspective Side Faces (Left & Right) with Matching Pips
// ============================================================================

interface IsometricDiceFaceProps {
  topValue: number;
  isRolling?: boolean;
}

export const IsometricDice3D: React.FC<IsometricDiceFaceProps> = ({
  topValue,
  isRolling = false,
}) => {
  // Clamp value between 1 and 6 (default 1 if null/unspecified)
  const val = Math.max(1, Math.min(6, Math.floor(topValue || 1)));

  // Perspective dots configuration on the 3 visible faces
  // Standard dice layout: opposite sides sum to 7
  // When Top = val:
  // - Left face displays complementary opposite pair
  // - Right face displays third face
  const SIDE_PIPS: Record<number, { left: number; right: number }> = {
    1: { left: 2, right: 3 },
    2: { left: 1, right: 3 },
    3: { left: 1, right: 2 },
    4: { left: 2, right: 1 },
    5: { left: 3, right: 1 },
    6: { left: 2, right: 4 },
  };

  const sideConfig = SIDE_PIPS[val] || { left: 2, right: 3 };

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center select-none pointer-events-none filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.55)]">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Crimson Red Bevel Outer Gradients */}
          <linearGradient id="dice_bevel_outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="25%" stopColor="#dc2626" />
            <stop offset="70%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>

          <linearGradient id="dice_bevel_ridge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          {/* Top Face Glossy White Porcelain */}
          <linearGradient id="dice_face_top" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Left Face Light Shadow Porcelain */}
          <linearGradient id="dice_face_left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Right Face Deeper Shadow Porcelain */}
          <linearGradient id="dice_face_right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Ruby Gem Gradient for Dot #1 */}
          <radialGradient id="ruby_gem_grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="35%" stopColor="#ef4444" />
            <stop offset="75%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>

          {/* Gold Aura Ring for Ruby Dot #1 */}
          <radialGradient id="ruby_gold_aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Sapphire Indigo Dot Gradient for Dots 2-6 */}
          <radialGradient id="pip_indigo_grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="45%" stopColor="#312e81" />
            <stop offset="85%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Specular Edge Filter */}
          <filter id="soft_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* A. 3D CRIMSON BEVEL CUBE BODY (Rounded Isometric Silhouette)   */}
        {/* ------------------------------------------------------------- */}
        <path
          d="
            M 60 14
            C 63 14, 99 33, 101 35
            C 103 37, 103 76, 101 78
            C 99 80, 63 99, 60 100
            C 57 99, 21 80, 19 78
            C 17 76, 17 37, 19 35
            C 21 33, 57 14, 60 14
            Z
          "
          fill="url(#dice_bevel_outer)"
          stroke="#450a0a"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* ------------------------------------------------------------- */}
        {/* B. TOP FACE PORCELAIN PLATE                                   */}
        {/* Vertices: (60, 18) -> (97, 37) -> (60, 55) -> (23, 37)        */}
        {/* ------------------------------------------------------------- */}
        <path
          d="
            M 60 19
            L 96 37.5
            L 60 55
            L 24 37.5
            Z
          "
          fill="url(#dice_face_top)"
          stroke="#991b1b"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ------------------------------------------------------------- */}
        {/* C. LEFT FACE PORCELAIN PLATE                                  */}
        {/* Vertices: (24, 41) -> (58, 58) -> (58, 94) -> (24, 76)        */}
        {/* ------------------------------------------------------------- */}
        <path
          d="
            M 24 41
            L 58 58
            L 58 94
            L 24 76.5
            Z
          "
          fill="url(#dice_face_left)"
          stroke="#991b1b"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ------------------------------------------------------------- */}
        {/* D. RIGHT FACE PORCELAIN PLATE                                 */}
        {/* Vertices: (62, 58) -> (96, 41) -> (96, 76.5) -> (62, 94)      */}
        {/* ------------------------------------------------------------- */}
        <path
          d="
            M 62 58
            L 96 41
            L 96 76.5
            L 62 94
            Z
          "
          fill="url(#dice_face_right)"
          stroke="#991b1b"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ------------------------------------------------------------- */}
        {/* E. GLOSSY BEVEL HIGHLIGHT ACCENTS                             */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 27 37.5 L 60 21 L 93 37.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 60 21 L 60 56"
          fill="none"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* ------------------------------------------------------------- */}
        {/* F. LEFT FACE PERSPECTIVE PIPS                                 */}
        {/* ------------------------------------------------------------- */}
        {sideConfig.left === 1 && (
          <ellipse cx="41" cy="67" rx="3.6" ry="6" transform="rotate(18, 41, 67)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
        )}
        {sideConfig.left === 2 && (
          <>
            <ellipse cx="36" cy="58" rx="3.2" ry="5.2" transform="rotate(18, 36, 58)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
            <ellipse cx="46" cy="76" rx="3.2" ry="5.2" transform="rotate(18, 46, 76)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
          </>
        )}
        {sideConfig.left === 3 && (
          <>
            <ellipse cx="33" cy="54" rx="2.8" ry="4.8" transform="rotate(18, 33, 54)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
            <ellipse cx="41" cy="67" rx="2.8" ry="4.8" transform="rotate(18, 41, 67)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
            <ellipse cx="49" cy="80" rx="2.8" ry="4.8" transform="rotate(18, 49, 80)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.85" />
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* G. RIGHT FACE PERSPECTIVE PIPS                                */}
        {/* ------------------------------------------------------------- */}
        {sideConfig.right === 1 && (
          <ellipse cx="79" cy="67" rx="3.6" ry="6" transform="rotate(-18, 79, 67)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
        )}
        {sideConfig.right === 2 && (
          <>
            <ellipse cx="74" cy="76" rx="3.2" ry="5.2" transform="rotate(-18, 74, 76)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="84" cy="58" rx="3.2" ry="5.2" transform="rotate(-18, 84, 58)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
          </>
        )}
        {sideConfig.right === 3 && (
          <>
            <ellipse cx="71" cy="80" rx="2.8" ry="4.8" transform="rotate(-18, 71, 80)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="79" cy="67" rx="2.8" ry="4.8" transform="rotate(-18, 79, 67)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="87" cy="54" rx="2.8" ry="4.8" transform="rotate(-18, 87, 54)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
          </>
        )}
        {sideConfig.right === 4 && (
          <>
            <ellipse cx="73" cy="62" rx="2.6" ry="4.4" transform="rotate(-18, 73, 62)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="85" cy="54" rx="2.6" ry="4.4" transform="rotate(-18, 85, 54)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="73" cy="80" rx="2.6" ry="4.4" transform="rotate(-18, 73, 80)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
            <ellipse cx="85" cy="72" rx="2.6" ry="4.4" transform="rotate(-18, 85, 72)" fill="#1e1b4b" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75" />
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* H. TOP FACE PRIMARY PIPS (1 TO 6)                             */}
        {/* ------------------------------------------------------------- */}

        {/* --- FACE 1: GLOWING RUBY GEM WITH GOLD AURA --- */}
        {val === 1 && (
          <g className="cursor-pointer">
            {/* Soft Ambient Gold Aura Glow */}
            <ellipse cx="60" cy="37" rx="14" ry="7.5" fill="url(#ruby_gold_aura)" />
            {/* Metallic Gold Rim Bevel */}
            <ellipse cx="60" cy="37" rx="9" ry="4.8" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.9" />
            {/* Inner Ruby Gem Body */}
            <ellipse cx="60" cy="37" rx="7.4" ry="3.9" fill="url(#ruby_gem_grad)" />
            {/* Glossy White Specular Crescent Highlight */}
            <path
              d="M 56 35.5 C 57 34.5, 62 34.5, 64 35.5 C 62 36.5, 57 36.5, 56 35.5 Z"
              fill="rgba(255, 255, 255, 0.95)"
            />
          </g>
        )}

        {/* --- FACE 2: DIAGONAL SAPPHIRE DOTS --- */}
        {val === 2 && (
          <g>
            {[
              { cx: 47, cy: 30 },
              { cx: 73, cy: 44 },
            ].map((p, idx) => (
              <g key={idx}>
                <ellipse cx={p.cx} cy={p.cy} rx="5.6" ry="3.2" fill="#d97706" />
                <ellipse cx={p.cx} cy={p.cy} rx="4.6" ry="2.6" fill="url(#pip_indigo_grad)" stroke="#fef08a" strokeWidth="0.6" />
                <ellipse cx={p.cx - 1.2} cy={p.cy - 0.7} rx="1.4" ry="0.8" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
        )}

        {/* --- FACE 3: DIAGONAL 3 SAPPHIRE DOTS --- */}
        {val === 3 && (
          <g>
            {[
              { cx: 44, cy: 28 },
              { cx: 60, cy: 37 },
              { cx: 76, cy: 46 },
            ].map((p, idx) => (
              <g key={idx}>
                <ellipse cx={p.cx} cy={p.cy} rx="5.4" ry="3.1" fill="#d97706" />
                <ellipse cx={p.cx} cy={p.cy} rx="4.4" ry="2.5" fill="url(#pip_indigo_grad)" stroke="#fef08a" strokeWidth="0.6" />
                <ellipse cx={p.cx - 1.2} cy={p.cy - 0.7} rx="1.3" ry="0.7" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
        )}

        {/* --- FACE 4: 2x2 SAPPHIRE DOTS --- */}
        {val === 4 && (
          <g>
            {[
              { cx: 47, cy: 29 },
              { cx: 73, cy: 29 },
              { cx: 47, cy: 45 },
              { cx: 73, cy: 45 },
            ].map((p, idx) => (
              <g key={idx}>
                <ellipse cx={p.cx} cy={p.cy} rx="5" ry="2.9" fill="#d97706" />
                <ellipse cx={p.cx} cy={p.cy} rx="4.1" ry="2.3" fill="url(#pip_indigo_grad)" stroke="#fef08a" strokeWidth="0.6" />
                <ellipse cx={p.cx - 1.1} cy={p.cy - 0.6} rx="1.2" ry="0.6" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
        )}

        {/* --- FACE 5: 4 CORNERS + 1 CENTER DOT --- */}
        {val === 5 && (
          <g>
            {[
              { cx: 46, cy: 28 },
              { cx: 74, cy: 28 },
              { cx: 60, cy: 37 },
              { cx: 46, cy: 46 },
              { cx: 74, cy: 46 },
            ].map((p, idx) => (
              <g key={idx}>
                <ellipse cx={p.cx} cy={p.cy} rx="4.8" ry="2.7" fill="#d97706" />
                <ellipse cx={p.cx} cy={p.cy} rx="3.9" ry="2.2" fill="url(#pip_indigo_grad)" stroke="#fef08a" strokeWidth="0.6" />
                <ellipse cx={p.cx - 1.1} cy={p.cy - 0.6} rx="1.1" ry="0.6" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
        )}

        {/* --- FACE 6: 2 PARALLEL COLUMNS OF 3 SAPPHIRE DOTS --- */}
        {val === 6 && (
          <g>
            {[
              { cx: 45, cy: 27 },
              { cx: 45, cy: 37 },
              { cx: 45, cy: 47 },
              { cx: 75, cy: 27 },
              { cx: 75, cy: 37 },
              { cx: 75, cy: 47 },
            ].map((p, idx) => (
              <g key={idx}>
                <ellipse cx={p.cx} cy={p.cy} rx="4.6" ry="2.6" fill="#d97706" />
                <ellipse cx={p.cx} cy={p.cy} rx="3.7" ry="2.1" fill="url(#pip_indigo_grad)" stroke="#fef08a" strokeWidth="0.6" />
                <ellipse cx={p.cx - 1.0} cy={p.cy - 0.6} rx="1.0" ry="0.5" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

// ============================================================================
// 2. MAIN REALISTIC LUDO DICE CONTROLLER COMPONENT
// ============================================================================

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  canRoll,
  isMyTurn,
  onRoll,
  accentColor = '#f59e0b',
  validMovesLength,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [displayedValue, setDisplayedValue] = useState<number>(value || 1);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(value);
  const [showNumberBanner, setShowNumberBanner] = useState(false);
  const [showDustImpact, setShowDustImpact] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [rollSeqId, setRollSeqId] = useState(0);

  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const landTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAwaitingServerResultRef = useRef<boolean>(false);
  const rollStartTimeRef = useRef<number>(0);
  const prevValueRef = useRef<number | null>(value);

  // 1. Function to start airborne 3D tumbling & fast face-shuffling
  const startTumbling = () => {
    setIsRolling(true);
    setIsBouncing(false);
    setShowNumberBanner(false);
    setShowDustImpact(false);
    setShowShockwave(false);
    setRollSeqId((prev) => prev + 1);

    soundManager.playDiceRoll();

    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    shuffleTimerRef.current = setInterval(() => {
      setDisplayedValue((prev) => {
        let next = Math.floor(Math.random() * 6) + 1;
        while (next === prev) next = Math.floor(Math.random() * 6) + 1;
        return next;
      });
    }, 45);
  };

  // 2. Function to execute physical landing on the authoritative value
  const landOnAuthoritativeNumber = (finalVal: number) => {
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    if (landTimeoutRef.current) {
      clearTimeout(landTimeoutRef.current);
      landTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    const clampedVal = Math.max(1, Math.min(6, Math.floor(finalVal || 1)));

    setDisplayedValue(clampedVal);
    setRevealedNumber(clampedVal);
    setIsRolling(false);
    setIsBouncing(true);
    setShowDustImpact(true);
    setShowShockwave(true);
    setShowNumberBanner(true);

    // Primary impact thump & melodic number reveal chime
    soundManager.playDiceImpact();
    soundManager.playNumberReveal(clampedVal);

    // Secondary hop impact sound
    setTimeout(() => {
      soundManager.playDiceImpact();
    }, 240);

    // End physical bounce & ground shockwave
    setTimeout(() => {
      setIsBouncing(false);
      setShowShockwave(false);
      setShowDustImpact(false);
    }, 620);

    // Keep text banner visible for 3.2s so player clearly reads and enjoys it
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setShowNumberBanner(false);
    }, 3200);
  };

  // Sync with incoming server value changes (Handles server response or opponent roll)
  useEffect(() => {
    if (value !== null && value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      if (isAwaitingServerResultRef.current) {
        // Player's manual roll has arrived from server!
        isAwaitingServerResultRef.current = false;
        const elapsed = Date.now() - rollStartTimeRef.current;
        const minFlightDuration = 420; // Snappy 3D tumbling
        const remaining = Math.max(0, minFlightDuration - elapsed);

        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        landTimeoutRef.current = setTimeout(() => {
          landOnAuthoritativeNumber(value);
        }, remaining);
      } else {
        // Opponent or Bot rolled in multiplayer!
        if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
        startTumbling();
        landTimeoutRef.current = setTimeout(() => {
          landOnAuthoritativeNumber(value);
        }, 420);
      }
    } else if (value === null) {
      prevValueRef.current = null;
      isAwaitingServerResultRef.current = false;
    }
  }, [value]);

  // Handle player clicking the dice or "ROLL!" button
  const handleClick = () => {
    if (!canRoll || !isMyTurn || isRolling || isBouncing) return;

    isAwaitingServerResultRef.current = true;
    rollStartTimeRef.current = Date.now();

    // Start local tumbling animation
    startTumbling();

    // Notify server to execute authoritative dice roll
    onRoll();

    // Safety timeout: if server doesn't respond within 3500ms, fall back to random (1-6)
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (isAwaitingServerResultRef.current) {
        isAwaitingServerResultRef.current = false;
        const randomFallback = Math.floor(Math.random() * 6) + 1;
        landOnAuthoritativeNumber(randomFallback);
      }
    }, 3500);
  };

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
      if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const isClickable = canRoll && isMyTurn && !isRolling && !isBouncing;

  return (
    <div className="relative flex flex-col items-center justify-center select-none pt-12 pb-1">
      {/* ------------------------------------------------------------- */}
      {/* 1. TEXT ANNOUNCEMENT BANNER - FLOATING CLEANLY ABOVE THE DICE  */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {showNumberBanner && revealedNumber !== null && (
          <motion.div
            key={`announcement-${rollSeqId}`}
            initial={{ scale: 0.6, y: 10, opacity: 0 }}
            animate={{
              scale: [0.6, 1.15, 1],
              y: 0,
              opacity: 1,
            }}
            exit={{ scale: 0.7, y: -15, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 18,
              mass: 0.6,
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center justify-center whitespace-nowrap"
          >
            {/* Main Arcade Announcement Badge */}
            <div
              className={`relative flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border-2 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md ${
                revealedNumber === 6
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 border-yellow-200 shadow-[0_0_35px_rgba(251,191,36,0.95)] animate-pulse'
                  : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.6)]'
              }`}
            >
              {/* Number Stamp Bubble */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-sm sm:text-base font-mono shadow-inner ${
                  revealedNumber === 6
                    ? 'bg-yellow-300 text-red-950 border border-yellow-100 shadow-[0_0_10px_rgba(254,240,138,0.8)]'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                }`}
              >
                {revealedNumber}
              </div>

              {/* Bold Indonesian Text Description */}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {revealedNumber === 6
                    ? 'ANGKA 6! LEMPAR LAGI! 🎉'
                    : `MENDAPATKAN ANGKA ${revealedNumber}!`}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold ${
                    revealedNumber === 6 ? 'text-yellow-100' : 'text-amber-400'
                  }`}
                >
                  {revealedNumber === 6
                    ? '🔥 Bidak Bisa Keluar Base Atau Maju 6 Petak'
                    : `👉 Maju ${revealedNumber} Petak Di Lintasan`}
                </span>
              </div>

              {/* Icon Flair */}
              {revealedNumber === 6 ? (
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-200 fill-yellow-200 animate-bounce" />
              ) : (
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-spin" />
              )}
            </div>

            {/* Floating Comic Stars */}
            <span className="absolute -left-3 -top-1.5 text-xs animate-ping">✨</span>
            <span className="absolute -right-3 -top-1.5 text-xs animate-ping">⭐</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. PHYSICAL 3D DICE CONTAINER & MAXIMIZED BOUNCE / ROTATION    */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Dynamic Ground Contact Shadow (scales/squashes with bounces) */}
        <motion.div
          animate={
            isRolling
              ? {
                  scaleX: [1, 0.35, 0.22, 0.45, 0.85, 1],
                  scaleY: [1, 0.3, 0.2, 0.4, 0.8, 1],
                  opacity: [0.6, 0.2, 0.1, 0.25, 0.65, 0.6],
                }
              : isBouncing
              ? {
                  scaleX: [1.5, 0.72, 1.25, 0.9, 1],
                  scaleY: [1.4, 0.68, 1.2, 0.9, 1],
                  opacity: [0.85, 0.35, 0.72, 0.45, 0.55],
                }
              : { scaleX: 1, scaleY: 1, opacity: 0.5 }
          }
          transition={{ duration: isRolling ? 0.75 : 0.62 }}
          className="absolute bottom-2 w-20 h-4 rounded-full bg-black/60 blur-sm pointer-events-none"
        />

        {/* Floor Shockwave Ring on Impact */}
        <AnimatePresence>
          {showShockwave && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0.95 }}
              animate={{ scale: 2.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute bottom-1 w-20 h-5 rounded-full border-2 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8)] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* 3D Tumbling, Airborne Parabola, and Multi-Stage Bounce Body */}
        <motion.button
          type="button"
          disabled={!isClickable}
          onClick={handleClick}
          style={{
            perspective: 1200,
            transformStyle: 'preserve-3d',
          }}
          animate={
            isRolling
              ? {
                  // Dramatic Parabolic Arc Jump into the air
                  y: [0, -85, -100, -75, -25, 0],
                  scale: [1, 1.25, 1.35, 1.2, 1],
                  // Multi-axis 3D rotation tumbling
                  rotateZ: [0, 180, 360, 540, 720],
                  rotateX: [0, 45, -45, 30, 0],
                  rotateY: [0, -45, 45, -30, 0],
                }
              : isBouncing
              ? {
                  // Multi-Stage Physical Elastic Bounce Sequence:
                  // 1. Heavy Squash -> 2. High Hop & Stretch -> 3. Secondary Squash -> 4. Micro-Hop -> 5. Settle
                  y: [0, -34, 0, -12, 0],
                  scaleX: [1.38, 0.88, 1.18, 0.95, 1],
                  scaleY: [0.62, 1.18, 0.86, 1.05, 1],
                  rotateZ: [0, -14, 6, -3, 0],
                }
              : isClickable
              ? {
                  scale: [1, 1.06, 1],
                  transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
                }
              : {}
          }
          transition={{
            duration: isRolling ? 0.75 : 0.62,
            ease: isRolling ? 'easeInOut' : 'easeOut',
          }}
          className={`relative z-10 flex items-center justify-center p-1 rounded-2xl focus:outline-none transition-transform ${
            isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'
          }`}
          title={isClickable ? 'Klik untuk Melempar Dadu!' : undefined}
        >
          {/* Active Player Glowing Aura Pulsing Ring */}
          {isClickable && (
            <span className="absolute -inset-2 rounded-full border-2 border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.85)] animate-pulse pointer-events-none" />
          )}

          {/* WIND SWOOSH ARCS (Active during 3D tumbling - High Speed Whirl) */}
          {isRolling && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg
                viewBox="0 0 100 100"
                className="w-36 h-36 animate-spin filter drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              >
                {/* Motion swoosh trail 1 (White streak) */}
                <path
                  d="M 15 50 A 35 35 0 0 1 85 50"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.95)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="50 25"
                />
                {/* Motion swoosh trail 2 (Golden streak) */}
                <path
                  d="M 85 50 A 35 35 0 0 1 15 50"
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.85)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="40 30"
                />
                {/* Motion swoosh trail 3 (Crimson red fire trail) */}
                <path
                  d="M 50 15 A 35 35 0 0 1 50 85"
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.75)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="30 35"
                />
              </svg>
            </div>
          )}

          {/* CARTOON DUST PUFFS ON GROUND IMPACT (Left & Right Spurt) */}
          <AnimatePresence>
            {showDustImpact && (
              <div className="absolute -bottom-2 inset-x-0 pointer-events-none flex items-center justify-between px-1">
                {/* Left Dust Cloud */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 1, x: 5 }}
                  animate={{ scale: [0.2, 1.4, 0.8], opacity: [1, 0.9, 0], x: -22, y: -10 }}
                  transition={{ duration: 0.52 }}
                  className="w-7 h-5 rounded-full bg-slate-300/85 blur-[1px] shadow-sm"
                />
                {/* Right Dust Cloud */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 1, x: -5 }}
                  animate={{ scale: [0.2, 1.4, 0.8], opacity: [1, 0.9, 0], x: 22, y: -10 }}
                  transition={{ duration: 0.52 }}
                  className="w-7 h-5 rounded-full bg-slate-300/85 blur-[1px] shadow-sm"
                />
              </div>
            )}
          </AnimatePresence>

          {/* 3D Isometric Dice Cube Body */}
          <IsometricDice3D
            topValue={displayedValue}
            isRolling={isRolling}
          />
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. JUICY ARCADE "ROLL!" ACTION BUTTON                           */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-1 flex flex-col items-center gap-1">
        {isClickable ? (
          <motion.button
            type="button"
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 2 }}
            className="group relative px-6 py-2 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 border-t-2 border-amber-200 border-b-[5px] border-amber-900 shadow-[0_8px_20px_rgba(245,158,11,0.5)] active:border-b-[2px] transition-all flex items-center gap-2 cursor-pointer"
          >
            {/* Inner Glossy Glint Overlay */}
            <span className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-white/40 pointer-events-none" />

            <Dices className="w-5 h-5 text-slate-950 group-hover:rotate-45 transition-transform duration-300 drop-shadow-sm" />
            <span className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-widest drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] font-mono">
              ROLL!
            </span>
            <Sparkles className="w-4 h-4 text-amber-950 animate-spin" />
          </motion.button>
        ) : isRolling || isBouncing ? (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300 shadow-md animate-pulse">
            <Dices className="w-4 h-4 animate-spin text-amber-300" />
            <span>Melempar Dadu...</span>
          </div>
        ) : isMyTurn && !canRoll ? (
          validMovesLength === 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-amber-500/40 text-[11px] font-bold text-amber-400 shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tidak ada langkah valid, passing giliran...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-[11px] font-black text-amber-300 animate-bounce shadow-md">
              <span>👉 Pilih Bidak Yang Berpendar Di Arena!</span>
            </div>
          )
        ) : (
          <div className="px-3 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400">
            Menunggu giliran lawan...
          </div>
        )}
      </div>
    </div>
  );
};
