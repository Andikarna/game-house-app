'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { GameId } from '@gamehouse/shared';
import { Users, Play, Lock } from 'lucide-react';

interface ExploreProps {
  onSelectGame: (gameId: GameId) => void;
}

export const ExploreGames: React.FC<ExploreProps> = ({ onSelectGame }) => {
  const games: {
    id: GameId;
    title: string;
    description: string;
    emoji: string;
    players: string;
    category: string;
    status: 'available' | 'coming-soon';
    tagColor: string;
  }[] = [
    {
      id: 'panjat-pinang',
      title: 'Panjat Pinang Battle',
      description: 'The iconic Indonesian Independence Day race. Scale the greasy pole, balance carefully, and grab the prizes first!',
      emoji: '🌴',
      players: '2-8 Players',
      category: 'Party / Competitive',
      status: 'available',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'ludo',
      title: 'Ludo Party',
      description: 'The beloved classic board game! Roll the 3D dice, knock opponent tokens back to base, and race your pawns home.',
      emoji: '🎲',
      players: '2-4 Players',
      category: 'Classic / Board Game',
      status: 'available',
      tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      id: 'obstacle-race',
      title: 'Obstacle Race',
      description: 'Navigate wacky obstacle courses, swinging hammers, and tricky balance beams with friends.',
      emoji: '🏃‍♂️',
      players: '2-12 Players',
      category: 'Party / Platformer',
      status: 'coming-soon',
      tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      id: 'mini-battle-arena',
      title: 'Mini Battle Arena',
      description: 'Knock your friends off the shrinking floating arena in frantic top-down mini-bumper action.',
      emoji: '⚔️',
      players: '2-8 Players',
      category: 'Action / Brawler',
      status: 'coming-soon',
      tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    },
  ];

  return (
    <section className="w-full py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          GameHouse Ecosystem
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
          Explore Party Games
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
          One platform, unlimited fun. All mini-games share the same unified lobby, room codes, and invitation system.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
              game.status === 'available'
                ? 'bg-surface border-indigo-500/40 shadow-xl hover:border-indigo-400 hover:-translate-y-1'
                : 'bg-surface-elevated/40 border-slate-800 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-2 rounded-2xl bg-slate-900 border border-slate-800">
                  {game.emoji}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${game.tagColor}`}>
                  {game.status === 'available' ? 'Ready to Play' : 'Coming Soon'}
                </span>
              </div>

              <h4 className="text-xl font-black text-white mb-1.5">{game.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{game.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> {game.players}
                </span>
                <span>{game.category}</span>
              </div>

              {game.status === 'available' ? (
                <Button
                  variant="orange"
                  size="sm"
                  onClick={() => onSelectGame(game.id)}
                  icon={<Play className="w-4 h-4 fill-white" />}
                  className="w-full font-black"
                >
                  Create Room
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                  <Lock className="w-3.5 h-3.5" /> Next Release
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
