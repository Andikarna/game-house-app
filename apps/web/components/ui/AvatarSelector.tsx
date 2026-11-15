import React from 'react';
import { AvatarId, AVATAR_OPTIONS } from '@gamehouse/shared';
import { Check } from 'lucide-react';

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
}

export const ClimberAvatarIcon: React.FC<{ avatar: AvatarId; size?: number; className?: string }> = ({ 
  avatar, 
  size = 48, 
  className = '' 
}) => {
  const meta = AVATAR_OPTIONS.find(a => a.id === avatar) || AVATAR_OPTIONS[0];

  return (
    <div 
      className={`relative rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: `${meta.color}22`,
        border: `2px solid ${meta.color}99` 
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-0.5"
      >
        <defs>
          <linearGradient id={`skin-${avatar}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DF9F63" />
            <stop offset="60%" stopColor="#C68642" />
            <stop offset="100%" stopColor="#8D5524" />
          </linearGradient>
        </defs>

        {/* Muscular Shoulders & Trapezius */}
        <path
          d="M12 96 C14 74 26 66 38 64 L62 64 C74 66 86 74 88 96 Z"
          fill={`url(#skin-${avatar})`}
        />
        {/* Collarbone & Chest definition */}
        <path d="M38 72 Q50 78 62 72" stroke="#6C3E18" strokeWidth="2" strokeLinecap="round" />

        {/* Neck with athletic sinew */}
        <rect x="42" y="52" width="16" height="16" rx="3" fill="#B57338" />

        {/* Athletic Face */}
        <path
          d="M32 40 C32 26 40 20 50 20 C60 20 68 26 68 40 C68 54 58 62 50 62 C42 62 32 54 32 40 Z"
          fill={`url(#skin-${avatar})`}
        />

        {/* Intense, focused eyes */}
        <ellipse cx="43" cy="40" rx="3.5" ry="2.5" fill="#1E293B" />
        <ellipse cx="57" cy="40" rx="3.5" ry="2.5" fill="#1E293B" />
        <circle cx="42" cy="39" r="1" fill="#FFFFFF" />
        <circle cx="56" cy="39" r="1" fill="#FFFFFF" />

        {/* Eyebrows angled with determination */}
        <path d="M38 35 L48 37" stroke="#1A1D20" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M62 35 L52 37" stroke="#1A1D20" strokeWidth="2.5" strokeLinecap="round" />

        {/* Nose & Gritted Teeth / Confident smirk */}
        <path d="M50 42 L48 48 L52 48" stroke="#8D5524" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M45 54 Q50 58 55 54" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" />

        {/* Athletic Short Hair */}
        <path
          d="M30 32 C30 18 40 12 50 12 C60 12 70 18 70 32 C70 34 68 34 66 32 C60 22 40 22 34 32 Z"
          fill="#1A1D20"
        />

        {/* Real Indonesian Ikat Kepala Merah Putih */}
        <path d="M28 32 L72 32 L72 26 L28 26 Z" fill="#DC2626" />
        <path d="M28 36 L72 36 L72 32 L28 32 Z" fill="#FFFFFF" />

        {/* Flapping ribbon knot */}
        <path d="M72 28 Q84 22 92 28" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
        <path d="M72 32 Q86 34 94 38" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

        {/* Black Grease / Oli Smudges on Cheek and Forehead */}
        <ellipse cx="61" cy="46" rx="4" ry="2.5" fill="#0A0E18CC" />
        <ellipse cx="38" cy="28" rx="3" ry="1.5" fill="#0A0E18CC" />
        <ellipse cx="44" cy="78" rx="5" ry="3" fill="#0A0E1899" />

        {/* Team Color Ribbon Accent Badge */}
        <circle cx="24" cy="74" r="5" fill={meta.color} />
      </svg>
    </div>
  );
};

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
      {AVATAR_OPTIONS.map((item) => {
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`relative flex flex-col items-center p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'bg-indigo-600/25 border-indigo-400 scale-105 shadow-glow-primary'
                : 'bg-surface-elevated/60 border-slate-700/60 hover:border-slate-500 hover:scale-102'
            }`}
          >
            <ClimberAvatarIcon avatar={item.id} size={48} />
            <span className="mt-1.5 text-[11px] font-black text-slate-200 truncate w-full text-center">
              {item.name.split(' ')[0]}
            </span>

            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
