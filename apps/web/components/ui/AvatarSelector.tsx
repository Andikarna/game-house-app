import React, { useState } from 'react';
import { AvatarId, AVATAR_OPTIONS, PRIMARY_AVATARS, normalizeAvatarId, AvatarOption } from '@gamehouse/shared';
import { Check, Sparkles } from 'lucide-react';

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
  showDetails?: boolean;
}

export const ClimberAvatarIcon: React.FC<{ 
  avatar: AvatarId; 
  size?: number; 
  className?: string;
  showBadge?: boolean;
}> = ({ 
  avatar, 
  size = 48, 
  className = '',
  showBadge = false
}) => {
  const normId = normalizeAvatarId(avatar);
  const meta: AvatarOption = AVATAR_OPTIONS.find(a => a.id === normId) || AVATAR_OPTIONS[0];
  const [imgError, setImgError] = useState(false);

  const avatarSrc = `/assets/characters/${normId}/avatar.png`;
  const fallbackSrc = `/assets/characters/${normId}/idle.png`;

  return (
    <div 
      className={`relative rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md select-none group ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: `${meta.color}1A`,
        border: `2px solid ${meta.color}99`,
        boxShadow: `0 4px 12px ${meta.color}25`
      }}
    >
      {!imgError ? (
        <img
          src={avatarSrc}
          alt={meta.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            // Try fallback to idle sprite
            const target = e.currentTarget;
            if (target.src.endsWith('avatar.png')) {
              target.src = fallbackSrc;
            } else {
              setImgError(true);
            }
          }}
        />
      ) : (
        /* Stylized High-Detail SVG Fallback with Character Specific Details */
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-0.5"
        >
          <circle cx="50" cy="50" r="46" fill={`${meta.color}33`} />
          <text 
            x="50" 
            y="58" 
            fontSize="32" 
            textAnchor="middle" 
            dominantBaseline="middle"
          >
            {meta.badge}
          </text>
        </svg>
      )}

      {showBadge && (
        <span 
          className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none bg-slate-900/90 rounded-full px-1 py-0.5 border border-slate-700 shadow"
        >
          {meta.badge}
        </span>
      )}
    </div>
  );
};

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ 
  selected, 
  onSelect,
  showDetails = true 
}) => {
  const normSelected = normalizeAvatarId(selected);
  const selectedMeta = AVATAR_OPTIONS.find(a => a.id === normSelected) || AVATAR_OPTIONS[0];

  const primaryOptions = PRIMARY_AVATARS.map(id => 
    AVATAR_OPTIONS.find(opt => opt.id === id) || AVATAR_OPTIONS[0]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 8-Character Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-2.5">
        {primaryOptions.map((item) => {
          const isSelected = normSelected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-400 scale-105 shadow-glow-primary ring-2 ring-indigo-400/40'
                  : 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 hover:bg-surface-elevated hover:scale-102'
              }`}
            >
              <ClimberAvatarIcon avatar={item.id} size={50} />

              <span className={`mt-1.5 text-xs font-black truncate w-full text-center ${
                isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
              }`}>
                {item.name}
              </span>

              <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                {item.badge}
              </span>

              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg border border-slate-900">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Character Preview Banner */}
      {showDetails && (
        <div 
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border bg-slate-900/60 backdrop-blur-sm transition-all duration-300"
          style={{ borderColor: `${selectedMeta.color}66` }}
        >
          <div className="relative shrink-0">
            <img 
              src={`/assets/characters/${selectedMeta.id}/idle.png`}
              alt={selectedMeta.name}
              className="w-12 h-14 object-contain drop-shadow"
              onError={(e) => {
                // If idle.png isn't loaded yet, hide gracefully
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">
                {selectedMeta.name}
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ 
                  backgroundColor: `${selectedMeta.color}25`,
                  color: selectedMeta.color,
                  border: `1px solid ${selectedMeta.color}66`
                }}
              >
                {selectedMeta.subtitle}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              {selectedMeta.tagline}
            </p>
          </div>

          <div className="text-xl shrink-0 opacity-80">
            {selectedMeta.badge}
          </div>
        </div>
      )}
    </div>
  );
};
