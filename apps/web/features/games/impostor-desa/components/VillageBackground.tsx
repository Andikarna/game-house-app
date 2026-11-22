'use client';

import React from 'react';

interface VillageBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showHut?: boolean;
}

export const VillageBackground: React.FC<VillageBackgroundProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#07130E] text-[#FFF8E8] flex flex-col ${className}`}>
      {/* Background Graphic Scenery (Behind content) */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        {/* Full-bleed background illustration */}
        <img
          src="/assets/gameplay/impostor_desa_bg.jpg"
          alt="Latar Desa Impostor"
          className="w-full h-full object-cover object-center"
        />

        {/* Ambient darkening & atmospheric gradient overlay to ensure UI elements remain crisp and readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/65" />

        {/* Subtle vignette around edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.45)_100%)]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
