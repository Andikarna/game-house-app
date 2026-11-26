'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Music2 } from 'lucide-react';
import { soundManager, MUSIC_TRACK_META, MusicTrackId } from './SoundManager';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface MusicControlProps {
  variant?: 'dark' | 'village';
  compact?: boolean;
}

export const MusicControl: React.FC<MusicControlProps> = ({
  variant = 'dark',
  compact = false,
}) => {
  const { isMuted, toggleMute } = useSettingsStore();
  const [trackInfo, setTrackInfo] = useState<{ playing: boolean; track: MusicTrackId }>({
    playing: soundManager.isBGMActive(),
    track: soundManager.getCurrentTrack(),
  });

  useEffect(() => {
    return soundManager.subscribeTrackChange(setTrackInfo);
  }, []);

  const meta = MUSIC_TRACK_META[trackInfo.track] || MUSIC_TRACK_META.lobby;

  const containerCls =
    variant === 'village'
      ? 'bg-white/10 border-white/15 text-amber-100'
      : 'bg-surface-elevated/90 border-slate-700/70 text-slate-200';

  return (
    <div className={`inline-flex items-center rounded-xl border backdrop-blur-md shadow-sm overflow-hidden ${containerCls}`}>
      {/* Track Switcher Button */}
      <button
        type="button"
        onClick={() => soundManager.cycleTrack()}
        title={`Ganti Lagu BGM (${meta.label} — ${meta.genre})`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 hover:bg-white/10 transition-colors cursor-pointer text-left"
      >
        {trackInfo.playing && !isMuted ? (
          <span className="flex items-end gap-0.5 h-3 w-3 shrink-0" aria-hidden="true">
            <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
            <span className="w-0.5 bg-amber-400 rounded-full animate-bounce h-3" />
            <span className="w-0.5 bg-indigo-400 rounded-full animate-pulse h-1.5" />
          </span>
        ) : (
          <Music2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}

        {!compact && (
          <span className="hidden md:inline text-[11px] font-bold tracking-tight whitespace-nowrap">
            {meta.emoji} {meta.label}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-white/15" />

      {/* Mute Toggle Button */}
      <button
        type="button"
        onClick={toggleMute}
        title={isMuted ? 'Nyalakan Musik & SFX' : 'Matikan Audio'}
        className="p-1.5 sm:p-2 hover:bg-white/10 transition-colors cursor-pointer"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-rose-400" />
        ) : (
          <Volume2 className="w-4 h-4 text-emerald-400" />
        )}
      </button>
    </div>
  );
};
