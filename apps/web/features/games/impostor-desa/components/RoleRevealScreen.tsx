'use client';

import React, { useState } from 'react';
import { ImpostorPrivateRoleData, ImpostorPublicGameState } from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { Check, ShieldAlert, Users, Sparkles, EyeOff, Lock, Clock } from 'lucide-react';

interface RoleRevealScreenProps {
  roleData: ImpostorPrivateRoleData | null;
  gameState: ImpostorPublicGameState;
  myPlayerId: string;
  onReady: () => void;
}

export const RoleRevealScreen: React.FC<RoleRevealScreenProps> = ({
  roleData,
  gameState,
  myPlayerId,
  onReady,
}) => {
  const [hasClickedReady, setHasClickedReady] = useState(false);

  const isImpostor = roleData?.role === 'impostor';
  const myPlayer = gameState.players[myPlayerId];
  const isAlreadyReady = hasClickedReady || myPlayer?.isReadyForRole;

  // Count ready players
  const allPlayers = Object.values(gameState.players);
  const readyCount = allPlayers.filter(p => p.isReadyForRole).length;
  const totalCount = allPlayers.length;

  const handleReadyClick = () => {
    setHasClickedReady(true);
    onReady();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 max-w-2xl mx-auto w-full z-10">
      
      {/* Privacy reminder pill */}
      <div className="inline-flex items-center gap-2 bg-[#18352B]/80 backdrop-blur-sm border border-amber-400/40 px-4 py-1.5 rounded-full text-xs font-bold text-amber-200 mb-3 shadow-md animate-pulse">
        <Lock className="w-3.5 h-3.5 text-amber-300" />
        <span>Jangan tunjukkan layar ini ke pemain lain!</span>
      </div>

      {/* Header Title matching Screen 3: "GILIRANMU! (YOUR TURN!)" */}
      <div className="text-center mb-4 sm:mb-5">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FCD34D] tracking-tight uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
          GILIRANMU!
        </h1>
        <p className="text-xs sm:text-sm font-black text-amber-200/90 tracking-widest uppercase">
          (YOUR TURN!)
        </p>
      </div>

      {/* Tropical Leaf & Wooden Framed Card (Screen 3 Reference Design) */}
      <div className="relative w-full">
        {/* Tropical Leaves framing corners (SVG stylized banana / monstera leaves) */}
        <div className="absolute -top-6 -left-6 pointer-events-none z-20 hidden sm:block">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            {/* Banana Leaf 1 */}
            <path d="M10 90 C10 40, 45 10, 85 10 C65 35, 45 60, 10 90 Z" fill="#2F7D55" />
            <path d="M10 90 C30 50, 60 25, 85 10" stroke="#185034" strokeWidth="2" />
            <path d="M25 70 C40 60, 55 45, 60 35" stroke="#185034" strokeWidth="1.5" />
            {/* Secondary Leaf */}
            <path d="M5 60 C5 25, 30 5, 60 5 C45 25, 30 45, 5 60 Z" fill="#48A878" opacity="0.8" />
          </svg>
        </div>
        <div className="absolute -top-6 -right-6 pointer-events-none z-20 hidden sm:block scale-x-[-1]">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <path d="M10 90 C10 40, 45 10, 85 10 C65 35, 45 60, 10 90 Z" fill="#2F7D55" />
            <path d="M10 90 C30 50, 60 25, 85 10" stroke="#185034" strokeWidth="2" />
            <path d="M5 60 C5 25, 30 5, 60 5 C45 25, 30 45, 5 60 Z" fill="#48A878" opacity="0.8" />
          </svg>
        </div>

        {/* Outer Wooden Board Frame */}
        <div className="w-full bg-[#4E2F16] rounded-3xl p-3 sm:p-4 shadow-2xl border-4 border-[#6C421E]">
          {/* Inner Parchment Card with Batik Corner Motifs */}
          <div className="relative w-full bg-[#FAF5E8] rounded-2xl p-5 sm:p-7 border-2 border-[#D7C29E] shadow-inner text-[#3E2714] overflow-hidden">
            
            {/* Batik Songket subtle background pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#7C4A21 2px, transparent 2px), radial-gradient(#7C4A21 2px, #FAF5E8 2px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* Corner Batik Accents */}
            <div className="absolute top-2 left-2 text-[#8C5E37]/30 text-xs font-serif select-none pointer-events-none">
              ❖ ──
            </div>
            <div className="absolute top-2 right-2 text-[#8C5E37]/30 text-xs font-serif select-none pointer-events-none">
              ── ❖
            </div>

            {/* Card Content: 2-column on desktop, stack on mobile */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
              
              {/* Left Column: Farmer Chibi Avatar in Circular Portrait Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-[#8C5E37] to-[#4E2F16] p-1.5 shadow-xl border-4 border-[#D4A359]">
                  {/* Inner ring */}
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-[#FFF2D4] to-[#EBD2A4] flex items-center justify-center overflow-hidden relative">
                    {/* Rural sawah background circle */}
                    <div className="absolute bottom-0 inset-x-0 h-14 bg-[#5E9B68] rounded-b-full opacity-60" />
                    
                    {/* Chibi with Caping & Cangkul */}
                    <div className="relative z-10 scale-125 transform translate-y-1">
                      <ChibiAvatar
                        avatar={myPlayer?.avatar || 'budi'}
                        size="lg"
                        isImpostor={isImpostor}
                      />
                    </div>

                    {/* Indonesian Farmer Cangkul (Hoe) Prop */}
                    <div className="absolute bottom-2 right-3 z-20 pointer-events-none">
                      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                        {/* Wooden Handle */}
                        <line x1="8" y1="34" x2="28" y2="10" stroke="#8B5A2B" strokeWidth="4" strokeLinecap="round" />
                        {/* Metal Hoe Blade */}
                        <path d="M26 8 L36 12 L32 20 L22 16 Z" fill="#64748B" stroke="#334155" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Player Name Tag pill overlapping bottom of portrait */}
                  <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                    <span className="bg-[#4E2F16] text-[#FCD34D] border-2 border-[#D4A359] text-[11px] sm:text-xs font-black px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider truncate max-w-[90%]">
                      {myPlayer?.nickname || 'Warga'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Role Badge & Secret Word Box */}
              <div className="flex-1 w-full text-center sm:text-left flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#7C4A21] mb-1">
                  KAMU ADALAH...
                </p>

                {/* Embossed 3D Badge: "WARGA DESA" or "IMPOSTOR" */}
                <div className="mb-4">
                  {isImpostor ? (
                    <div className="inline-block bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border-b-4 border-[#7F1D1D] text-white px-5 sm:px-6 py-2.5 rounded-2xl shadow-xl transform hover:scale-102 transition-transform">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">😈</span>
                        <span className="text-xl sm:text-2xl font-black tracking-wider uppercase drop-shadow-md">
                          IMPOSTOR DESA
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-block bg-gradient-to-b from-[#22C55E] to-[#15803D] border-b-4 border-[#14532D] text-white px-5 sm:px-6 py-2.5 rounded-2xl shadow-xl transform hover:scale-102 transition-transform">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🌾</span>
                        <span className="text-xl sm:text-2xl font-black tracking-wider uppercase drop-shadow-md">
                          WARGA DESA
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Secret Word Box (or Impostor Instruction) */}
                {isImpostor ? (
                  <div className="bg-[#FFF0F0] border-2 border-[#E46B5D] rounded-2xl p-3.5 sm:p-4 shadow-inner mb-2 text-left">
                    <p className="text-xs font-black uppercase tracking-wider text-[#B91C1C] mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                      <span>Misi Penyamaran:</span>
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#7F1D1D] leading-relaxed mb-2">
                      Kamu <span className="underline font-black">TIDAK TAHU</span> kata rahasianya! Samarkan dirimu agar tidak dicurigai warga, dan tebak kata rahasia jika tertangkap.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#991B1B]">Kategori:</span>
                      <span className="bg-[#FEE2E2] px-2 py-0.5 rounded-lg text-xs font-black text-[#991B1B] border border-[#FCA5A5]/60">
                        {roleData?.categoryLabel || 'Pedesaan'}
                      </span>
                    </div>

                    {/* Camouflage hints for human impostor */}
                    {roleData?.camouflageThemes && roleData.camouflageThemes.length > 0 && (
                      <div className="bg-white/80 rounded-xl p-2.5 border border-[#FECACA] mb-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#991B1B] mb-1">
                          💡 Kisi-kisi Karakteristik Tema:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {roleData.camouflageThemes.map((trait, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] font-bold bg-[#FEE2E2]/90 text-[#7F1D1D] px-2 py-0.5 rounded-md"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] font-semibold text-[#991B1B]/90 italic">
                      Trik: Dengarkan petunjuk pemain sebelummu, gunakan kata sifat atau asosiasi tema yang aman!
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-b from-[#FFFDF8] to-[#FFF6E3] border-2 border-[#D4A359] rounded-2xl p-3.5 sm:p-4 shadow-inner mb-2 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black uppercase tracking-wider text-[#8B5A2B]">
                        Kata Rahasia Warga:
                      </p>
                      <span className="text-[10px] font-black bg-[#E5F5EC] text-[#1E5738] px-2 py-0.5 rounded-full border border-[#2F7D55]/30">
                        {roleData?.categoryLabel || 'Pertanian'}
                      </span>
                    </div>

                    <p className="text-2xl sm:text-3xl font-black text-[#1E5738] tracking-wider uppercase mb-1.5 drop-shadow-xs">
                      &ldquo;{roleData?.secretWord || 'SAWAH'}&rdquo;
                    </p>

                    {/* Tactical villager advice */}
                    <div className="bg-white/80 rounded-xl p-2.5 border border-[#E9D8B4] mb-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7A4B23] mb-0.5">
                        🛡️ Taktik Warga Cerdas:
                      </p>
                      <p className="text-[11px] font-bold text-[#5C3D24] leading-snug">
                        Berikan 1 kata asosiasi yang kreatif! Jangan terlalu jelas agar Impostor tidak tahu kata aslinya, dan jangan terlalu melenceng agar kamu tidak dicurigai warga!
                      </p>
                    </div>

                    {roleData?.camouflageThemes && roleData.camouflageThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-black uppercase text-[#8B5A2B]">Inspirasi:</span>
                        {roleData.camouflageThemes.slice(0, 4).map((trait, idx) => (
                          <span 
                            key={idx}
                            className="text-[9px] font-bold bg-[#EFE5D0] text-[#5C3D24] px-1.5 py-0.2 rounded"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Small security reminder footer inside card */}
                <p className="text-[10px] font-bold text-[#8C5E37] flex items-center gap-1 mt-1 justify-center sm:justify-start">
                  <EyeOff className="w-3 h-3 text-[#E46B5D]" />
                  <span>Jaga kerahasiaan layar ini dari pandangan pemain lain.</span>
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Bottom Action Area: Big Orange 3D Pill Button & Ready Counter */}
      <div className="w-full mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleReadyClick}
          disabled={isAlreadyReady}
          className={`w-full sm:w-auto min-w-[280px] px-8 py-3.5 rounded-full font-black text-base sm:text-lg uppercase tracking-wider shadow-2xl transition-all select-none ${
            isAlreadyReady
              ? 'bg-gradient-to-b from-[#22C55E] to-[#15803D] text-white cursor-default border-b-4 border-[#14532D]'
              : 'bg-gradient-to-b from-[#F59E0B] via-[#EA580C] to-[#C2410C] hover:from-[#FBBF24] hover:to-[#D97706] text-white active:scale-95 cursor-pointer border-b-4 border-[#9A3412] shadow-orange-950/40'
          }`}
        >
          {isAlreadyReady ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 stroke-[3]" />
              <span>KAMU SUDAH SIAP!</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 drop-shadow-sm">
              <Sparkles className="w-5 h-5 text-yellow-200 fill-current" />
              <span>SAYA SIAP!</span>
            </span>
          )}
        </button>

        {/* Players ready counter and countdown pill */}
        <div className="flex items-center gap-3 text-xs font-bold text-amber-200">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{readyCount} dari {totalCount} pemain siap</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Otomatis mulai: {gameState.phaseTimeRemaining}s</span>
          </div>
        </div>
      </div>

    </div>
  );
};
