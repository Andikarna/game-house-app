import React from 'react';
import { ClimberPlayerState } from '@gamehouse/shared';
import { Shield, Zap, Sparkles, AlertOctagon } from 'lucide-react';

interface ClimberHUDProps {
  climber?: ClimberPlayerState;
  compact?: boolean;
}

export const ClimberStatusHUD: React.FC<ClimberHUDProps> = ({ climber, compact = false }) => {
  if (!climber) return null;

  const stamina = Math.round(climber.stamina);
  const balance = Math.round(climber.balance);
  const energy = Math.round(climber.energy);
  const height = Math.round(climber.height * 10) / 10;

  // Balance meter calculation (-100 to +100 mapped to 0% to 100%)
  const balancePercent = Math.max(0, Math.min(100, ((balance + 100) / 200) * 100));
  const isDangerZone = Math.abs(balance) >= 70;

  // Ultra-compact mobile strip (height: ~30px, never occludes the climbing pole)
  if (compact) {
    return (
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/60 shadow-xl select-none text-white pointer-events-auto">
        {/* Height Badge */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] uppercase font-extrabold text-slate-400">H:</span>
          <span className="text-xs font-black text-amber-400">{height}%</span>
        </div>

        {/* Stamina Mini Bar */}
        <div className="flex-1 min-w-[65px] max-w-[130px] flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                stamina > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : stamina > 25
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${stamina}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-300 w-5 text-right">{stamina}</span>
        </div>

        {/* Balance Mini Bar */}
        <div className="flex-1 min-w-[65px] max-w-[120px] flex items-center gap-1">
          <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
          <div className="relative w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-600" />
            <div
              className={`absolute top-0 bottom-0 w-2 -ml-1 rounded-full ${
                isDangerZone ? 'bg-rose-500 shadow-sm shadow-rose-500/80 animate-pulse' : 'bg-cyan-400'
              }`}
              style={{ left: `${balancePercent}%` }}
            />
          </div>
        </div>

        {/* Stun / Slipping Alert */}
        {climber.isStunned ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black animate-bounce shrink-0">
            <AlertOctagon className="w-2.5 h-2.5" />
            <span>MASH!</span>
          </div>
        ) : isDangerZone ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-300 text-[9px] font-black animate-pulse shrink-0">
            <span>SLIP!</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2.5 w-full max-w-full sm:max-w-md bg-surface/90 backdrop-blur-md p-2.5 sm:p-4 rounded-2xl border border-slate-700/60 shadow-xl select-none">
      {/* Top Header: Height and Stun Alert */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-slate-400">
            Height
          </span>
          <span className="text-base sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            {height}%
          </span>
        </div>

        {climber.isStunned && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/60 text-rose-300 text-[10px] sm:text-xs font-black animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            <span>MASH RECOVER!</span>
          </div>
        )}
      </div>

      {/* 1. Stamina Bar */}
      <div className="space-y-0.5 sm:space-y-1">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold">
          <span className="flex items-center gap-1 text-slate-300">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            Stamina
          </span>
          <span className={stamina < 30 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-slate-300'}>
            {stamina}/100
          </span>
        </div>
        <div className="w-full h-2 sm:h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              stamina > 50
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : stamina > 25
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
            }`}
            style={{ width: `${stamina}%` }}
          />
        </div>
      </div>

      {/* 2. Balance Meter */}
      <div className="space-y-0.5 sm:space-y-1">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold">
          <span className="flex items-center gap-1 text-slate-300">
            <Shield className="w-3 h-3 text-cyan-400" />
            Balance
          </span>
          <span className={isDangerZone ? 'text-rose-400 font-black animate-pulse' : 'text-slate-400'}>
            {isDangerZone ? 'SLIPPING!' : balance === 0 ? 'CENTER' : balance > 0 ? `+${balance} R` : `${balance} L`}
          </span>
        </div>

        {/* Balance Track */}
        <div className="relative w-full h-2.5 sm:h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          {/* Safe Center Zone */}
          <div className="absolute inset-y-0 left-[25%] right-[25%] bg-emerald-500/10 border-x border-emerald-500/30" />
          
          {/* Danger Zones */}
          <div className="absolute inset-y-0 left-0 w-[15%] bg-rose-500/20" />
          <div className="absolute inset-y-0 right-0 w-[15%] bg-rose-500/20" />

          {/* Center Line Marker */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-600" />

          {/* Needle Indicator */}
          <div
            className={`absolute top-0 bottom-0 w-2.5 -ml-1.25 rounded-full transition-all duration-75 shadow-md ${
              isDangerZone ? 'bg-rose-500 shadow-rose-500/80 scale-125' : 'bg-cyan-400 shadow-cyan-400/80'
            }`}
            style={{ left: `${balancePercent}%` }}
          />
        </div>
      </div>

      {/* 3. Ultimate Energy Gauge (Hidden on very compact view or displayed slimly) */}
      <div className="space-y-0.5 sm:space-y-1">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold">
          <span className="flex items-center gap-1 text-purple-300">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Ultimate
          </span>
          <span className={energy >= 100 ? 'text-purple-300 font-black animate-pulse' : 'text-slate-400'}>
            {energy >= 100 ? 'READY!' : `${energy}%`}
          </span>
        </div>
        <div className="w-full h-1.5 sm:h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              energy >= 100
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 shadow-glow-accent'
                : 'bg-gradient-to-r from-indigo-600 to-purple-500'
            }`}
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>
    </div>
  );
};
