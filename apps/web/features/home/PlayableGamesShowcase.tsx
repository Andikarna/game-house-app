'use client';

import React, { useState } from 'react';
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
  ArrowRight,
  Wrench
} from 'lucide-react';

interface PlayableGamesProps {
  onSelectGame: (gameId: GameId) => void;
}

export const PlayableGamesShowcase: React.FC<PlayableGamesProps> = ({ onSelectGame }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'panjat-pinang' | 'ludo' | 'impostor-desa'>('all');

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
        <div className="inline-flex p-1 bg-surface-elevated/80 border border-slate-700/80 rounded-2xl backdrop-blur-md self-start sm:self-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua (3)
          </button>
          <button
            onClick={() => setActiveTab('panjat-pinang')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'panjat-pinang'
                ? 'bg-amber-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌴</span> Panjat Pinang
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Maint
            </span>
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
          <button
            onClick={() => setActiveTab('impostor-desa')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'impostor-desa'
                ? 'bg-emerald-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌾</span> I'amPostor
          </button>
        </div>
      </div>

      {/* Grid of Playable Games */}
      <div className={`grid gap-6 sm:gap-8 items-stretch ${
        activeTab === 'all'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 max-w-2xl mx-auto'
      }`}>
        
        {/* ========================================================= */}
        {/* GAME 1: PANJAT PINANG BATTLE (MAINTENANCE) */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'panjat-pinang') && (
          <div className="group relative bg-surface border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between opacity-90">
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
            
            <div className="flex flex-col flex-1">
              {/* Visual Banner Area */}
              <div className="relative w-full h-52 sm:h-64 bg-slate-900 overflow-hidden">
                <img
                  src="/assets/gameplay/panjat_pinang_battle_banner.jpg"
                  alt="Panjat Pinang Battle"
                  className="w-full h-full object-cover transition-transform duration-500 opacity-60 grayscale-[0.3]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
                
                {/* Central Maintenance Notice Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-1.5 border border-amber-300">
                    <Wrench className="w-3.5 h-3.5" /> Dalam Pemeliharaan
                  </div>
                  <p className="text-[11px] font-bold text-amber-200 mt-1 drop-shadow">
                    Sementara tidak dapat dimainkan
                  </p>
                </div>

                {/* Badges on banner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-1.5 sm:gap-2 z-10">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5 border border-amber-300">
                    <Wrench className="w-3 h-3 text-slate-950" />
                    Maintenance
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-600/80 text-white text-[11px] font-black tracking-wider backdrop-blur-md border border-white/20">
                    🇮🇩 Festival 17 Agustus
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-surface-elevated/90 text-amber-300 text-xs font-black backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> 2 - 8 Pemain
                  </span>
                </div>

                {/* Bottom title over banner */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl">🌴</span>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Panjat Pinang Battle
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-300 drop-shadow">
                    Lomba Panjat Tiang Licin Tradisional Real-Time
                  </p>
                </div>
              </div>

              {/* Game Body Details */}
              <div className="p-5 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[48px]">
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
                variant="secondary"
                size="lg"
                disabled
                icon={<Wrench className="w-4 h-4 text-amber-400" />}
                className="w-full font-black text-sm sm:text-base py-3 opacity-60 cursor-not-allowed bg-slate-800/80 border-slate-700 text-slate-400"
              >
                🛠️ Sedang Maintenance (Segera Kembali)
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
            
            <div className="flex flex-col flex-1">
              {/* Visual Banner Area */}
              <div className="relative w-full h-52 sm:h-64 bg-slate-900 overflow-hidden">
                <img
                  src="/assets/gameplay/ludo_party_banner.jpg"
                  alt="Ludo Party"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                
                {/* Badges on banner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-1.5 sm:gap-2 z-10">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Siap Dimainkan
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-600/90 text-white text-[11px] font-black tracking-wider backdrop-blur-md border border-white/20">
                    🎲 Board Game Favorit
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-surface-elevated/90 text-indigo-300 text-xs font-black backdrop-blur-md border border-indigo-500/40 shadow-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> 2 - 4 Pemain
                  </span>
                </div>

                {/* Bottom title */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 z-10">
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
              <div className="p-5 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[48px]">
                  Bawa keseruan game papan klasik ke layar browsermu! Lempar dadu angka 6 untuk keluar dari markas, serang dan tendang bidak lawan kembali ke base, berlindung di petak bintang aman, dan balapan sampai garis finish!
                </p>

                {/* Feature Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Dices className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Dadu 3D Fisik</div>
                      <div className="text-[10px] text-slate-400">Lempar & Animasi Roll</div>
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

        {/* ========================================================= */}
        {/* GAME 3: IMPOSTOR DESA */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'impostor-desa') && (
          <div className="group relative bg-surface border border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between">
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />
            
            <div className="flex flex-col flex-1">
              {/* Visual Banner Area */}
              <div className="relative w-full h-52 sm:h-64 bg-slate-900 overflow-hidden">
                <img
                  src="/assets/gameplay/impostor_desa_banner.jpg"
                  alt="I'amPostor"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                
                {/* Badges on banner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-1.5 sm:gap-2 z-10">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Siap Dimainkan
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[11px] font-black tracking-wider backdrop-blur-md border border-white/20">
                    🌾 Social Deduction Pedesaan
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-surface-elevated/90 text-emerald-300 text-xs font-black backdrop-blur-md border border-emerald-500/40 shadow-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> 4 - 6 Pemain
                  </span>
                </div>

                {/* Bottom title */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl">🌾</span>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      I'amPostor
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300 drop-shadow">
                    Satu kata rahasia, banyak kecurigaan. Siapa impostornya?
                  </p>
                </div>
              </div>

              {/* Game Body Details */}
              <div className="p-5 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[48px]">
                  Warga desa menerima kata rahasia yang sama (Sawah, Padi, Cangkul, dll), kecuali satu pemain yang menjadi impostor. Berikan petunjuk satu per satu secara bergiliran, diskusikan, lalu lakukan voting rahasia untuk menangkap impostor sebelum ia berhasil menebak kata rahasianya!
                </p>

                {/* Feature Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Kata Rahasia</div>
                      <div className="text-[10px] text-slate-400">5 Kategori Desa</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Giliran Petunjuk</div>
                      <div className="text-[10px] text-slate-400">Maksimal 40 Karakter</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-elevated border border-slate-700/80 flex items-center gap-2 col-span-2 sm:col-span-1">
                    <Trophy className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs">Tebakan Terakhir</div>
                      <div className="text-[10px] text-slate-400">Impostor Curi Kemenangan</div>
                    </div>
                  </div>
                </div>

                {/* Mini Mode Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Fitur:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    Voting Rahasia & Revote Seri
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    4 - 6 Pemain Multiplayer
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-bold">
                    Chibi Avatar Pedesaan
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
                onClick={() => onSelectGame('impostor-desa')}
                icon={<Play className="w-4 h-4 fill-white" />}
                className="w-full font-black text-sm sm:text-base py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25"
              >
                Buat Room I'amPostor
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
