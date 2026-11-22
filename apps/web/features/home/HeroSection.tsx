'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { Sparkles, LogIn } from 'lucide-react';
import { GameId } from '@gamehouse/shared';

interface HeroProps {
  onCreateRoom: (gameId?: GameId) => void;
  onJoinRoom: () => void;
  onlinePlayers?: number;
  activeRooms?: number;
}

export const HeroSection: React.FC<HeroProps> = ({
  onCreateRoom,
  onJoinRoom,
  onlinePlayers = 16,
  activeRooms = 4,
}) => {
  return (
    <section className="relative w-full pt-6 sm:pt-12 pb-10 sm:pb-16 px-3 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] h-[260px] sm:h-[400px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Online indicator badge */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-surface-elevated/90 border border-indigo-500/30 text-[11px] sm:text-xs font-bold text-slate-200 mb-6 backdrop-blur-md shadow-xl">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span className="text-white font-black">{onlinePlayers} Climbers & Gamers</span>
        <span className="text-slate-600">•</span>
        <span className="text-amber-400 font-bold">{activeRooms} Room Aktif</span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-emerald-400 font-bold hidden sm:inline">100% In-Browser Party</span>
      </div>

      {/* Main Tagline & Brand Headline */}
      <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.12] max-w-4xl mb-4 sm:mb-6">
        Play Together.{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-indigo-400 drop-shadow-sm">
          Compete Together.
        </span>
      </h1>

      <p className="text-xs sm:text-lg font-medium text-slate-300 max-w-2xl mb-8 leading-relaxed px-2">
        Platform party game browser multiplayer seru tanpa download. Buat room dalam hitungan detik, bagikan link ke teman, dan langsung mainkan game favoritmu!
      </p>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
        <Button
          variant="orange"
          size="xl"
          glow
          onClick={() => onCreateRoom()}
          icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />}
          className="w-full sm:w-auto font-black shadow-glow-orange py-3.5 text-base sm:text-lg"
        >
          Buat Party Room
        </Button>

        <Button
          variant="secondary"
          size="xl"
          onClick={onJoinRoom}
          icon={<LogIn className="w-5 h-5 text-indigo-400" />}
          className="w-full sm:w-auto font-bold py-3.5 text-base sm:text-lg"
        >
          Masuk dengan Kode Room
        </Button>
      </div>
    </section>
  );
};
