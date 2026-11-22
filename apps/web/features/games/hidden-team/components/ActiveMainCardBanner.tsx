'use client';

import React from 'react';
import { MainCard, HiddenTeamFaction } from '@gamehouse/shared';
import { WingedRoseIllustration } from './HiddenTeamIllustrations';
import { ShieldAlert, Target } from 'lucide-react';

interface ActiveMainCardBannerProps {
  card: (Omit<MainCard, 'teamFlag'> & { teamFlag?: HiddenTeamFaction }) | null;
  className?: string;
}

export const ActiveMainCardBanner: React.FC<ActiveMainCardBannerProps> = ({
  card,
  className = '',
}) => {
  if (!card) return null;

  return (
    <div className={`w-full mb-4 ${className}`}>
      {/* Stone Masonry Card Frame */}
      <div className="relative rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-[#524a64] bg-gradient-to-b from-[#231e30] via-[#1a1726] to-[#120f1b] p-3 sm:p-5 shadow-[0_12px_30px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Subtle Stone Block Texture Grid Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Bronze Metallic Corner Rivets */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#948771] border border-[#3f382a] shadow-inner pointer-events-none" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#948771] border border-[#3f382a] shadow-inner pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#948771] border border-[#3f382a] shadow-inner pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#948771] border border-[#3f382a] shadow-inner pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left Column: Icon + Text Content */}
          <div className="flex-1 flex items-start gap-3 sm:gap-4">
            {/* White Dove / Main Icon Badge */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 text-xl sm:text-2xl">
              🕊️
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 block mb-0.5">
                KARTU TAKDIR AKTIF RONDE INI
              </span>
              <h3 className="text-base sm:text-xl font-black text-white tracking-tight leading-snug">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 italic mt-0.5 leading-relaxed">
                "{card.scenario}"
              </p>
            </div>
          </div>

          {/* Right Column: Winged Rose Artwork & Panji Badge */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            {/* Celestial Winged Rose Illustration */}
            <div className="relative w-24 h-16 sm:w-32 sm:h-20 flex items-center justify-center">
              <WingedRoseIllustration className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(251,191,36,0.35)]" />
            </div>

            {/* Hidden Flag Plaque */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider shadow-inner">
              PANJI: <span className="text-amber-400">{card.teamFlag ? card.teamFlag : '??? (DIRAHASIAKAN)'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Objective Pill Strip */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-[#3b3449] flex items-center gap-2">
          <div className="w-full px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900/60 border border-purple-500/25 flex items-center gap-2 text-xs">
            <span className="text-sm">🎯</span>
            <span className="font-bold text-white">Sasaran:</span>
            <span className="text-purple-200 font-semibold truncate">
              {card.roundObjective}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
