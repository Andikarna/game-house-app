import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PanjatPinangGameState, ClimberPlayerState, AVATAR_OPTIONS, AvatarId, normalizeAvatarId } from '@gamehouse/shared';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../stores/useGameStore';
import { useEmoteStore } from '../../../stores/useEmoteStore';

interface CanvasProps {
  gameState: PanjatPinangGameState;
  myPlayerId: string;
}

// 3D Player-Centric POV Camera State with orbital rotation, roll, pitch, sway, and shake
interface Camera3D {
  x: number;
  y: number;
  targetY: number;
  roll: number;
  targetRoll: number;
  pitch: number;
  targetPitch: number;
  orbitAngle: number;       // Camera's orbital angle in radians around the 3D cylinder
  targetOrbitAngle: number; // Target angle tracking the local player's POV
  orbitOffset: number;      // Over-the-shoulder dynamic horizontal camera sway
  shake: number;
  fovZoom: number;
}

// Skin tone variations for realistic Indonesian climbers
const REAL_SKIN_PALETTES = [
  { base: '#C68642', highlight: '#E0A96D', shadow: '#8D5524', deepShadow: '#5C3317', name: 'Sawo Matang' },
  { base: '#B57338', highlight: '#D49B6A', shadow: '#7A431D', deepShadow: '#4A250D', name: 'Coklat Tropis' },
  { base: '#D99B61', highlight: '#F0BA86', shadow: '#A06332', deepShadow: '#6B3E18', name: 'Kuning Langsat' },
  { base: '#A25F2A', highlight: '#C4824A', shadow: '#6B3913', deepShadow: '#3D1C05', name: 'Eksotis Gelap' },
  { base: '#BC7B3E', highlight: '#DAA168', shadow: '#834C1E', deepShadow: '#542C0C', name: 'Kuning Perunggu' },
  { base: '#C98A4B', highlight: '#E5AD74', shadow: '#925828', deepShadow: '#603513', name: 'Sawo Emas' },
];

// Indonesian Festival Shorts Styles
const SHORTS_STYLES = [
  { primary: '#DC2626', secondary: '#FFFFFF', pattern: 'merah-putih', trim: '#F59E0B' },
  { primary: '#1E3A8A', secondary: '#60A5FA', pattern: 'batik-blue', trim: '#93C5FD' },
  { primary: '#065F46', secondary: '#34D399', pattern: 'nusantara', trim: '#FCD34D' },
  { primary: '#92400E', secondary: '#FDE68A', pattern: 'batik-parang', trim: '#B45309' },
  { primary: '#581C87', secondary: '#C084FC', pattern: 'kresna', trim: '#E9D5FF' },
  { primary: '#C2410C', secondary: '#FED7AA', pattern: 'bara-api', trim: '#FDBA74' },
];

// Character 64-Sprite System
const SPRITE_CACHE: Record<string, HTMLImageElement> = {};

function getOrLoadSprite(charId: string, pose: string): HTMLImageElement | null {
  const norm = normalizeAvatarId(charId);
  const key = `${norm}_${pose}`;
  if (typeof window === 'undefined') return null;
  if (!SPRITE_CACHE[key]) {
    const img = new Image();
    img.src = `/assets/characters/${norm}/${pose}.png`;
    SPRITE_CACHE[key] = img;
  }
  const cached = SPRITE_CACHE[key];
  return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
}

const EMOTE_IMG_CACHE: Record<string, HTMLImageElement> = {};

function getOrLoadEmoteImg(emoteId: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  if (!EMOTE_IMG_CACHE[emoteId]) {
    const img = new Image();
    img.src = `/assets/emotes/${emoteId}.png`;
    EMOTE_IMG_CACHE[emoteId] = img;
  }
  const cached = EMOTE_IMG_CACHE[emoteId];
  return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
}

export const PanjatPinangCanvas: React.FC<CanvasProps> = ({ gameState, myPlayerId }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const interpolatedClimbers = useRef<Record<string, { height: number; balance: number; climbCycle: number }>>({});
  const cameraRef = useRef<Camera3D>({
    x: 0,
    y: 0,
    targetY: 0,
    roll: 0,
    targetRoll: 0,
    pitch: 0,
    targetPitch: 0,
    orbitAngle: 0,
    targetOrbitAngle: 0,
    orbitOffset: 0,
    shake: 0,
    fovZoom: 1.0,
  });
  const greaseParticles = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; z: number }[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const { room } = useGameStore();
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Sync gameState in ref for butter-smooth 60fps rendering without recreating event listeners
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Zoom States & References
  const zoomTargetRef = useRef(1.0);
  const zoomCurrentRef = useRef(1.0);
  const [zoomDisplay, setZoomDisplay] = useState(1.0);
  const [showZoomToast, setShowZoomToast] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pinchStartDistRef = useRef(0);
  const pinchStartZoomRef = useRef(1.0);
  const lastTapTimeRef = useRef(0);

  const showToast = useCallback(() => {
    setShowZoomToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowZoomToast(false);
    }, 1200);
  }, []);

  const applyZoom = useCallback((val: number) => {
    const clamped = Math.min(2.2, Math.max(0.5, Math.round(val * 100) / 100));
    zoomTargetRef.current = clamped;
    setZoomDisplay(clamped);
    showToast();
  }, [showToast]);

  const cyclePreset = useCallback(() => {
    if (zoomTargetRef.current < 0.85) {
      applyZoom(1.0); // from Wide to Normal
    } else if (zoomTargetRef.current < 1.35) {
      applyZoom(1.6); // from Normal to Close-up
    } else {
      applyZoom(0.6); // from Close-up to Wide Arena
    }
  }, [applyZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Preload Modern 3D Champion Trophy Asset for Summit
    const trophyImg = new Image();
    trophyImg.src = '/assets/gameplay/victory_cup_badge.jpg';

    // Preload Character 64-Sprite Poses for all primary characters
    const PRIMARY_CHARS = ['budi', 'ujang', 'rara', 'koko', 'jaya', 'bayu', 'siti', 'jago'];
    const PRIMARY_POSES = ['climb', 'fall', 'victory', 'sad', 'idle'];
    PRIMARY_CHARS.forEach(char => {
      PRIMARY_POSES.forEach(pose => {
        getOrLoadSprite(char, pose);
      });
    });

    const render = () => {
      time += 0.035;

      const currentGameState = gameStateRef.current;

      // High-DPI Resolution Scaling (Ultra-crisp 4K / Retina display rendering)
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 600;
      const targetWidth = Math.round(width * dpr);
      const targetHeight = Math.round(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      // 1. Interpolate climber states smoothly
      Object.entries(currentGameState.climbers).forEach(([pId, climber]) => {
        if (!interpolatedClimbers.current[pId]) {
          interpolatedClimbers.current[pId] = {
            height: climber.height,
            balance: climber.balance,
            climbCycle: 0,
          };
        } else {
          const current = interpolatedClimbers.current[pId];
          current.height += (climber.height - current.height) * 0.22;
          current.balance += (climber.balance - current.balance) * 0.22;

          // Advance climbing limb stroke cycle when moving up
          if (climber.isClimbing) {
            current.climbCycle += 0.28;
          } else if (climber.isSlipping) {
            current.climbCycle += 0.6;
            // Spawn grease/oil splatter particles
            if (Math.random() < 0.4) {
              greaseParticles.current.push({
                x: (Math.random() - 0.5) * 40,
                y: current.height,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 4 + 2,
                size: Math.random() * 4 + 2,
                alpha: 1.0,
                z: Math.random() * 20 - 10,
              });
            }
          }
        }
      });

      // 2. Camera 3D Physics Tracking & Dynamic Player POV
      const camera = cameraRef.current;
      const myClimber = currentGameState.climbers[myPlayerId];
      const myInterp = interpolatedClimbers.current[myPlayerId];

      const focusHeight = myInterp ? myInterp.height : 0;
      const focusBalance = myInterp ? myInterp.balance : 0;

      // Pole dimensions in 3D canvas world
      const poleTotalHeightPx = height * 2.8;
      const groundY = height - 90;
      const poleTopY = groundY - poleTotalHeightPx;

      // Vertical focus position follows the climber's altitude
      const verticalFocusPx = (focusHeight / 100) * (poleTotalHeightPx - 200);
      camera.targetY = Math.max(0, Math.min(poleTotalHeightPx - height + 120, verticalFocusPx));
      camera.y += (camera.targetY - camera.y) * 0.12;

      // 3D Player-Centric POV Orbit Angle:
      // Each climber is assigned a lane (0 to 7) around the 360-degree cylinder
      // Sway angle shifts by balance (-100 to +100 -> -0.85 rad to +0.85 rad, ~50 deg sway)
      const myBaseLane = myClimber ? ((myClimber.lane % 8) / 8) * (Math.PI * 2) : 0;
      const mySway = myInterp ? (myInterp.balance / 100) * 0.85 : 0;
      const myWorldAngle = myBaseLane + mySway;

      // Camera target angle follows local player!
      camera.targetOrbitAngle = myWorldAngle;

      // Shortest path angular distance around circle
      let angleDiff = camera.targetOrbitAngle - camera.orbitAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      camera.orbitAngle += angleDiff * 0.14;

      // Dynamic camera sway and banking into left/right turns
      const swayLag = myWorldAngle - camera.orbitAngle;
      camera.orbitOffset = Math.sin(swayLag) * 22; // over-the-shoulder dynamic camera offset

      // 3D Camera Roll (banking tilt) when leaning/turning left or right
      camera.targetRoll = -(focusBalance / 100) * 0.065;
      camera.roll += (camera.targetRoll - camera.roll) * 0.14;

      // 3D Pitch perspective: Looking slightly UP when near bottom, level in middle, and looking DOWN with vertigo when near top!
      const altitudeRatio = focusHeight / 100;
      camera.targetPitch = (altitudeRatio - 0.4) * 0.12;
      camera.pitch += (camera.targetPitch - camera.pitch) * 0.08;

      // Camera Shake trigger on slip
      if (myClimber && myClimber.isSlipping) {
        camera.shake = Math.min(20, camera.shake + 4.5);
      }
      camera.shake *= 0.88; // decay shake

      // Dynamic FOV Zoom during Super Climb or Wind Boost
      const hasSuper = myClimber?.activeEffects.some(e => e.type === 'super_climb' || e.type === 'legendary_climber');
      const targetFov = hasSuper ? 1.05 : 1.0;
      camera.fovZoom += (targetFov - camera.fovZoom) * 0.08;

      // Shake offsets
      const shakeX = (Math.random() - 0.5) * camera.shake;
      const shakeY = (Math.random() - 0.5) * camera.shake;

      // Smoothly interpolate user zoom level
      zoomCurrentRef.current += (zoomTargetRef.current - zoomCurrentRef.current) * 0.14;
      const totalZoom = zoomCurrentRef.current * camera.fovZoom;

      // ================= 3D CANVAS RENDERING =================
      // High-DPI Canvas Context Setup
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear & Draw Multi-Layered 3D Background with Parallax
      draw3DParallaxEnvironment(ctx, width, height, camera, altitudeRatio, time);

      // Begin 3D Camera Projection Transform
      ctx.save();
      // Center of projection
      ctx.translate(width / 2 + shakeX, height * 0.65 + shakeY);
      // 3D Roll Rotation
      ctx.rotate(camera.roll);
      // 3D Combined Zoom (User Zoom Factor + Skill FOV Dynamics)
      ctx.scale(totalZoom, totalZoom);
      // Reset origin relative to pole base
      ctx.translate(-width / 2, -height * 0.65 + camera.y);

      const poleX = width / 2 + camera.orbitOffset;
      const poleRadius = 32;

      // 3. Prepare Climbers & Sort by 3D Cylindrical Depth (Z-sorting)
      const currentRoom = roomRef.current;
      const climbersList = Object.values(currentGameState.climbers);
      const climber3DData = climbersList.map((climber, idx) => {
        const interp = interpolatedClimbers.current[climber.playerId] || { height: climber.height, balance: climber.balance, climbCycle: 0 };
        const climberWorldY = groundY - (interp.height / 100) * poleTotalHeightPx;

        // Climber's world orbital angle around the 3D cylinder
        const climberBaseLane = ((climber.lane % 8) / 8) * (Math.PI * 2);
        const climberSway = (interp.balance / 100) * 0.85;
        const climberWorldAngle = climberBaseLane + climberSway;

        // Relative visual angle from THIS client's camera POV!
        let relAngle = climberWorldAngle - camera.orbitAngle;
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        // 3D Cylindrical Coordinates (R = poleRadius + 15)
        const radius3D = poleRadius + 15;
        const relX = Math.sin(relAngle) * radius3D;
        const relZ = Math.cos(relAngle) * radius3D; // Z > 0 is in front of pole, Z < 0 is behind pole

        // Perspective scale factor
        const depthScale = 1.0 + (relZ / 150) * 0.28;

        const playerInfo = currentRoom?.players.find(p => p.id === climber.playerId);
        const isMe = climber.playerId === myPlayerId;
        const avatar = playerInfo?.avatar || 'budi';

        return {
          climber,
          interp,
          x: poleX + relX,
          y: climberWorldY,
          z: relZ,
          scale: depthScale,
          angle: relAngle,
          isMe,
          nickname: playerInfo?.nickname || (isMe ? 'YOU' : `Climber ${idx + 1}`),
          avatar,
          idx,
        };
      });

      // Climbers sorted: Z < 0 (behind pole) drawn FIRST
      const backClimbers = climber3DData.filter(c => c.z < 0).sort((a, b) => a.z - b.z);
      // Climbers with Z >= 0 (in front of pole) drawn AFTER pole
      const frontClimbers = climber3DData.filter(c => c.z >= 0).sort((a, b) => a.z - b.z);

      // A. Draw Climbers that are BEHIND the 3D Pole (with slight dimming shadow)
      backClimbers.forEach(c => {
        drawRealisticClimber(ctx, c.x, c.y, c.climber, c.interp, c.scale, c.isMe, c.angle, time, c.idx, c.nickname, c.avatar);
      });

      // B. Draw 3D Batang Pinang (Round greased cylinder with lighting & specular sheen)
      draw3DCylindricalPole(ctx, poleX, poleTopY, groundY, poleRadius, camera, time);

      // C. Draw Traps placed on the pole in 3D
      currentGameState.traps.forEach(trap => {
        const trapWorldAngle = ((trap.lane % 8) / 8) * (Math.PI * 2);
        let trapRelAngle = trapWorldAngle - camera.orbitAngle;
        while (trapRelAngle > Math.PI) trapRelAngle -= Math.PI * 2;
        while (trapRelAngle < -Math.PI) trapRelAngle += Math.PI * 2;

        const trapX = poleX + Math.sin(trapRelAngle) * (poleRadius + 8);
        const trapZ = Math.cos(trapRelAngle);
        const trapY = groundY - (trap.heightPercentage / 100) * poleTotalHeightPx;
        if (trapZ > -0.2) {
          draw3DBananaTrap(ctx, trapX, trapY, time);
        }
      });

      // D. Draw Climbers that are IN FRONT OF the 3D Pole
      frontClimbers.forEach(c => {
        drawRealisticClimber(ctx, c.x, c.y, c.climber, c.interp, c.scale, c.isMe, c.angle, time, c.idx, c.nickname, c.avatar);
      });

      // E. Draw 3D Flying Grease Splatters
      drawGreaseSplatterParticles(ctx, poleX, poleTotalHeightPx, groundY);

      // F. Draw 3D Rotating Prize Canopy & Merah Putih Flag at Peak
      draw3DPrizeWheelAndFlag(ctx, poleX, poleTopY, camera, time, trophyImg);

      // G. Draw Festival Ground, Sound System & Cheering Crowd at Base
      draw3DFestivalGroundAndCrowd(ctx, width, groundY, poleX, camera, time);

      ctx.restore(); // ends 3D camera projection
      ctx.restore(); // ends High-DPI scaling

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    // Wheel event on container (non-passive to allow preventDefault)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      applyZoom(zoomTargetRef.current * factor);
    };

    // Touch events for pinch-to-zoom & double tap
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStartZoomRef.current = zoomTargetRef.current;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 280) {
          cyclePreset();
        }
        lastTapTimeRef.current = now;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current > 0) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleFactor = currentDist / pinchStartDistRef.current;
        applyZoom(pinchStartZoomRef.current * scaleFactor);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = 0;
      }
    };

    const handleDblClick = () => {
      cyclePreset();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '=' || e.key === '+' || e.key === 'Add') {
        applyZoom(zoomTargetRef.current + 0.2);
      } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
        applyZoom(zoomTargetRef.current - 0.2);
      } else if (e.key === '0' || e.key === 'NumPad0') {
        applyZoom(1.0);
      } else if (e.key === '9') {
        applyZoom(0.6);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('dblclick', handleDblClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [myPlayerId, applyZoom, cyclePreset]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none touch-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
      />

      {/* Floating Glassmorphic Zoom Controls (Mobile & Desktop Friendly) */}
      <div
        className="absolute left-2 sm:left-4 top-24 sm:top-1/2 sm:-translate-y-1/2 flex flex-col items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl z-20 select-none pointer-events-auto"
        title="Kontrol Zoom Layar (Scroll / Pinch / Tombol)"
      >
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() => applyZoom(zoomTargetRef.current + 0.2)}
          className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-800/80 text-white hover:bg-indigo-600 hover:text-white active:scale-90 transition border border-slate-700/50 shadow"
          title="Zoom In (Scroll Up / Tombol +)"
        >
          <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Current Zoom Percentage (Click to Reset 100%) */}
        <button
          type="button"
          onClick={() => applyZoom(1.0)}
          className="px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black tracking-tight text-amber-400 hover:bg-slate-800 active:scale-95 transition"
          title="Klik untuk Reset Zoom (100%)"
        >
          {Math.round(zoomDisplay * 100)}%
        </button>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() => applyZoom(zoomTargetRef.current - 0.2)}
          className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-800/80 text-white hover:bg-indigo-600 hover:text-white active:scale-90 transition border border-slate-700/50 shadow"
          title="Zoom Out (Scroll Down / Tombol -)"
        >
          <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="w-4 sm:w-5 h-px bg-slate-800 my-0.5" />

        {/* Preset Toggle (Wide Arena / Normal / Close-up) */}
        <button
          type="button"
          onClick={cyclePreset}
          className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition"
          title={`Ganti Tampilan (${
            zoomDisplay <= 0.65 ? 'Wide Arena' : zoomDisplay >= 1.5 ? 'Close-up' : 'Normal'
          })`}
        >
          <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      {/* Live Zoom Toast Feedback Notification */}
      <AnimatePresence>
        {showZoomToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-48 sm:bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-indigo-500/50 shadow-2xl text-xs font-black text-indigo-300"
          >
            {zoomDisplay >= 1.1 ? (
              <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
            ) : zoomDisplay <= 0.9 ? (
              <ZoomOut className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Zoom: {Math.round(zoomDisplay * 100)}%</span>
            {zoomDisplay <= 0.65 ? (
              <span className="text-[10px] text-amber-400 font-bold ml-1">• Arena Wide</span>
            ) : zoomDisplay >= 1.5 ? (
              <span className="text-[10px] text-orange-400 font-bold ml-1">• Close-up</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold ml-1">• Normal</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================================
// 1. 3D PARALLAX ENVIRONMENT: TROPICAL MOUNTAINS, VILLAGE, SKY, BUNTINGS
// =========================================================================
function draw3DParallaxEnvironment(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera3D,
  altitudeRatio: number,
  time: number
) {
  // Dynamic Sky Gradient that transitions from warm festive daylight to dramatic high-altitude atmosphere
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (altitudeRatio > 0.7) {
    skyGrad.addColorStop(0, '#0F172A');
    skyGrad.addColorStop(0.4, '#1E293B');
    skyGrad.addColorStop(0.8, '#312E81');
    skyGrad.addColorStop(1, '#1E1B4B');
  } else {
    skyGrad.addColorStop(0, '#1E1B4B');
    skyGrad.addColorStop(0.35, '#312E81');
    skyGrad.addColorStop(0.7, '#4338CA');
    skyGrad.addColorStop(1, '#0B0F19');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Sunlight flare at the top with 3D orbit parallax
  const sunY = -camera.y * 0.1 + 80;
  const sunX = width * 0.75 - Math.sin(camera.orbitAngle) * 70;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
  sunGlow.addColorStop(0, 'rgba(255, 237, 213, 0.45)');
  sunGlow.addColorStop(0.3, 'rgba(251, 146, 60, 0.18)');
  sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
  ctx.fill();

  // Layer 1: Distant Tropical Mountains (3D Depth z = 0.15) with horizontal orbit parallax
  const mountainParallaxY = height * 0.55 + camera.y * 0.08;
  const mountainParallaxX = -Math.sin(camera.orbitAngle) * 90;
  ctx.fillStyle = '#1E1B4B88';
  ctx.beginPath();
  ctx.moveTo(-width, mountainParallaxY + 80);
  ctx.lineTo(-width, mountainParallaxY);
  ctx.quadraticCurveTo(width * 0.25 + mountainParallaxX, mountainParallaxY - 70, width * 0.45 + mountainParallaxX, mountainParallaxY + 20);
  ctx.quadraticCurveTo(width * 0.7 + mountainParallaxX, mountainParallaxY - 90, width * 2, mountainParallaxY + 10);
  ctx.lineTo(width * 2, height);
  ctx.lineTo(-width, height);
  ctx.closePath();
  ctx.fill();

  // Layer 2: Tropical Coconut Palms & Village Roofs (3D Depth z = 0.35)
  const villageParallaxY = height * 0.65 + camera.y * 0.18;
  const villageParallaxX = -Math.sin(camera.orbitAngle) * 160;
  ctx.fillStyle = '#0F172A99';
  ctx.beginPath();
  ctx.moveTo(-width * 0.5, villageParallaxY + 100);
  ctx.lineTo(-width * 0.5, villageParallaxY);
  for (let x = -width * 0.5; x < width * 1.5; x += 90) {
    const palmH = 35 + Math.sin(x * 0.3) * 18;
    ctx.quadraticCurveTo(x + 40 + villageParallaxX, villageParallaxY - palmH, x + 90 + villageParallaxX, villageParallaxY);
  }
  ctx.lineTo(width * 1.5, height);
  ctx.lineTo(-width * 0.5, height);
  ctx.closePath();
  ctx.fill();

  // Layer 3: 3D Waving Triangular Bunting Flags (Merah Putih Segitiga in 3D parallax)
  const bannerY = 70 + camera.y * 0.25 + Math.sin(time) * 4;
  const bannerParallaxX = -Math.sin(camera.orbitAngle) * 220;
  const flagSpacing = 28;
  const totalFlags = Math.ceil((width * 2) / flagSpacing);

  for (let i = 0; i < totalFlags; i++) {
    const fx = -width * 0.5 + i * flagSpacing + bannerParallaxX;
    const sway = Math.sin(i * 0.4 + time * 1.5) * 5;
    const fy = bannerY + Math.sin(i * 0.25) * 14 + sway;
    const isRed = i % 2 === 0;

    ctx.fillStyle = isRed ? '#DC2626' : '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 22, fy);
    ctx.lineTo(fx + 11, fy + 20);
    ctx.closePath();
    ctx.fill();
  }

  // Garland string
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-width * 0.5 + bannerParallaxX, bannerY);
  ctx.quadraticCurveTo(width / 2 + bannerParallaxX, bannerY + 28, width * 1.5 + bannerParallaxX, bannerY);
  ctx.stroke();
}

// =========================================================================
// 2. 3D CYLINDRICAL POLE (BATANG PINANG DENGAN KELICINAN OLI REALISTIS)
// =========================================================================
function draw3DCylindricalPole(
  ctx: CanvasRenderingContext2D,
  poleX: number,
  poleTopY: number,
  groundY: number,
  radius: number,
  camera: Camera3D,
  time: number
) {
  const poleHeight = groundY - poleTopY;

  // 3D Cylindrical lighting gradient:
  // Specular sheen rotates dynamically with the orbital camera angle!
  const shineOffset = Math.sin(camera.orbitAngle) * 0.15;
  const poleGrad = ctx.createLinearGradient(poleX - radius, 0, poleX + radius, 0);
  poleGrad.addColorStop(0.0, '#2D1606'); // Far left bark shadow
  poleGrad.addColorStop(Math.max(0.05, 0.2 + shineOffset * 0.5), '#5C2D0C'); // Areca palm wood body
  poleGrad.addColorStop(Math.max(0.12, Math.min(0.7, 0.38 + shineOffset)), '#141824'); // Thick black grease oil stripe
  poleGrad.addColorStop(Math.max(0.2, Math.min(0.8, 0.5 + shineOffset)), '#334155'); // Specular wet reflection on round crest
  poleGrad.addColorStop(Math.max(0.3, Math.min(0.88, 0.62 + shineOffset)), '#0F172A'); // Greasy oil coat
  poleGrad.addColorStop(0.85, '#78350F'); // Lit palm bark
  poleGrad.addColorStop(1.0, '#291404'); // Right edge rim shadow

  ctx.fillStyle = poleGrad;
  ctx.fillRect(poleX - radius, poleTopY, radius * 2, poleHeight);

  // 3D Palm Trunk Rings (Ruas-ruas batang pohon pinang melingkar 3D)
  ctx.lineWidth = 2.5;
  for (let y = groundY; y >= poleTopY; y -= 55) {
    // 3D Elliptical curve gives genuine cylindrical volume
    ctx.strokeStyle = '#1A0D04';
    ctx.beginPath();
    ctx.ellipse(poleX, y, radius, 7 + camera.pitch * 6, 0, 0, Math.PI);
    ctx.stroke();

    // Dripping black grease oil droplets rotating in 3D around the round cylinder!
    const dripWorldAngle = (y * 0.08);
    let relDripAngle = dripWorldAngle - camera.orbitAngle;
    while (relDripAngle > Math.PI) relDripAngle -= Math.PI * 2;
    while (relDripAngle < -Math.PI) relDripAngle += Math.PI * 2;

    const dripZ = Math.cos(relDripAngle);
    if (dripZ > -0.2) {
      const dripX = poleX + Math.sin(relDripAngle) * (radius * 0.85);
      const dripScale = 0.8 + dripZ * 0.25;

      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.ellipse(dripX, y + 10, 3.5 * dripScale, 6 * dripScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wet specular white glint on the oil drop
      ctx.fillStyle = '#FFFFFF99';
      ctx.beginPath();
      ctx.arc(dripX - 1, y + 8, 1 * dripScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// =========================================================================
// 3. REALISTIC INDONESIAN CLIMBER ANATOMY & SPRITE ANIMATION SYSTEM
// =========================================================================
function drawRealisticClimber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  climber: ClimberPlayerState,
  interp: { height: number; balance: number; climbCycle: number },
  scale: number,
  isMe: boolean,
  angle3D: number,
  time: number,
  playerIndex: number,
  nickname?: string,
  avatar?: AvatarId
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 3D Cylindrical Contour Wrapping:
  // When an opponent is climbing around the curved side of the cylinder,
  // bank their body slightly to match the 3D cylindrical surface!
  if (!isMe && Math.abs(angle3D) > 0.15) {
    ctx.rotate(angle3D * 0.28);
  }

  // Pick skin palette and festival shorts based on lane / player index
  const skin = REAL_SKIN_PALETTES[playerIndex % REAL_SKIN_PALETTES.length];
  const shorts = SHORTS_STYLES[playerIndex % SHORTS_STYLES.length];

  const cycle = interp.climbCycle;
  const isClimbing = climber.isClimbing;
  const isStunned = climber.isStunned;
  const isSlipping = climber.isSlipping;
  const isFinished = (climber.finishedAt && climber.finishedAt > 0) || climber.height >= 100;

  // Arm and leg kinematics calculation
  // Alternating reach: hand-over-hand movement
  const reachL = isClimbing ? Math.sin(cycle) * 16 : isStunned ? 6 : 0;
  const reachR = isClimbing ? -Math.sin(cycle) * 16 : isStunned ? 6 : 0;

  // Leg drive cycle
  const legDriveL = isClimbing ? Math.cos(cycle) * 12 : 0;
  const legDriveR = isClimbing ? -Math.cos(cycle) * 12 : 0;

  // Breathing / exhaustion panting motion when stunned
  const pantOffset = isStunned ? Math.sin(time * 8) * 3 : 0;

  // Slipping jitter
  const slipShakeX = isSlipping ? (Math.random() - 0.5) * 5 : 0;
  const slipShakeY = isSlipping ? Math.random() * 8 : 0;
  ctx.translate(slipShakeX, slipShakeY);

  // Active Skill Auras (Iron Grip / Super Climb / Legendary)
  const hasIronGrip = climber.activeEffects.some(e => e.type === 'iron_grip');
  const hasSuper = climber.activeEffects.some(e => e.type === 'super_climb');
  const hasLegendary = climber.activeEffects.some(e => e.type === 'legendary_climber');

  if (hasLegendary) {
    // 3D Golden Dragon Aura
    ctx.save();
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, -30, 36, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (hasIronGrip) {
    // 3D Cyan Shield Sheen
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -30, 34, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hasSuper) {
    // 3D Blazing Speed Trail Sheen
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -30, 34, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Determine Character Sprite Pose
  const normId = normalizeAvatarId(avatar);
  let pose = 'climb';
  if (isFinished) {
    pose = 'victory';
  } else if (isSlipping) {
    pose = 'fall';
  } else if (isStunned) {
    pose = 'sad';
  } else if (climber.height < 1 && !isClimbing) {
    pose = 'idle';
  } else {
    pose = 'climb';
  }

  const sprite = getOrLoadSprite(normId, pose);
  let headY = -62;

  if (sprite) {
    // -------------------------------------------------------------
    // RENDER AUTHENTIC 64-SPRITE CHARACTER ASSET
    // -------------------------------------------------------------
    ctx.save();

    // Subtle climb bobbing when moving up
    const climbBobY = isClimbing ? Math.sin(cycle) * 3 : 0;
    // Breathing panting motion when exhausted/stunned
    const pantY = isStunned ? Math.sin(time * 8) * 3 : 0;
    ctx.translate(0, climbBobY + pantY);

    // If on left side of the pole, face towards pole (sprites in climb column face left)
    const shouldFlip = angle3D < -0.05;
    if (shouldFlip) {
      ctx.scale(-1, 1);
    }

    const drawH = 88;
    const drawW = Math.round((sprite.naturalWidth / Math.max(1, sprite.naturalHeight)) * drawH);
    ctx.drawImage(sprite, -drawW / 2, -64, drawW, drawH);

    // If stunned, draw spinning cartoon dizzy stars overhead
    if (isStunned) {
      const starRot = time * 5;
      ctx.fillStyle = '#FDE047';
      for (let s = 0; s < 3; s++) {
        const starAngle = starRot + (s * Math.PI * 2) / 3;
        const sx = Math.cos(starAngle) * 16;
        const sy = -68 + Math.sin(starAngle) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    headY = -70;
  } else {
    // -------------------------------------------------------------
    // PROCEDURAL FALLBACK (IF SPRITE ASSET IS STILL LOADING)
    // -------------------------------------------------------------
    // A. LEGS & CLAMPING FEET (MEMELUK BATANG PINANG DENGAN KAKI)
    drawRealisticLeg(ctx, -12, -4, -22, 18 + legDriveL, -14, 30 + legDriveL, skin, shorts, true);
    drawRealisticLeg(ctx, 12, -4, 22, 18 + legDriveR, 14, 30 + legDriveR, skin, shorts, false);

    // B. FESTIVAL SHORTS (CELANA PENDEK BATIK / MERAH PUTIH)
    ctx.fillStyle = shorts.primary;
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(18, 2);
    ctx.lineTo(3, 4);
    ctx.lineTo(0, -2);
    ctx.lineTo(-3, 4);
    ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fill();

    // Shorts Pattern Trim
    ctx.fillStyle = shorts.secondary;
    ctx.fillRect(-17, -2, 15, 3);
    ctx.fillRect(2, -2, 15, 3);

    // Grease smudges on shorts
    ctx.fillStyle = '#0F172ACC';
    ctx.beginPath();
    ctx.ellipse(-5, -6, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.ellipse(8, -4, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // C. REALISTIC ATHLETIC BACK & MUSCULAR TORSO (PUNGGUNG ATLETIS)
    const backHeight = 36;
    const torsoY = -48 + pantOffset;

    // 3D Muscular Torso Base Gradient (Trapezius, Latissimus Dorsi & Spinal groove)
    const backGrad = ctx.createLinearGradient(0, torsoY, 0, torsoY + backHeight);
    backGrad.addColorStop(0.0, skin.highlight); // Upper shoulders catching light
    backGrad.addColorStop(0.3, skin.base); // Mid back
    backGrad.addColorStop(0.8, skin.shadow); // Lower waist
    backGrad.addColorStop(1.0, skin.deepShadow);

    ctx.fillStyle = backGrad;
    ctx.beginPath();
    // V-taper muscular back shape
    ctx.moveTo(-18, torsoY + 4);
    ctx.quadraticCurveTo(-19, torsoY + 16, -14, torsoY + backHeight);
    ctx.lineTo(14, torsoY + backHeight);
    ctx.quadraticCurveTo(19, torsoY + 16, 18, torsoY + 4);
    ctx.quadraticCurveTo(0, torsoY - 2, -18, torsoY + 4);
    ctx.closePath();
    ctx.fill();

    // Muscular Anatomy: Scapula / Shoulder Blades Shading
    ctx.strokeStyle = skin.shadow;
    ctx.lineWidth = 2.5;
    // Left shoulder blade
    ctx.beginPath();
    ctx.moveTo(-12, torsoY + 8);
    ctx.quadraticCurveTo(-8, torsoY + 16, -11, torsoY + 22);
    ctx.stroke();
    // Right shoulder blade
    ctx.beginPath();
    ctx.moveTo(12, torsoY + 8);
    ctx.quadraticCurveTo(8, torsoY + 16, 11, torsoY + 22);
    ctx.stroke();

    // Central Spinal Furrow (Garis Tulang Belakang)
    ctx.strokeStyle = skin.deepShadow + '99';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, torsoY + 6);
    ctx.lineTo(0, torsoY + backHeight - 2);
    ctx.stroke();

    // Real Black Grease / Lumpur Smudges on skin
    ctx.fillStyle = '#0A0E18DD';
    ctx.beginPath();
    ctx.ellipse(-7, torsoY + 14, 5, 8, 0.4, 0, Math.PI * 2);
    ctx.ellipse(9, torsoY + 18, 6, 7, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-2, torsoY + 28, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wet Specular Shine on greased muscular back
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-6, torsoY + 12, 2, 4, 0.4, 0, Math.PI * 2);
    ctx.ellipse(8, torsoY + 16, 2, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // D. ARMS & REALISTIC HANDS (MEMELUK BATANG PINANG)
    // Left Arm (Shoulder -> Elbow -> Forearm -> Clasping Hand)
    drawRealisticArm(ctx, -16, torsoY + 6, -26, torsoY - 6 + reachL, -14, torsoY - 14 + reachL, skin, true);
    // Right Arm
    drawRealisticArm(ctx, 16, torsoY + 6, 26, torsoY - 6 + reachR, 14, torsoY - 14 + reachR, skin, false);

    // E. HEAD, HAIR & FLAPPING IKAT KEPALA MERAH-PUTIH
    headY = torsoY - 14;

    // Neck
    ctx.fillStyle = skin.shadow;
    ctx.fillRect(-6, headY + 8, 12, 8);

    // Head Silhouette
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.ellipse(0, headY, 12, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Short cropped athletic Indonesian hair
    ctx.fillStyle = '#1A1D20';
    ctx.beginPath();
    ctx.arc(0, headY - 4, 12, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(12, headY - 2, 8, headY + 4);
    ctx.quadraticCurveTo(0, headY + 2, -8, headY + 4);
    ctx.quadraticCurveTo(-12, headY - 2, -12, headY - 4);
    ctx.closePath();
    ctx.fill();

    // Authentic Indonesian Headband (Ikat Kepala Merah Putih)
    ctx.fillStyle = '#DC2626'; // Red stripe
    ctx.fillRect(-12, headY - 5, 24, 4);
    ctx.fillStyle = '#FFFFFF'; // White stripe
    ctx.fillRect(-12, headY - 1, 24, 3.5);

    // Two Flapping Ribbon Tails of Headband in the Wind
    const wave1 = Math.sin(time * 4) * 6;
    const wave2 = Math.cos(time * 4) * 6;
    // Red ribbon
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(11, headY - 2);
    ctx.quadraticCurveTo(20, headY - 8 + wave1, 30, headY - 4 + wave2);
    ctx.stroke();
    // White ribbon
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(11, headY + 1);
    ctx.quadraticCurveTo(22, headY - 3 + wave2, 32, headY + 2 + wave1);
    ctx.stroke();
  }

  // Sweat Drops flying during struggle
  if (isClimbing || isSlipping) {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(14, headY + Math.sin(time * 10) * 8, 1.8, 0, Math.PI * 2);
    ctx.arc(-14, headY + Math.cos(time * 10) * 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active Climber 3D Emote Speech Bubble
  const activeEmotes = useEmoteStore.getState().activeEmotes;
  const climberEmote = activeEmotes.find(e => e.playerId === climber.playerId);

  if (climberEmote) {
    const emoteImg = getOrLoadEmoteImg(climberEmote.emoteId);
    if (emoteImg) {
      const bubbleY = headY - 64;
      const bob = Math.sin(time * 8) * 3;

      ctx.save();
      ctx.translate(0, bubbleY + bob);

      // Speech bubble background pill with golden neon glow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.roundRect(-26, -26, 52, 52, 14);
      ctx.fill();
      ctx.stroke();

      // Tail pointing to climber head
      ctx.beginPath();
      ctx.moveTo(-4, 26);
      ctx.lineTo(0, 32);
      ctx.lineTo(4, 26);
      ctx.fill();
      ctx.stroke();

      // Draw Emote Sticker inside
      ctx.drawImage(emoteImg, -21, -21, 42, 42);

      ctx.restore();
    }
  }

  // "YOU" Indicator or Opponent 3D Nickname Badge
  if (isMe) {
    // Glowing Arrow pointing down at the head
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(0, headY - 14);
    ctx.lineTo(-6, headY - 22);
    ctx.lineTo(6, headY - 22);
    ctx.closePath();
    ctx.fill();

    // "YOU" Badge
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.roundRect(-18, headY - 38, 36, 16, 6);
    ctx.fill();

    ctx.font = '900 10px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', 0, headY - 26);
  } else {
    // Opponent 3D Nickname Pill Tag
    const displayName = (nickname || `Player ${playerIndex + 1}`).slice(0, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(-28, headY - 28, 56, 15, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 0, headY - 17);
  }

  // Height Mini Badge below feet
  ctx.fillStyle = '#0B0F19B3';
  ctx.beginPath();
  ctx.roundRect(-22, 28, 44, 15, 5);
  ctx.fill();

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = isMe ? '#FDE047' : '#94A3B8';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(interp.height)}%`, 0, 39);

  ctx.restore();
}

// Helper: Anatomical Arm Drawing with Gripping Hands
function drawRealisticArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  elbowX: number,
  elbowY: number,
  handX: number,
  handY: number,
  skin: typeof REAL_SKIN_PALETTES[0],
  isLeft: boolean
) {
  // Biceps / Upper Arm
  ctx.strokeStyle = skin.base;
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowX, elbowY);
  ctx.stroke();

  // Forearm wrapping forward around the round pole
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Gripping Fingers / Hand wrapping the bark
  ctx.fillStyle = skin.highlight;
  ctx.beginPath();
  ctx.arc(handX, handY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Grease smudge on forearm
  ctx.fillStyle = '#090D16B3';
  ctx.beginPath();
  ctx.ellipse((shoulderX + elbowX) / 2, (shoulderY + elbowY) / 2, 2.5, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// Helper: Anatomical Leg Drawing with Clamping Calves and Feet
function drawRealisticLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  skin: typeof REAL_SKIN_PALETTES[0],
  shorts: typeof SHORTS_STYLES[0],
  isLeft: boolean
) {
  // Muscular Thigh
  ctx.strokeStyle = skin.base;
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.stroke();

  // Calf clamped tight to the palm trunk
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  // Clamping Foot with arch and toes gripping the pole
  ctx.fillStyle = skin.highlight;
  ctx.beginPath();
  ctx.ellipse(footX, footY, 4.5, 3.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Grease splatter on knee
  ctx.fillStyle = '#090D16B3';
  ctx.beginPath();
  ctx.ellipse(kneeX, kneeY, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 4. 3D BANANA TRAP ON THE POLE
// =========================================================================
function draw3DBananaTrap(ctx: CanvasRenderingContext2D, poleX: number, trapY: number, time: number) {
  ctx.save();
  ctx.translate(poleX, trapY);
  // Slippery oil pool circling the round pole
  ctx.fillStyle = '#F59E0B66';
  ctx.beginPath();
  ctx.ellipse(0, 8, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Realistic banana peel with 3 open peels
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍌', 0, 6 + Math.sin(time * 3) * 2);
  ctx.restore();
}

// =========================================================================
// 5. 3D ROTATING PRIZE CAROUSEL & MERAH PUTIH FLAG AT SUMMIT
// =========================================================================
function draw3DPrizeWheelAndFlag(
  ctx: CanvasRenderingContext2D,
  poleX: number,
  poleTopY: number,
  camera: Camera3D,
  time: number,
  trophyImg?: HTMLImageElement | null
) {
  ctx.save();
  ctx.translate(poleX, poleTopY);

  // 3D Bamboo Ring (Roda Hadiah Bambu 3D melingkar di puncak)
  const ringRadiusX = 110;
  const ringRadiusY = 32 + camera.pitch * 30; // perspective depth tilt!

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(0, 0, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Spokes rotating with camera orbit angle
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 3.5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const spokeAngle = a - camera.orbitAngle;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(spokeAngle) * ringRadiusX, Math.sin(spokeAngle) * ringRadiusY);
    ctx.stroke();
  }

  // 3D Hanging Prizes rotating with camera orbit angle and gentle breeze
  const prizes = [
    { label: '🚲 Sepeda', emoji: '🚲', color: '#3B82F6', offset: 0 },
    { label: '🎁 Kado Super', emoji: '🎁', color: '#EF4444', offset: Math.PI * 0.4 },
    { label: '📻 Radio Jadul', emoji: '📻', color: '#10B981', offset: Math.PI * 0.8 },
    { label: '🍳 Wajan Jumbo', emoji: '🍳', color: '#F59E0B', offset: Math.PI * 1.2 },
    { label: '🪣 Ember Air', emoji: '🪣', color: '#8B5CF6', offset: Math.PI * 1.6 },
  ];

  // Sort prizes by 3D depth (pz) so background prizes render behind foreground prizes!
  const prizeRenderList = prizes.map(prize => {
    const angle = prize.offset - camera.orbitAngle + time * 0.15;
    const px = Math.cos(angle) * (ringRadiusX - 10);
    const py = Math.sin(angle) * ringRadiusY;
    const pz = Math.sin(angle); // -1 is back, +1 is front
    return { ...prize, px, py, pz };
  }).sort((a, b) => a.pz - b.pz);

  prizeRenderList.forEach((prize) => {
    // Rope
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prize.px, prize.py);
    ctx.lineTo(prize.px, prize.py + 36);
    ctx.stroke();

    // Prize Icon with depth scaling and subtle shade if behind
    const prizeScale = 1.0 + prize.pz * 0.25;
    ctx.save();
    ctx.translate(prize.px, prize.py + 48);
    ctx.scale(prizeScale, prizeScale);
    if (prize.pz < -0.2) {
      ctx.globalAlpha = 0.75;
    }
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prize.emoji, 0, 0);
    ctx.restore();
  });

  // Flagpole at the very top of pole
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -100);
  ctx.stroke();

  // Glistening Gold Finial on flagpole
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(0, -102, 6, 0, Math.PI * 2);
  ctx.fill();

  // 3D Champion Trophy Cup Asset at Summit
  if (trophyImg && trophyImg.complete && trophyImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(0, -66);

    // Glowing golden halo
    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 32);
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
    glow.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    // Circular clip with gleaming border
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(trophyImg, -22, -22, 44, 44);
    ctx.restore();

    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Authentic 3D Waving Indonesian Merah Putih Flag
  const flagW = 60;
  const flagH = 40;
  const waveAmp = 7;
  const waveFreq = time * 3.5;

  // Red top half (Merah)
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.moveTo(0, -98);
  for (let x = 0; x <= flagW; x += 5) {
    const wy = Math.sin(waveFreq + (x / flagW) * 4) * waveAmp;
    ctx.lineTo(x, -98 + wy);
  }
  ctx.lineTo(flagW, -98 + flagH / 2 + Math.sin(waveFreq + 4) * waveAmp);
  for (let x = flagW; x >= 0; x -= 5) {
    const wy = Math.sin(waveFreq + (x / flagW) * 4) * waveAmp;
    ctx.lineTo(x, -98 + flagH / 2 + wy);
  }
  ctx.closePath();
  ctx.fill();

  // White bottom half (Putih)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -98 + flagH / 2);
  for (let x = 0; x <= flagW; x += 5) {
    const wy = Math.sin(waveFreq + (x / flagW) * 4) * waveAmp;
    ctx.lineTo(x, -98 + flagH / 2 + wy);
  }
  ctx.lineTo(flagW, -98 + flagH + Math.sin(waveFreq + 4) * waveAmp);
  for (let x = flagW; x >= 0; x -= 5) {
    const wy = Math.sin(waveFreq + (x / flagW) * 4) * waveAmp;
    ctx.lineTo(x, -98 + flagH + wy);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// =========================================================================
// 6. 3D FLYING GREASE SPLATTER PARTICLES
// =========================================================================
function drawGreaseSplatterParticles(
  ctx: CanvasRenderingContext2D,
  poleX: number,
  poleTotalHeight: number,
  groundY: number
) {
  // Update and draw flying oil droplets
  ctx.fillStyle = '#090D18';
  for (let i = 0; i < 4; i++) {
    const px = poleX + (Math.sin(Date.now() / 400 + i) * 35);
    const py = groundY - 200 + (Math.cos(Date.now() / 300 + i) * 60);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// =========================================================================
// 7. 3D FESTIVAL GROUND, SOUND SYSTEM & CHEERING INDONESIAN CROWD
// =========================================================================
function draw3DFestivalGroundAndCrowd(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  poleX: number,
  camera: Camera3D,
  time: number
) {
  // Ground Grass with 3D Depth Perspective - expansive horizon so zoom-out never clips!
  const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 300);
  grassGrad.addColorStop(0, '#15803D');
  grassGrad.addColorStop(0.3, '#166534');
  grassGrad.addColorStop(1, '#052E16');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(-width * 4, groundY, width * 9, 3500);

  // Pole Base Concrete Pedestal with festive red-white wrap
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(poleX - 44, groundY - 14, 88, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(poleX - 44, groundY - 7, 88, 7);

  // 17 Agustus Festival Sound System Towers on left and right with 3D orbit shift
  const crowdOrbitShift = -Math.sin(camera.orbitAngle) * 55;
  drawSoundSystemSpeaker(ctx, poleX - 160 + crowdOrbitShift * 0.7, groundY - 60);
  drawSoundSystemSpeaker(ctx, poleX + 130 + crowdOrbitShift * 0.7, groundY - 60);

  // Cheering Spectator Crowd in 3D Perspective
  const crowdCount = Math.floor((width * 2.2) / 32);
  const startX = -width * 0.6 + crowdOrbitShift;
  for (let i = 0; i <= crowdCount; i++) {
    const cx = startX + i * 32 + 10;
    // Energetic jumping animation
    const jump = Math.abs(Math.sin(time * 3.2 + i * 0.9)) * 16;
    const cy = groundY + 24 - jump;

    // Indonesian spectator clothes (Red/White/Batik shirts)
    const shirtColors = ['#DC2626', '#FFFFFF', '#F59E0B', '#1E3A8A', '#059669'];
    ctx.fillStyle = shirtColors[i % shirtColors.length];
    ctx.beginPath();
    ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // Spectator Head
    ctx.fillStyle = '#C68642';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Waving Mini Merah-Putih Flag
    if (i % 2 === 0) {
      const armWave = Math.sin(time * 5 + i) * 6;
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 6);
      ctx.lineTo(cx + 14 + armWave, cy - 22);
      ctx.stroke();

      // Mini Flag Cloth
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(cx + 14 + armWave, cy - 26, 11, 4.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx + 14 + armWave, cy - 21.5, 11, 4.5);
    }
  }
}

// Helper: Indonesian Village 17-an Festival Sound System Speaker Box
function drawSoundSystemSpeaker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Black wooden audio cabinet
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x, y, 32, 60);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, 32, 60);

  // Dual Subwoofer cones
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(x + 16, y + 18, 11, 0, Math.PI * 2);
  ctx.arc(x + 16, y + 42, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(x + 16, y + 18, 3.5, 0, Math.PI * 2);
  ctx.arc(x + 16, y + 42, 3.5, 0, Math.PI * 2);
  ctx.fill();
}
