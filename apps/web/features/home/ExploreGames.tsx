'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { GameId } from '@gamehouse/shared';
import { Users, Play, Lock, Sparkles, Clock, Compass, ShieldAlert } from 'lucide-react';

interface ExploreProps {
  onSelectGame: (gameId: GameId) => void;
}

export const ExploreGames: React.FC<ExploreProps> = ({ onSelectGame }) => {
  const readyGames: {
    id: GameId;
    title: string;
    description: string;
    emoji: string;
    players: string;
    category: string;
    tagColor: string;
    highlights: string[];
    isMaintenance?: boolean;
  }[] = [
    {
      id: 'panjat-pinang',
      title: 'Panjat Pinang Battle',
      description: 'Lomba panjat tiang licin khas 17 Agustus. Sedang dalam pemeliharaan sistem fisika dan balancing kemampuan memanjat.',
      emoji: '🌴',
      players: '2-8 Pemain',
      category: 'Party / Competitive',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      highlights: ['6 Skill Taktis', 'Fisika Licin', '3 Mode Lomba'],
      isMaintenance: true,
    },
    {
      id: 'ludo',
      title: 'Ludo Party',
      description: 'Papan permainan klasik favorit keluarga & tongkrongan! Lempar dadu 3D, tendang bidak lawan kembali ke markas, dan balapan ke segitiga finish.',
      emoji: '🎲',
      players: '2-4 Pemain',
      category: 'Classic / Board Game',
      tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      highlights: ['Dadu 3D Interaktif', 'Makan Bidak', 'Safe Zone Bintang'],
    },
    {
      id: 'impostor-desa',
      title: "I'amPostor",
      description: 'Mini-game multiplayer social deduction pedesaan Indonesia! Warga memegang kata rahasia yang sama, 1 impostor menyusup. Beri petunjuk dan tebak siapa impostornya!',
      emoji: '🌾',
      players: '4-6 Pemain',
      category: 'Social Deduction / Party',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      highlights: ['Kata Rahasia Desa', 'Voting Rahasia', 'Tebakan Impostor'],
    },
    {
      id: 'hidden-team',
      title: 'Hidden Team: Secret Role',
      description: 'Social deduction strategis 6 pemain dengan dewan rahasia! Tiga faksi tersembunyi (Red, Blue, Neutral), manipulasi voting kartu utama, dan pertukaran peran rahasia.',
      emoji: '🕵️',
      players: 'Tepat 6 Pemain',
      category: 'Strategic / Secret Role',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      highlights: ['3 Tim Tersembunyi', '6 Role Taktis', 'Swap & Voting'],
    },
  ];

  const upcomingGames: {
    title: string;
    description: string;
    emoji: string;
    players: string;
    category: string;
    eta: string;
  }[] = [
    {
      title: 'Obstacle Race',
      description: 'Lintasan halang rintang lucu penuh palu berayun, titian sempit, dan lantai jebakan bersama teman-teman.',
      emoji: '🏃‍♂️',
      players: '2-12 Pemain',
      category: 'Party / Platformer',
      eta: 'Next Update',
    },
    {
      title: 'Mini Battle Arena',
      description: 'Dorong dan tabrak temanmu keluar dari arena apung yang menyusut dalam pertarungan bumper mobil mini!',
      emoji: '⚔️',
      players: '2-8 Pemain',
      category: 'Action / Brawler',
      eta: 'In Development',
    },
    {
      title: 'Card Battle Party',
      description: 'Duel kartu kartu taktik cepat dengan efek konyol untuk membalikkan situasi pertandingan party.',
      emoji: '🃏',
      players: '2-6 Pemain',
      category: 'Strategy / Card Game',
      eta: 'Concept Lab',
    },
  ];

  return (
    <section className="w-full py-12 sm:py-20 px-3 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Ekosistem Party Games
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Katalog Game GameHouse
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Satu platform terintegrasi: room code yang sama, sistem avatar terpadu, dan suara audio yang imersif.
        </p>
      </div>

      {/* 1. Ready Games Row */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            Game Yang Siap Dimainkan Sekarang ({readyGames.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {readyGames.map((game) => (
            <div
              key={game.id}
              className="p-5 sm:p-7 rounded-3xl bg-surface border border-slate-700/80 hover:border-slate-600 shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2.5 rounded-2xl bg-surface-elevated border border-slate-700 shadow-inner">
                      {game.emoji}
                    </span>
                    <div>
                      <h4 className="text-lg sm:text-xl font-black text-white">
                        {game.title}
                      </h4>
                      <span className="text-xs font-semibold text-slate-400">
                        {game.category}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${game.tagColor}`}>
                    {game.isMaintenance ? '🛠️ Maintenance' : 'Ready to Play'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                  {game.description}
                </p>

                {/* Highlight badges */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {game.highlights.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 rounded-xl bg-surface-elevated text-[11px] font-bold text-slate-300 border border-slate-800"
                    >
                      ✓ {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> {game.players}
                </span>

                {game.isMaintenance ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    className="font-black text-xs px-3 opacity-60 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700"
                  >
                    🛠️ Maintenance
                  </Button>
                ) : (
                  <Button
                    variant="orange"
                    size="sm"
                    glow
                    onClick={() => onSelectGame(game.id)}
                    icon={<Play className="w-3.5 h-3.5 fill-white" />}
                    className="font-black text-xs px-4"
                  >
                    Buat Room
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Upcoming Games Row */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">
            Sedang Dalam Tahap Pengembangan (Coming Soon)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {upcomingGames.map((game) => (
            <div
              key={game.title}
              className="p-5 rounded-3xl bg-surface-elevated/40 border border-slate-800/80 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {game.emoji}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {game.eta}
                  </span>
                </div>

                <h4 className="text-base font-black text-white mb-1">{game.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {game.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {game.players}
                </span>
                <span>{game.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
