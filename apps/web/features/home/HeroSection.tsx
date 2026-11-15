'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { Sparkles, LogIn, Users, Flame, Trophy } from 'lucide-react';
import { GameHouseLogo } from '../../components/branding/GameHouseLogo';

interface HeroProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onlinePlayers?: number;
  activeRooms?: number;
}

export const HeroSection: React.FC<HeroProps> = ({
  onCreateRoom,
  onJoinRoom,
  onlinePlayers = 14,
  activeRooms = 3,
}) => {
  return (
    <section className="relative w-full pt-8 sm:pt-14 pb-12 sm:pb-20 px-3 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[250px] sm:h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Online indicator badge */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-surface-elevated/80 border border-slate-700/70 text-[11px] sm:text-xs font-bold text-slate-300 mb-6 sm:mb-8 backdrop-blur-md shadow-lg">
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{onlinePlayers} Climbers Online</span>
        <span className="text-slate-600">•</span>
        <span className="text-amber-400">{activeRooms} Active Parties</span>
      </div>

      {/* Main Tagline & Brand Headline */}
      <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mb-4 sm:mb-6">
        Play Together.{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400">
          Compete Together.
        </span>
      </h1>

      <p className="text-sm sm:text-xl font-medium text-slate-300 max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2">
        GameHouse is your browser party game platform. Create a room in seconds, invite your friends with a link, and race up the greasy pole in{' '}
        <span className="text-amber-400 font-extrabold">Panjat Pinang Battle</span>!
      </p>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mb-10 sm:mb-16 px-4">
        <Button
          variant="orange"
          size="xl"
          glow
          onClick={onCreateRoom}
          icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />}
          className="w-full sm:w-auto font-black shadow-glow-orange py-3.5 text-base sm:text-lg"
        >
          Create Party Room
        </Button>

        <Button
          variant="secondary"
          size="xl"
          onClick={onJoinRoom}
          icon={<LogIn className="w-5 h-5 text-indigo-400" />}
          className="w-full sm:w-auto font-bold py-3.5 text-base sm:text-lg"
        >
          Join with Room Code
        </Button>
      </div>

      {/* Hero Visual Card (Festive Panjat Pinang Preview Illustration) */}
      <div className="relative w-full max-w-4xl bg-surface border border-slate-700/80 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden text-left">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
          <div className="md:col-span-7 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider">
              🇮🇩 First Official GameHouse Mini-Game
            </div>

            <h3 className="text-xl sm:text-3xl font-black text-white">
              Panjat Pinang Battle
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience Indonesia’s iconic 17 August festival game with up to 8 friends in real-time! Keep your balance on the slippery greased trunk, deploy banana traps, activate Iron Grip, and claim the prizes at the peak!
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              <span className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-surface-elevated text-[11px] sm:text-xs font-bold text-slate-300 border border-slate-700">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> 2 - 8 Players
              </span>
              <span className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-surface-elevated text-[11px] sm:text-xs font-bold text-slate-300 border border-slate-700">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> 6 Skills
              </span>
              <span className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-surface-elevated text-[11px] sm:text-xs font-bold text-slate-300 border border-slate-700">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> 3 Modes
              </span>
            </div>
          </div>

          <div className="md:col-span-5 flex items-center justify-center">
            {/* Illustrated festive pole badge */}
            <div className="relative w-full h-40 sm:h-56 rounded-2xl bg-gradient-to-b from-indigo-950 via-slate-900 to-emerald-950 p-4 border border-indigo-500/30 flex items-center justify-center overflow-hidden">
              <div className="absolute top-2 left-3 text-xl sm:text-2xl animate-bounce">🚲</div>
              <div className="absolute top-2 right-3 text-xl sm:text-2xl animate-bounce delay-150">🎁</div>
              <div className="w-8 sm:w-10 h-full bg-amber-900 rounded-md relative shadow-inner flex flex-col justify-around items-center">
                <div className="w-full h-2 bg-slate-900" />
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 border border-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md">
                  P1
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md">
                  P2
                </div>
                <div className="w-full h-2 bg-slate-900" />
              </div>
              <div className="absolute bottom-1.5 inset-x-0 text-center text-[11px] sm:text-xs font-bold text-emerald-400">
                100% In-Browser Multiplayer
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
