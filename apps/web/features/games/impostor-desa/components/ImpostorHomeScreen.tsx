'use client';

import React from 'react';
import { ChibiAvatar } from './ChibiAvatar';
import { VillageBackground } from './VillageBackground';
import { HelpCircle, Play, PlusCircle, Users } from 'lucide-react';

interface ImpostorHomeScreenProps {
  onPlayNow: () => void;
  onCreateRoom: () => void;
  onHowToPlay: () => void;
}

export const ImpostorHomeScreen: React.FC<ImpostorHomeScreenProps> = ({
  onPlayNow,
  onCreateRoom,
  onHowToPlay,
}) => {
  return (
    <VillageBackground className="justify-between items-center py-6 px-4">
      {/* Top Brand Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10 px-2 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          <span className="font-black text-sm tracking-widest text-emerald-300 uppercase">
            GAMEHOUSE
          </span>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#18352B]/80 text-[#FFF8E8] border border-emerald-500/30">
          Mini-Game Social Deduction
        </span>
      </div>

      {/* Center Hero Section matching Image Top-Left */}
      <div className="flex flex-col items-center justify-center text-center z-10 max-w-xl mx-auto my-auto py-4">
        {/* Cartoon Bubbly Logo: IMPOSTOR DESA */}
        <div className="relative mb-3 group cursor-default select-none">
          <div className="relative inline-block">
            {/* 3D Bubble Text Shadow Layer */}
            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase select-none text-[#0B1F16]"
              style={{
                textShadow: '0 6px 0 #05100B, 0 10px 18px rgba(0,0,0,0.5)',
                WebkitTextStroke: '6px #08150F',
              }}
            >
              I&apos;AMPOSTOR
            </h1>
            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase select-none text-[#FFFDF5] absolute inset-0"
              style={{
                WebkitTextStroke: '2px #18352B',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
              }}
            >
              I&apos;AMPOSTOR
            </h1>
          </div>

          <div className="relative -mt-2 sm:-mt-4">
            <h2
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider uppercase select-none text-[#0B1F16]"
              style={{
                textShadow: '0 5px 0 #05100B, 0 8px 16px rgba(0,0,0,0.5)',
                WebkitTextStroke: '6px #08150F',
              }}
            >
              🌾 DESA RAHASIA
            </h2>
            <h2
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider uppercase select-none text-[#FDE047] absolute inset-0"
              style={{
                WebkitTextStroke: '2px #78350F',
              }}
            >
              🌾 DESA RAHASIA
            </h2>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm sm:text-base md:text-lg font-bold text-[#FFF8E8] drop-shadow-md mb-6 max-w-md">
          Satu kata, banyak rahasia. Siapa impostornya?
        </p>

        {/* 3 Chibi Villager Characters in the Sawah */}
        <div className="flex items-end justify-center gap-4 sm:gap-6 my-2 mb-8">
          {/* Budi (Red shirt, red-white headband) */}
          <div className="flex flex-col items-center transform -rotate-3 hover:scale-105 transition-transform duration-200">
            <ChibiAvatar avatar="budi" size="lg" />
            <span className="text-xs font-black text-[#FFF8E8] bg-[#18352B]/80 px-2.5 py-0.5 rounded-full mt-1 border border-white/20">
              Budi
            </span>
          </div>

          {/* Siti (Orange/brown hijab, central) */}
          <div className="flex flex-col items-center transform scale-110 z-10 hover:scale-115 transition-transform duration-200">
            <ChibiAvatar avatar="siti" size="lg" />
            <span className="text-xs font-black text-amber-200 bg-[#18352B]/90 px-3 py-0.5 rounded-full mt-1 border border-amber-300/40">
              Siti
            </span>
          </div>

          {/* Joko (Caping / farmer hat and green outfit) */}
          <div className="flex flex-col items-center transform rotate-3 hover:scale-105 transition-transform duration-200">
            <ChibiAvatar avatar="joko" size="lg" />
            <span className="text-xs font-black text-[#FFF8E8] bg-[#18352B]/80 px-2.5 py-0.5 rounded-full mt-1 border border-white/20">
              Joko
            </span>
          </div>
        </div>

        {/* 3 Bottom Action Buttons matching Image */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          {/* Cara Bermain (Left Pill) */}
          <button
            onClick={onHowToPlay}
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-[#FFF8E8] hover:bg-[#FDF2D9] active:scale-95 text-[#18352B] font-black text-sm rounded-full border-2 border-[#18352B] shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-[#18352B]" />
            <span>Cara Bermain</span>
          </button>

          {/* MAIN SEKARANG (Center Big Green Pill) */}
          <button
            onClick={onPlayNow}
            className="w-full sm:w-auto flex-1 py-4 px-8 bg-gradient-to-b from-[#4ADE80] via-[#22C55E] to-[#16A34A] hover:from-[#5EEAD4] active:scale-95 text-white font-black text-base sm:text-lg rounded-full border-3 border-[#14532D] shadow-xl shadow-green-950/40 tracking-wider transition-all flex items-center justify-center gap-2"
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <Play className="w-5 h-5 fill-white" />
            <span>MAIN SEKARANG</span>
          </button>

          {/* Buat Room (Right Pill) */}
          <button
            onClick={onCreateRoom}
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-[#FFF8E8] hover:bg-[#FDF2D9] active:scale-95 text-[#18352B] font-black text-sm rounded-full border-2 border-[#18352B] shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-[#18352B]" />
            <span>Buat Room</span>
          </button>
        </div>

        {/* Player Count Badge (4-6 Pemain) */}
        <div className="mt-4 inline-flex items-center gap-1.5 bg-[#0A1A12]/80 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300">
          <Users className="w-3.5 h-3.5" />
          <span>4–6 PEMAIN PER ROOM</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full text-center text-[11px] font-semibold text-[#FFF8E8]/50 z-10">
        GAMEHOUSE &bull; I&apos;AMPOSTOR &bull; MULTIPLAYER SOCIAL DEDUCTION
      </div>
    </VillageBackground>
  );
};
