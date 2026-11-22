'use client';

import React from 'react';

interface CouncilBackgroundProps {
  children: React.ReactNode;
}

export const CouncilBackground: React.FC<CouncilBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0D0B12] text-white flex flex-col relative overflow-hidden select-none font-sans">
      {/* Ambient Faction Gradients */}
      <div className="absolute top-0 -left-28 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 -right-28 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-64 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
