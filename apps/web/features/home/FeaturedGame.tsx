import React from 'react';
import { Button } from '../../components/ui/Button';
import { Play, Users, Clock, ShieldCheck, Zap, Award } from 'lucide-react';

interface FeaturedGameProps {
  onPlayNow: () => void;
}

export const FeaturedGame: React.FC<FeaturedGameProps> = ({ onPlayNow }) => {
  return (
    <section className="w-full py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-800 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            Featured Party Game
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Panjat Pinang Battle
          </h2>
        </div>

        <Button
          variant="orange"
          size="lg"
          glow
          onClick={onPlayNow}
          icon={<Play className="w-5 h-5 fill-white" />}
          className="font-black"
        >
          Play Panjat Pinang Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Card 1: 6 Skills */}
        <div className="p-6 rounded-3xl bg-surface border border-slate-700/60 shadow-xl flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="text-xl font-black text-white">6 Strategic Skills</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            From Iron Grip slip-immunity and Super Climb bursts to sabotaging opponents with slippery Banana Traps and the Legendary Climber ultimate!
          </p>
        </div>

        {/* Card 2: Server-Authoritative Physics */}
        <div className="p-6 rounded-3xl bg-surface border border-slate-700/60 shadow-xl flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-xl font-black text-white">True Multiplayer Sync</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            Real-time physics powered by Node.js & Socket.IO. Balance drift, slippery grease, falling states, and stamina are simulated authoritatively.
          </p>
        </div>

        {/* Card 3: 3 Dynamic Modes */}
        <div className="p-6 rounded-3xl bg-surface border border-slate-700/60 shadow-xl flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
            <Award className="w-6 h-6" />
          </div>
          <h4 className="text-xl font-black text-white">3 Unique Game Modes</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            Play the Classic Race to the top, Survival Climb where grease intensity accelerates every 30 seconds, or full-tilt chaotic Skill Battle!
          </p>
        </div>
      </div>
    </section>
  );
};
