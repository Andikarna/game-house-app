'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { Sparkles, LogIn, Users, Flame, Trophy, Dices, Play, ArrowRight, ShieldCheck } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mb-10 sm:mb-14 px-4">
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

      {/* Dual Playable Games Quick-Launch Hero Cards */}
      <div className="w-full max-w-5xl">
        <div className="text-center mb-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Game Yang Siap Dimainkan Saat Ini:
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left">
          
          {/* Card 1: Panjat Pinang Battle */}
          <div className="relative bg-surface border border-orange-500/50 hover:border-orange-400 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Siap Dimainkan
                </span>
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 2 - 8 Pemain
                </span>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  🌴
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-orange-400 transition-colors">
                    Panjat Pinang Battle
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">
                    17 Agustus Festival Party • Real-Time Physics
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 min-h-[48px]">
                Panjat tiang berlumur oli licin, jaga keseimbangan, lempar kulit pisang, dan aktifkan Iron Grip untuk merebut hadiah di puncak tiang!
              </p>

              {/* Mini visual preview */}
              <div className="w-full h-24 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/70 border border-slate-800 p-2.5 flex items-center justify-between px-4 mb-4 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center border border-white/60">
                    P1
                  </div>
                  <div className="text-[11px] font-bold text-slate-300">
                    Tiang Licin & 6 Skill
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xl">
                  <span className="animate-bounce">🚲</span>
                  <span className="animate-bounce delay-100">🎁</span>
                  <span className="animate-bounce delay-200">🍳</span>
                </div>
              </div>
            </div>

            <Button
              variant="orange"
              size="md"
              glow
              onClick={() => onCreateRoom('panjat-pinang')}
              icon={<Play className="w-4 h-4 fill-white" />}
              className="w-full font-black text-xs sm:text-sm py-2.5"
            >
              Mainkan Panjat Pinang
            </Button>
          </div>

          {/* Card 2: Ludo Party */}
          <div className="relative bg-surface border border-indigo-500/50 hover:border-indigo-400 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Siap Dimainkan
                </span>
                <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 2 - 4 Pemain
                </span>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  🎲
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-indigo-400 transition-colors">
                    Ludo Party
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">
                    Classic Board Game • Dadu 3D & Knockout
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 min-h-[48px]">
                Papan Ludo klasik penuh strategi! Lempar dadu angka 6, tendang bidak lawan kembali ke base, amankan di petak bintang, dan balapan ke finish!
              </p>

              {/* Mini visual preview */}
              <div className="w-full h-24 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/70 border border-slate-800 p-2.5 flex items-center justify-between px-4 mb-4 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500 inline-block" />
                    <span className="w-4 h-4 rounded-full bg-emerald-500 inline-block" />
                    <span className="w-4 h-4 rounded-full bg-blue-500 inline-block" />
                    <span className="w-4 h-4 rounded-full bg-amber-400 inline-block" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-300">
                    Papan 4 Warna & Safe Zones
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-indigo-600/30 border border-indigo-500/50 px-2.5 py-1 rounded-xl text-indigo-300 font-black text-xs">
                  <Dices className="w-4 h-4 animate-spin" /> Dadu 3D
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              glow
              onClick={() => onCreateRoom('ludo')}
              icon={<Play className="w-4 h-4 fill-white" />}
              className="w-full font-black text-xs sm:text-sm py-2.5 bg-indigo-600 hover:bg-indigo-500 shadow-glow-primary"
            >
              Mainkan Ludo Party
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
};
