'use client';

import React from 'react';
import { CouncilBackground } from './CouncilBackground';
import { HelpCircle, Play, PlusCircle, Users, Shield, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';

interface HiddenTeamHomeScreenProps {
  onPlayNow: () => void;
  onCreateRoom: () => void;
  onPlaySolo?: () => void;
  onHowToPlay: () => void;
}

export const HiddenTeamHomeScreen: React.FC<HiddenTeamHomeScreenProps> = ({
  onPlayNow,
  onCreateRoom,
  onPlaySolo,
  onHowToPlay,
}) => {
  return (
    <CouncilBackground>
      <div className="flex-1 flex flex-col justify-between items-center py-6 px-4">
        {/* Top Brand Bar */}
        <div className="w-full max-w-5xl flex items-center justify-between z-10 px-2 sm:px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">🎮</span>
            <span className="font-black text-sm tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400 uppercase">
              GAMEHOUSE
            </span>
          </Link>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900/90 text-rose-300 border border-rose-500/30">
            Social Deduction Card Game
          </span>
        </div>

        {/* Center Hero Section */}
        <div className="flex flex-col items-center justify-center text-center z-10 max-w-2xl mx-auto my-auto py-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider mb-4 shadow-lg shadow-rose-500/10">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Tepat 6 Kursi Dewan • 3 Tim Tersembunyi
          </div>

          {/* Title */}
          <div className="relative mb-3 select-none">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-300 to-indigo-400 drop-shadow-2xl">
              HIDDEN TEAM
            </h1>
            <h2 className="text-sm sm:text-lg font-black tracking-widest uppercase text-amber-300 mt-1">
              SECRET ROLE MULTIPLAYER
            </h2>
          </div>

          <p className="text-xs sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
            Identitas tim tersembunyi, peran berkekuatan manipulasi, dan kotak suara rahasia. Menangkan ronde dengan strategi panji faksi Anda tanpa terbongkar!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg justify-center">
            {onPlaySolo && (
              <button
                onClick={onPlaySolo}
                className="w-full sm:w-auto flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-base">🤖</span>
                <span>Main vs 5 Bot</span>
              </button>
            )}

            <button
              onClick={onCreateRoom}
              className="w-full sm:w-auto flex-1 px-5 py-3.5 rounded-2xl bg-[#1C172B] hover:bg-[#251F38] text-white font-black text-sm border border-rose-500/40 tracking-wide shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              <span>Buat Room</span>
            </button>

            <button
              onClick={onPlayNow}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-700 tracking-wide flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-300" />
              <span>Join Kode</span>
            </button>
          </div>

          {/* How to Play Pill Button */}
          <button
            onClick={onHowToPlay}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pelajari Aturan 6 Role & Kemenangan</span>
          </button>
        </div>

        {/* Feature Badges Footer */}
        <div className="w-full max-w-4xl grid grid-cols-3 gap-3 z-10 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-lg">🎭</span>
            <div className="text-xs font-bold text-white mt-1">3 Faksi Rahasia</div>
            <div className="text-[10px] text-slate-400">RED • BLUE • NEUTRAL</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-lg">🔄</span>
            <div className="text-xs font-bold text-white mt-1">6 Secret Roles</div>
            <div className="text-[10px] text-slate-400">Swapper, Roller, Inspector...</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-lg">⚖️</span>
            <div className="text-xs font-bold text-white mt-1">Netral Independen</div>
            <div className="text-[10px] text-slate-400">Dapat menang mandiri</div>
          </div>
        </div>
      </div>
    </CouncilBackground>
  );
};
