'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { GameId } from '@gamehouse/shared';
import { Button } from '../../components/ui/Button';
import { 
  Play, 
  Users, 
  Sparkles, 
  Flame, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Dices, 
  Clock, 
  Swords, 
  Star,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PlayableGamesProps {
  onSelectGame: (gameId: GameId) => void;
}

export const PlayableGamesShowcase: React.FC<PlayableGamesProps> = ({ onSelectGame }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'panjat-pinang' | 'ludo'>('all');

  return (
    <section className="w-full py-12 sm:py-20 px-3 sm:px-8 max-w-7xl mx-auto relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            🎮 Game Siap Dimainkan Sekarang
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Pilihan Mini-Game <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-indigo-400">GameHouse</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
            Semua game di bawah ini 100% sudah bisa langsung dimainkan bersama teman dalam satu lobby tanpa perlu download aplikasi.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="inline-flex p-1 bg-surface-elevated/80 border border-slate-700/80 rounded-2xl backdrop-blur-md self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({2})
          </button>
          <button
            onClick={() => setActiveTab('panjat-pinang')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'panjat-pinang'
                ? 'bg-orange-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌴</span> Panjat Pinang
          </button>
          <button
            onClick={() => setActiveTab('ludo')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ludo'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎲</span> Ludo Party
          </button>
        </div>
      </div>

      {/* Grid of Playable Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* ========================================================= */}
        {/* GAME 1: PANJAT PINANG BATTLE */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'panjat-pinang') && (
          <div className="group relative bg-surface border border-orange-500/40 rounded-3xl overflow-hidden shadow-2xl hover:border-orange-400 transition-all duration-300 flex flex-col justify-between">
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400" />
            
            <div>
              {/* Visual Banner Area */}
              <div className="relative w-full h-48 sm:h-64 bg-slate-900 overflow-hidden">
                <img
                  src="/assets/gameplay/panjat_pinang_battle_banner.jpg"
                  alt="Panjat Pinang Battle"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                
                {/* Badges on banner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Siap Dimainkan
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-600/80 text-white text-[11px] font-black tracking-wider backdrop-blur-md border border-white/20">
                    🇮🇩 Festival 17 Agustus
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className="px-3 py-1 rounded-full bg-surface-elevated/90 text-amber-300 text-xs font-black backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> 2 - 8 Pemain
                  </span>
                </div>

                {/* Bottom title over banner */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl">🌴</span>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Panjat Pinang Battle
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-orange-300 drop-shadow">
                    Lomba Panjat Tiang Licin Tradisional Real-Time
                  </p>
                </div>
              </div>

              {/* Game Body Details */}
              <div className="p-5 sm:p-7 space-y-5">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Rasakan keseruan lomba 17-an legendaris secara online! Jaga keseimbangan di atas tiang berlumur oli licin, pasang jebakan kulit pisang untuk menjatuhkan lawan, gunakan skill <span className="text-orange-400 font-bold">Iron Grip</span>, dan rebut hadiah sepeda di puncak tiang!
                </p>

                {/* Feature Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">6 Skill Taktis</div>
                      <div className="text-[10px] text-slate-400">Iron Grip & Traps</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">3 Mode Lomba</div>
                      <div className="text-[10px] text-slate-400">Classic, Survival, Skill</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2 col-span-2 sm:col-span-1">
                    <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">8 Karakter</div>
                      <div className="text-[10px] text-slate-400">Budi, Ujang, Rara, dll</div>
                    </div>
                  </div>
                </div>

                {/* Mini Mode Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Mode:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-bold">
                    Classic Race (Balapan Cepat)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[11px] font-bold">
                    Survival Climb (Oli Ekstrem)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                    Skill Battle (Penuh Trik)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-5 sm:p-7 pt-0 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3 mt-4">
              <Button
                variant="orange"
                size="lg"
                glow
                onClick={() => onSelectGame('panjat-pinang')}
                icon={<Play className="w-4 h-4 fill-white" />}
                className="w-full font-black text-sm sm:text-base py-3"
              >
                Buat Room Panjat Pinang
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* GAME 2: LUDO PARTY */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'ludo') && (
          <div className="group relative bg-surface border border-indigo-500/40 rounded-3xl overflow-hidden shadow-2xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between">
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <div>
              {/* Visual Banner Area - Interactive stylized mini board */}
              <div className="relative w-full h-48 sm:h-64 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 overflow-hidden flex items-center justify-center p-4">
                
                {/* Decorative background grid and animated dice icon */}
                <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

                {/* Stylized Mini Ludo Board Display */}
                <div className="relative z-10 w-40 sm:w-52 h-40 sm:h-52 bg-slate-900/90 rounded-2xl border-2 border-indigo-400/50 shadow-2xl p-2.5 grid grid-cols-2 grid-rows-2 gap-2 group-hover:scale-105 transition-transform duration-500">
                  {/* Red Base */}
                  <div className="rounded-xl bg-red-600/30 border border-red-500/60 p-2 flex flex-col justify-between">
                    <span className="text-[10px] font-black text-red-400">RED</span>
                    <div className="flex gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm" />
                      <div className="w-3.5 h-3.5 rounded-full bg-red-400 shadow-sm" />
                    </div>
                  </div>
                  {/* Green Base */}
                  <div className="rounded-xl bg-emerald-600/30 border border-emerald-500/60 p-2 flex flex-col justify-between items-end">
                    <span className="text-[10px] font-black text-emerald-400">GREEN</span>
                    <div className="flex gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm" />
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm" />
                    </div>
                  </div>
                  {/* Blue Base */}
                  <div className="rounded-xl bg-blue-600/30 border border-blue-500/60 p-2 flex flex-col justify-between">
                    <div className="flex gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm" />
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-400 shadow-sm" />
                    </div>
                    <span className="text-[10px] font-black text-blue-400">BLUE</span>
                  </div>
                  {/* Yellow Base */}
                  <div className="rounded-xl bg-amber-500/30 border border-amber-400/60 p-2 flex flex-col justify-between items-end">
                    <div className="flex gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm" />
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm" />
                    </div>
                    <span className="text-[10px] font-black text-amber-300">YELLOW</span>
                  </div>

                  {/* Center Star Badge */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-600 border border-indigo-300 flex items-center justify-center shadow-lg animate-bounce">
                    <Dices className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Floating 3D Dice accent */}
                <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 bg-surface-elevated/90 border border-indigo-400/40 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md">
                  <span className="text-xl">🎲</span>
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Fisika Dadu</div>
                    <div className="text-xs font-black text-indigo-300">Dadu 3D Interaktif</div>
                  </div>
                </div>

                {/* Badges on banner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Siap Dimainkan
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-600/80 text-white text-[11px] font-black tracking-wider backdrop-blur-md border border-white/20">
                    🎲 Board Game Favorit
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className="px-3 py-1 rounded-full bg-surface-elevated/90 text-indigo-300 text-xs font-black backdrop-blur-md border border-indigo-500/40 shadow-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> 2 - 4 Pemain
                  </span>
                </div>

                {/* Bottom title */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl">🎲</span>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Ludo Party
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-indigo-300 drop-shadow">
                    Papan Permainan Klasik dengan Animasi Bidak & Dadu 3D
                  </p>
                </div>
              </div>

              {/* Game Body Details */}
              <div className="p-5 sm:p-7 space-y-5">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Bawa keseruan game papan klasik ke layar browsermu! Lempar dadu angka 6 untuk keluar dari markas, serang dan tendang bidak lawan kembali ke base, berlindung di petak bintang aman, dan balapan sampai garis finish!
                </p>

                {/* Feature Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Dices className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Dadu 3D Fisik</div>
                      <div className="text-[10px] text-slate-400">Lempar & Animasi</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Makan Bidak</div>
                      <div className="text-[10px] text-slate-400">Tendang Lawan ke Base</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2 col-span-2 sm:col-span-1">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Zona Bintang</div>
                      <div className="text-[10px] text-slate-400">Petak Aman Musuh</div>
                    </div>
                  </div>
                </div>

                {/* Mini Mode Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Mode:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                    Classic Mode (4 Bidak Finis)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    Quick Mode (2 Bidak Menang)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-5 sm:p-7 pt-0 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3 mt-4">
              <Button
                variant="primary"
                size="lg"
                glow
                onClick={() => onSelectGame('ludo')}
                icon={<Play className="w-4 h-4 fill-white" />}
                className="w-full font-black text-sm sm:text-base py-3 bg-indigo-600 hover:bg-indigo-500 shadow-glow-primary"
              >
                Buat Room Ludo Party
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Feature Highlights Banner */}
      <div className="mt-10 sm:mt-14 p-5 sm:p-7 rounded-3xl bg-surface/60 border border-slate-800 backdrop-blur-md grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-amber-400">100%</div>
          <div className="text-xs sm:text-sm font-bold text-white">Browser Multiplayer</div>
          <div className="text-[11px] text-slate-400">Tanpa download/install</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 3 Detik</div>
          <div className="text-xs sm:text-sm font-bold text-white">Buat Room Instan</div>
          <div className="text-[11px] text-slate-400">Bagi link / kode 5 huruf</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-indigo-400">24 Emote</div>
          <div className="text-xs sm:text-sm font-bold text-white">Reaksi & Taunt Animasi</div>
          <div className="text-[11px] text-slate-400">Ekspresikan gameplay-mu</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-rose-400">Sinkron Realtime</div>
          <div className="text-xs sm:text-sm font-bold text-white">Node.js & Socket.IO</div>
          <div className="text-[11px] text-slate-400">Fisika & giliran presisi</div>
        </div>
      </div>
    </section>
  );
};
