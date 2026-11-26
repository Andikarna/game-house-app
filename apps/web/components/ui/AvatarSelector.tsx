'use client';

import React, { useState, useEffect } from 'react';
import { AvatarId, AVATAR_OPTIONS, PRIMARY_AVATARS, normalizeAvatarId, AvatarOption } from '@gamehouse/shared';
import { Check } from 'lucide-react';

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
  showDetails?: boolean;
}

export const ClimberAvatarIcon: React.FC<{ 
  avatar?: AvatarId | string; 
  size?: number; 
  className?: string;
  showBadge?: boolean;
  shape?: 'rounded' | 'circle';
}> = ({ 
  avatar, 
  size = 48, 
  className = '',
  showBadge = false,
  shape = 'rounded',
}) => {
  const normId = normalizeAvatarId(avatar);
  const meta: AvatarOption = AVATAR_OPTIONS.find(a => a.id === normId) || AVATAR_OPTIONS[0];
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [normId]);

  const avatarSrc = `/assets/characters/${normId}/avatar.png`;
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full ${radiusClass} overflow-hidden relative flex items-center justify-center shadow-md`}
        style={{
          backgroundColor: `${meta.color}22`,
          border: `2px solid ${meta.color}CC`,
          boxShadow: `0 4px 14px ${meta.color}33`,
        }}
      >
        {!imgError ? (
          <img
            src={avatarSrc}
            alt={meta.name}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100" height="100" fill={`${meta.color}44`} />
            <text 
              x="50" 
              y="55" 
              fontSize="42" 
              textAnchor="middle" 
              dominantBaseline="middle"
            >
              {meta.badge}
            </text>
          </svg>
        )}
        {/* Subtle inner specular rim */}
        <div className={`absolute inset-0 ${radiusClass} ring-1 ring-inset ring-white/20 pointer-events-none`} />
      </div>

      {showBadge && (
        <span 
          className="absolute -bottom-1 -right-1 text-[11px] leading-none bg-slate-900/95 rounded-full w-5 h-5 flex items-center justify-center border border-slate-600 shadow-lg z-10"
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
    <div className="flex flex-col gap-3.5">
      {/* Crisp 4x2 Character Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {primaryOptions.map((item) => {
          const isSelected = normSelected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-400 scale-[1.03] shadow-glow-primary ring-2 ring-indigo-400/40'
                  : 'bg-surface-elevated/80 border-slate-700/70 hover:border-slate-500 hover:bg-surface-elevated'
              }`}
            >
              <ClimberAvatarIcon avatar={item.id} size={54} />

              <span className={`mt-1.5 text-xs font-black truncate w-full text-center ${
                isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
              }`}>
                {item.name}
              </span>

              <span className="text-[10px] text-slate-400 font-semibold truncate w-full text-center leading-tight">
                {item.badge}
              </span>

              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-900 z-10">
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
          className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl border bg-slate-900/75 backdrop-blur-sm transition-all duration-300 shadow-inner"
          style={{ borderColor: `${selectedMeta.color}66` }}
        >
          <ClimberAvatarIcon avatar={selectedMeta.id} size={52} showBadge />

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
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
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              {selectedMeta.tagline}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
