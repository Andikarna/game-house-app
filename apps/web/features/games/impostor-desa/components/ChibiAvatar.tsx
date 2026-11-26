'use client';

import React, { useState, useEffect } from 'react';
import { AvatarId, AVATAR_OPTIONS, normalizeAvatarId } from '@gamehouse/shared';

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
  xs: { px: 34, badgeText: 'text-[9px]' },
  sm: { px: 44, badgeText: 'text-[10px]' },
  md: { px: 64, badgeText: 'text-xs' },
  lg: { px: 88, badgeText: 'text-sm' },
  xl: { px: 120, badgeText: 'text-base' },
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
  const normId = normalizeAvatarId(avatar);
  const meta = AVATAR_OPTIONS.find((a) => a.id === normId) || AVATAR_OPTIONS[0];
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [normId]);

  const borderColor = isImpostor ? '#EF4444' : customColor || meta.color;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className} ${
        isEliminated ? 'opacity-45 grayscale' : ''
      }`}
      style={{ width: cfg.px, height: cfg.px }}
    >
      {/* Crisp Circular Framed Avatar Portrait */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-md relative"
        style={{
          backgroundColor: `${borderColor}25`,
          border: `2.5px solid ${borderColor}`,
          boxShadow: isImpostor
            ? '0 0 14px rgba(239,68,68,0.65)'
            : `0 4px 12px ${borderColor}35`,
        }}
      >
        {!imgError ? (
          <img
            src={`/assets/characters/${normId}/avatar.png`}
            alt={meta.name}
            className="w-full h-full object-cover object-center"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={cfg.badgeText}>{meta.badge}</span>
        )}
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25 pointer-events-none" />
      </div>

      {/* Host Crown badge */}
      {isHost && (
        <span
          className="absolute -top-1.5 -right-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-amber-300 z-10"
          title="Room Host"
        >
          👑
        </span>
      )}

      {/* Impostor indicator badge */}
      {isImpostor && (
        <span
          className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-red-300 z-10 animate-pulse"
          title="Impostor"
        >
          😈
        </span>
      )}
    </div>
  );
};
