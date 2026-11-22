'use client';

import React from 'react';
import { AvatarId } from '@gamehouse/shared';

interface ChibiAvatarProps {
  avatar?: AvatarId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isImpostor?: boolean;
  isHost?: boolean;
  isEliminated?: boolean;
  className?: string;
  customColor?: string;
}

const SIZE_CONFIGS = {
  xs: { width: 34, height: 38 },
  sm: { width: 48, height: 52 },
  md: { width: 68, height: 74 },
  lg: { width: 94, height: 104 },
  xl: { width: 130, height: 144 },
};

export const ChibiAvatar: React.FC<ChibiAvatarProps> = ({
  avatar = 'budi',
  size = 'md',
  isImpostor = false,
  isHost = false,
  isEliminated = false,
  className = '',
  customColor,
}) => {
  const normKey = (avatar || 'budi').toLowerCase();
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className} ${
        isEliminated ? 'opacity-40 grayscale' : ''
      }`}
      style={{ width: cfg.width, height: cfg.height }}
    >
      <svg
        viewBox="0 0 80 88"
        width={cfg.width}
        height={cfg.height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible drop-shadow-md transition-transform duration-200"
      >
        {/* Soft ground shadow */}
        <ellipse cx="40" cy="82" rx="22" ry="5" fill="#000000" fillOpacity="0.2" />

        {/* 1. BUDI (Boy with red shirt and red-white headband) */}
        {(normKey === 'budi' || normKey === 'climber-red') && (
          <g id="char-budi">
            {/* Body */}
            <path d="M26 52 C26 44, 54 44, 54 52 L56 74 C56 78, 24 78, 24 74 Z" fill={customColor || (isImpostor ? '#E46B5D' : '#EF4444')} stroke="#1A202C" strokeWidth="2.5" />
            <path d="M33 52 L40 64 L47 52 Z" fill="#FFFFFF" />
            {/* Arms & Hands */}
            <circle cx="21" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            <circle cx="59" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            {/* Feet */}
            <ellipse cx="31" cy="76" rx="5" ry="3" fill="#1F2937" />
            <ellipse cx="49" cy="76" rx="5" ry="3" fill="#1F2937" />

            {/* Head */}
            <circle cx="40" cy="30" r="23" fill="#18181B" />
            <circle cx="40" cy="32" r="20" fill="#FCD34D" stroke="#1A202C" strokeWidth="2.5" />
            {/* Hair bangs */}
            <path d="M22 28 C26 18, 54 18, 58 28 C54 22, 26 22, 22 28 Z" fill="#18181B" />
            {/* Eyes */}
            <circle cx="32" cy="32" r="3" fill="#18181B" />
            <circle cx="48" cy="32" r="3" fill="#18181B" />
            <circle cx="33.5" cy="30.5" r="1.2" fill="#FFFFFF" />
            <circle cx="49.5" cy="30.5" r="1.2" fill="#FFFFFF" />
            {/* Cheeks */}
            <ellipse cx="27" cy="37" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            <ellipse cx="53" cy="37" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            {/* Mouth */}
            <path d="M36 38 Q40 43 44 38" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* Red & White Headband (Ikat Kepala) */}
            <path d="M19 24 C28 18, 52 18, 61 24 L61 29 C52 23, 28 23, 19 29 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
            <line x1="20" y1="26.5" x2="60" y2="26.5" stroke="#FFFFFF" strokeWidth="1.8" />
            {/* Knot on side */}
            <path d="M17 24 L11 20 M17 27 L10 28" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* 2. SITI (Girl with soft hijab / kerudung) */}
        {(normKey === 'siti' || normKey === 'climber-purple') && (
          <g id="char-siti">
            {/* Body with long sleeves */}
            <path d="M25 52 C25 43, 55 43, 55 52 L57 75 C57 78, 23 78, 23 75 Z" fill={customColor || (isImpostor ? '#E46B5D' : '#F97316')} stroke="#1A202C" strokeWidth="2.5" />
            <path d="M32 52 L40 65 L48 52 Z" fill="#FDE68A" />
            {/* Hands */}
            <circle cx="21" cy="59" r="4.5" fill="#FDE68A" stroke="#1A202C" strokeWidth="2" />
            <circle cx="59" cy="59" r="4.5" fill="#FDE68A" stroke="#1A202C" strokeWidth="2" />
            {/* Feet */}
            <ellipse cx="32" cy="77" rx="5" ry="3" fill="#374151" />
            <ellipse cx="48" cy="77" rx="5" ry="3" fill="#374151" />

            {/* Hijab Base */}
            <ellipse cx="40" cy="30" rx="23" ry="24" fill="#9CA3AF" stroke="#1A202C" strokeWidth="2.5" />
            {/* Inner Face opening */}
            <ellipse cx="40" cy="33" rx="14" ry="16" fill="#FDE68A" stroke="#1A202C" strokeWidth="2" />
            {/* Underscarf (ciput) */}
            <path d="M28 25 C34 21, 46 21, 52 25 Z" fill="#4B5563" />
            {/* Eyes */}
            <circle cx="34" cy="33" r="3" fill="#18181B" />
            <circle cx="46" cy="33" r="3" fill="#18181B" />
            <circle cx="35.5" cy="31.5" r="1.2" fill="#FFFFFF" />
            <circle cx="47.5" cy="31.5" r="1.2" fill="#FFFFFF" />
            {/* Eyelashes */}
            <path d="M32 30 L31 28 M48 30 L49 28" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" />
            {/* Cheeks */}
            <ellipse cx="30" cy="38" rx="3" ry="1.8" fill="#FB7185" fillOpacity="0.75" />
            <ellipse cx="50" cy="38" rx="3" ry="1.8" fill="#FB7185" fillOpacity="0.75" />
            {/* Mouth */}
            <path d="M37 39 Q40 43 43 39" stroke="#18181B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Hijab drape over chest */}
            <path d="M28 44 Q40 54 52 44 L50 52 Q40 58 30 52 Z" fill="#9CA3AF" stroke="#1A202C" strokeWidth="1.5" />
          </g>
        )}

        {/* 3. ANDI (Cute bald / buzzcut boy with green shirt) */}
        {(normKey === 'andi' || normKey === 'climber-green') && (
          <g id="char-andi">
            {/* Body */}
            <path d="M26 52 C26 44, 54 44, 54 52 L56 74 C56 78, 24 78, 24 74 Z" fill={customColor || (isImpostor ? '#E46B5D' : '#10B981')} stroke="#1A202C" strokeWidth="2.5" />
            <circle cx="40" cy="58" r="3" fill="#047857" />
            {/* Hands */}
            <circle cx="21" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            <circle cx="59" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            {/* Feet */}
            <ellipse cx="31" cy="76" rx="5" ry="3" fill="#1F2937" />
            <ellipse cx="49" cy="76" rx="5" ry="3" fill="#1F2937" />

            {/* Cute Round Bald Head */}
            <circle cx="40" cy="30" r="21" fill="#FCD34D" stroke="#1A202C" strokeWidth="2.5" />
            {/* Ears */}
            <circle cx="18" cy="31" r="4.5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            <circle cx="62" cy="31" r="4.5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            {/* Eyes */}
            <circle cx="32" cy="31" r="3.2" fill="#18181B" />
            <circle cx="48" cy="31" r="3.2" fill="#18181B" />
            <circle cx="33.5" cy="29.5" r="1.3" fill="#FFFFFF" />
            <circle cx="49.5" cy="29.5" r="1.3" fill="#FFFFFF" />
            {/* Eyebrows */}
            <path d="M29 25 Q33 23 37 25 M43 25 Q47 23 51 25" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
            {/* Cheeks */}
            <ellipse cx="26" cy="36" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            <ellipse cx="54" cy="36" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            {/* Big Smile */}
            <path d="M34 37 Q40 44 46 37" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 4. RINA (Cute girl with ponytail and pink/purple outfit) */}
        {(normKey === 'rina' || normKey === 'rara' || normKey === 'climber-blue') && (
          <g id="char-rina">
            {/* Ponytail Back */}
            <circle cx="60" cy="22" r="10" fill="#27272A" />
            <ellipse cx="65" cy="28" rx="6" ry="12" fill="#27272A" />
            <circle cx="56" cy="23" r="4" fill="#F43F5E" />

            {/* Body */}
            <path d="M26 52 C26 44, 54 44, 54 52 L56 74 C56 78, 24 78, 24 74 Z" fill={customColor || (isImpostor ? '#E46B5D' : '#EC4899')} stroke="#1A202C" strokeWidth="2.5" />
            <path d="M33 52 L40 62 L47 52 Z" fill="#FCE7F3" />
            {/* Hands */}
            <circle cx="21" cy="58" r="5" fill="#FDE68A" stroke="#1A202C" strokeWidth="2" />
            <circle cx="59" cy="58" r="5" fill="#FDE68A" stroke="#1A202C" strokeWidth="2" />
            {/* Feet */}
            <ellipse cx="31" cy="76" rx="5" ry="3" fill="#1F2937" />
            <ellipse cx="49" cy="76" rx="5" ry="3" fill="#1F2937" />

            {/* Head */}
            <circle cx="40" cy="30" r="23" fill="#27272A" />
            <circle cx="40" cy="32" r="20" fill="#FDE68A" stroke="#1A202C" strokeWidth="2.5" />
            {/* Side bangs */}
            <path d="M22 28 C26 18, 54 18, 58 28 C53 22, 27 22, 22 28 Z" fill="#27272A" />
            <path d="M22 30 L23 38 L27 32 Z" fill="#27272A" />
            {/* Eyes */}
            <circle cx="33" cy="32" r="3" fill="#18181B" />
            <circle cx="47" cy="32" r="3" fill="#18181B" />
            <circle cx="34.5" cy="30.5" r="1.2" fill="#FFFFFF" />
            <circle cx="48.5" cy="30.5" r="1.2" fill="#FFFFFF" />
            {/* Cheeks */}
            <ellipse cx="28" cy="37" rx="3.5" ry="2" fill="#FB7185" fillOpacity="0.75" />
            <ellipse cx="52" cy="37" rx="3.5" ry="2" fill="#FB7185" fillOpacity="0.75" />
            {/* Mouth */}
            <path d="M36 38 Q40 43 44 38" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 5. JOKO (Boy with caping tani / bamboo sun hat & brown/red outfit) */}
        {(normKey === 'joko' || normKey === 'koko' || normKey === 'jaya' || normKey === 'bayu' || normKey === 'ujang' || normKey === 'jago' || normKey === 'climber-yellow' || normKey === 'climber-orange') && (
          <g id="char-joko">
            {/* Body */}
            <path d="M26 52 C26 44, 54 44, 54 52 L56 74 C56 78, 24 78, 24 74 Z" fill={customColor || (isImpostor ? '#E46B5D' : '#D97706')} stroke="#1A202C" strokeWidth="2.5" />
            <line x1="40" y1="52" x2="40" y2="74" stroke="#78350F" strokeWidth="2" />
            {/* Hands */}
            <circle cx="21" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            <circle cx="59" cy="58" r="5" fill="#FCD34D" stroke="#1A202C" strokeWidth="2" />
            {/* Feet */}
            <ellipse cx="31" cy="76" rx="5" ry="3" fill="#1F2937" />
            <ellipse cx="49" cy="76" rx="5" ry="3" fill="#1F2937" />

            {/* Head */}
            <circle cx="40" cy="34" r="19" fill="#FCD34D" stroke="#1A202C" strokeWidth="2.5" />
            {/* Hair peeking */}
            <path d="M24 32 C28 27, 52 27, 56 32 Z" fill="#18181B" />
            {/* Eyes */}
            <circle cx="33" cy="35" r="3" fill="#18181B" />
            <circle cx="47" cy="35" r="3" fill="#18181B" />
            <circle cx="34.5" cy="33.5" r="1.2" fill="#FFFFFF" />
            <circle cx="48.5" cy="33.5" r="1.2" fill="#FFFFFF" />
            {/* Cheeks */}
            <ellipse cx="28" cy="40" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            <ellipse cx="52" cy="40" rx="3.5" ry="2" fill="#F87171" fillOpacity="0.7" />
            {/* Smile */}
            <path d="M36 41 Q40 45 44 41" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />

            {/* Woven Caping Tani (Bamboo Sun Hat) */}
            <g id="caping-hat">
              <polygon points="40,2 6,24 74,24" fill="#F59E0B" stroke="#78350F" strokeWidth="2.5" />
              <line x1="40" y1="2" x2="20" y2="24" stroke="#D97706" strokeWidth="1.5" />
              <line x1="40" y1="2" x2="40" y2="24" stroke="#D97706" strokeWidth="1.5" />
              <line x1="40" y1="2" x2="60" y2="24" stroke="#D97706" strokeWidth="1.5" />
              {/* Hat brim shadow */}
              <ellipse cx="40" cy="24" rx="34" ry="4" fill="#B45309" fillOpacity="0.3" />
            </g>
          </g>
        )}
      </svg>

      {/* Host Crown badge */}
      {isHost && (
        <span
          className="absolute -top-2.5 -right-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded-full px-1.5 py-0.5 shadow-md border border-amber-300 z-10"
          title="Room Host"
        >
          👑
        </span>
      )}

      {/* Impostor indicator badge (only shown when role is revealed) */}
      {isImpostor && (
        <span
          className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow-md border border-red-400 z-10 animate-pulse"
          title="Impostor"
        >
          😈
        </span>
      )}
    </div>
  );
};
