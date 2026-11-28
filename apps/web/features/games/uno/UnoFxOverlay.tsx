'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnoActionFx, UNO_COLOR_META } from '@gamehouse/shared';

interface UnoFxOverlayProps {
  lastFx: UnoActionFx | null;
}

interface BurstBanner {
  id: number;
  title: string;
  subtitle: string;
  colorHex: string;
  emoji: string;
  isBig: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const UnoFxOverlay: React.FC<UnoFxOverlayProps> = ({ lastFx }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastSeqRef = useRef<number>(0);
  const [banner, setBanner] = useState<BurstBanner | null>(null);
  const [shockwaveColor, setShockwaveColor] = useState<string | null>(null);

  // Canvas 60fps particle renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14; // Gentle gravity
        p.vx *= 0.985;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life >= p.maxLife) {
          list.splice(i, 1);
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const spawnParticles = (colors: string[], count: number) => {
    if (typeof window === 'undefined') return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.44;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const speed = 4 + Math.random() * 9;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 2.5 + Math.random() * 4.5,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0,
        maxLife: 34 + Math.random() * 24,
      });
    }
  };

  useEffect(() => {
    if (!lastFx || lastFx.seq <= lastSeqRef.current) return;
    lastSeqRef.current = lastFx.seq;

    const activeMeta = lastFx.chosenColor ? UNO_COLOR_META[lastFx.chosenColor] : UNO_COLOR_META.blue;
    const rainbow = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

    if (lastFx.type === 'play') {
      spawnParticles([activeMeta.hex, '#FFFFFF'], 14);
      return;
    }

    if (lastFx.type === 'draw' || lastFx.type === 'timeout') {
      if ((lastFx.drawCount || 0) >= 2) {
        spawnParticles([activeMeta.hex, '#F97316', '#FFFFFF'], 24);
      }
      return;
    }

    let config: BurstBanner | null = null;
    if (lastFx.type === 'skip') {
      spawnParticles(['#EF4444', '#FB7185', '#FFFFFF'], 28);
      config = {
        id: lastFx.seq,
        title: 'SKIPPED! ⊘',
        subtitle: `${lastFx.targetNickname || 'Pemain'} dilewati!`,
        colorHex: '#EF4444',
        emoji: '🚫',
        isBig: true,
      };
    } else if (lastFx.type === 'reverse') {
      spawnParticles(['#38BDF8', '#A855F7', '#FFFFFF'], 30);
      config = {
        id: lastFx.seq,
        title: 'REVERSE! ⇄',
        subtitle: lastFx.direction === 1 ? 'Arah Jarum Jam ↻' : 'Berlawanan Arah ↺',
        colorHex: '#06B6D4',
        emoji: '🔄',
        isBig: true,
      };
    } else if (lastFx.type === 'draw2') {
      spawnParticles(['#F97316', '#FACC15', activeMeta.hex], 34);
      config = {
        id: lastFx.seq,
        title: `BOM +${lastFx.drawCount || 2}!`,
        subtitle: `${lastFx.actorNickname || 'Pemain'} melempar +2!`,
        colorHex: '#F97316',
        emoji: '⚡',
        isBig: true,
      };
    } else if (lastFx.type === 'wild') {
      spawnParticles(rainbow, 36);
      config = {
        id: lastFx.seq,
        title: `WARNA ${activeMeta.label.toUpperCase()}!`,
        subtitle: `${lastFx.actorNickname || 'Pemain'} mengganti warna meja`,
        colorHex: activeMeta.hex,
        emoji: '🌈',
        isBig: true,
      };
    } else if (lastFx.type === 'wild_draw4') {
      spawnParticles(rainbow, 48);
      config = {
        id: lastFx.seq,
        title: `WILD +${lastFx.drawCount || 4}!!`,
        subtitle: `Warna baru: ${activeMeta.label.toUpperCase()}!`,
        colorHex: activeMeta.hex,
        emoji: '🔥',
        isBig: true,
      };
    } else if (lastFx.type === 'uno') {
      spawnParticles(['#F59E0B', '#EF4444', '#FDE047', '#FFFFFF'], 44);
      config = {
        id: lastFx.seq,
        title: 'UNO!! 🔥',
        subtitle: `${lastFx.actorNickname || 'Pemain'} tinggal 1 kartu!`,
        colorHex: '#F59E0B',
        emoji: '🔥',
        isBig: true,
      };
    } else if (lastFx.type === 'catch') {
      spawnParticles(['#F43F5E', '#FACC15', '#FFFFFF'], 40);
      config = {
        id: lastFx.seq,
        title: 'TERTANGKAP! +2',
        subtitle: `${lastFx.targetNickname || 'Lawan'} lupa teriak UNO!`,
        colorHex: '#F43F5E',
        emoji: '🚨',
        isBig: true,
      };
    } else if (lastFx.type === 'swap') {
      spawnParticles(['#A855F7', '#06B6D4', '#FFFFFF'], 40);
      config = {
        id: lastFx.seq,
        title: 'CHAOS 7 SWAP! 🌀',
        subtitle: `${lastFx.actorNickname} ↔ ${lastFx.targetNickname}`,
        colorHex: '#A855F7',
        emoji: '🌀',
        isBig: true,
      };
    } else if (lastFx.type === 'rotate') {
      spawnParticles(rainbow, 48);
      config = {
        id: lastFx.seq,
        title: 'CHAOS 0 PUTAR! 🌪️',
        subtitle: 'Semua tangan kartu bergeser!',
        colorHex: '#EC4899',
        emoji: '🌪️',
        isBig: true,
      };
    } else if (lastFx.type === 'win') {
      spawnParticles(rainbow, 64);
    }

    if (config) {
      setBanner(config);
      setShockwaveColor(config.colorHex);
      const t1 = setTimeout(() => setShockwaveColor(null), 650);
      const t2 = setTimeout(() => setBanner((prev) => (prev?.id === config!.id ? null : prev)), 1450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [lastFx]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Radial Chromatic Shockwave Ring */}
      <AnimatePresence>
        {shockwaveColor && (
          <motion.div
            key={`wave-${lastFx?.seq}`}
            initial={{ scale: 0.25, opacity: 0.9 }}
            animate={{ scale: 2.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-4"
            style={{
              borderColor: shockwaveColor,
              boxShadow: `0 0 50px ${shockwaveColor}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Center Action Callout Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="absolute left-1/2 top-[22%] sm:top-[20%] -translate-x-1/2 px-5 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl text-center"
            style={{
              backgroundColor: 'rgba(11, 14, 23, 0.88)',
              borderColor: `${banner.colorHex}AA`,
              boxShadow: `0 0 36px ${banner.colorHex}66`,
            }}
          >
            <div className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow flex items-center justify-center gap-2">
              <span>{banner.emoji}</span>
              <span style={{ color: banner.colorHex }}>{banner.title}</span>
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-200 mt-0.5">
              {banner.subtitle}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
