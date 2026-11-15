import React from 'react';
import { KeyRound, Compass, Zap, Trophy } from 'lucide-react';

export const HowToPlay: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Create or Join Room',
      description: 'Host creates a room and shares the unique 5-letter code (e.g. GH-48291) or copies the direct invite link to send on Discord or WhatsApp.',
      icon: <KeyRound className="w-6 h-6 text-indigo-400" />,
    },
    {
      step: '02',
      title: 'Master the Greasy Pole',
      description: 'Press W or Up Arrow to climb. Watch your stamina meter—rest when low! Use A and D to re-center your balance before slipping.',
      icon: <Compass className="w-6 h-6 text-cyan-400" />,
    },
    {
      step: '03',
      title: 'Deploy 6 Tactical Skills',
      description: 'Activate Iron Grip to nullify slip chance, drop slippery Banana Peels behind you, or build up energy for the Legendary Climber ultimate!',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
    },
    {
      step: '04',
      title: 'Claim 17 Agustus Victory',
      description: 'First climber to reach the bicycles and pots at 100% height wins the match and earns the #1 champion podium spot!',
      icon: <Trophy className="w-6 h-6 text-orange-400" />,
    },
  ];

  return (
    <section className="w-full py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="mb-12 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
          Beginner Guide
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
          How to Play Panjat Pinang Battle
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
          Simple controls, exciting real-time multiplayer party physics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((item) => (
          <div
            key={item.step}
            className="p-6 rounded-3xl bg-surface border border-slate-700/60 shadow-xl flex flex-col justify-between relative overflow-hidden"
          >
            <span className="text-6xl font-black text-slate-800/60 absolute top-3 right-4 select-none pointer-events-none">
              {item.step}
            </span>

            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-slate-700 flex items-center justify-center mb-6 z-10">
              {item.icon}
            </div>

            <div className="z-10">
              <h4 className="text-lg font-black text-white mb-2">{item.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
