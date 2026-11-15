import React, { useState, useEffect } from 'react';
import { PanjatPinangGameState, AVATAR_OPTIONS, AvatarId } from '@gamehouse/shared';
import { Trophy, Timer, Flame, Maximize2, Minimize2, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../../../stores/useGameStore';
import { soundManager } from '../../../components/audio/SoundManager';

interface SpectatorHUDProps {
  gameState: PanjatPinangGameState;
}

export const GameSpectatorHUD: React.FC<SpectatorHUDProps> = ({ gameState }) => {
  const { room, playerId } = useGameStore();
  const [showMobileRankings, setShowMobileRankings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(soundManager.getIsMuted());

  useEffect(() => {
    return soundManager.subscribeMusicChange((playing) => {
      setIsAudioMuted(!playing);
    });
  }, []);

  const handleToggleAudio = () => {
    const isPlaying = soundManager.toggleMusic();
    setIsAudioMuted(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const remainingTime = gameState?.timerSecondsRemaining ?? 0;
  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.floor(remainingTime % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Sorted list of climbers
  const rankedClimbers = Object.values(gameState?.climbers || {})
    .sort((a, b) => b.height - a.height)
    .map(c => {
      const p = room?.players.find(player => player.id === c.playerId);
      return {
        ...c,
        nickname: p?.nickname || 'Climber',
        avatar: p?.avatar || 'climber-red',
      };
    });

  const gameMode = gameState?.gameMode || room?.settings.gameMode || 'classic-race';

  return (
    <>
      {/* Top Center: Timer, Mode Badge & Fullscreen Toggle */}
      <div className="absolute top-[max(6px,env(safe-area-inset-top,6px))] sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-3 bg-surface/90 backdrop-blur-md px-2.5 sm:px-5 py-1 sm:py-2 rounded-2xl border border-slate-700/60 shadow-xl z-20 select-none max-w-[95%]">
        <div className="flex items-center gap-1.5 sm:gap-2 text-white font-black text-base sm:text-xl tracking-wider">
          <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
          <span>{formattedTime}</span>
        </div>

        <div className="h-3 sm:h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-300">
          <Flame className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">{gameMode.replace('-', ' ')}</span>
          <span className="sm:hidden">{gameMode === 'classic-race' ? 'Race' : gameMode === 'survival-climb' ? 'Survival' : 'Skill'}</span>
        </div>

        {/* Mobile Trophy Drawer Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileRankings(!showMobileRankings)}
          className="md:hidden p-1 rounded-lg bg-surface-elevated text-amber-400 border border-slate-700 active:scale-95 flex items-center gap-1 text-[10px] font-bold"
        >
          <Trophy className="w-3 h-3" />
          <span>Rank</span>
          {showMobileRankings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Music / Audio BGM Toggle */}
        <button
          type="button"
          onClick={handleToggleAudio}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated active:scale-95 transition-colors"
          title={isAudioMuted ? 'Nyalakan Musik (BGM)' : 'Matikan Musik (Mute)'}
        >
          {isAudioMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated active:scale-95"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Desktop Top Right: Live Leaderboard */}
      <div className="absolute top-4 right-4 hidden md:flex flex-col gap-1.5 bg-surface/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 shadow-xl z-20 w-56 select-none">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-extrabold text-slate-300 uppercase tracking-wider">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Live Rankings</span>
        </div>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {rankedClimbers.map((climber, idx) => {
            const isMe = climber.playerId === playerId;
            const meta = AVATAR_OPTIONS.find(a => a.id === climber.avatar) || AVATAR_OPTIONS[0];

            return (
              <div
                key={climber.playerId}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                  isMe ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/50' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-4 font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    #{idx + 1}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="truncate max-w-[90px]">{climber.nickname}</span>
                </div>
                <span className="font-extrabold text-orange-400">
                  {Math.round(climber.height)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Rankings Dropdown Modal */}
      {showMobileRankings && (
        <div className="md:hidden absolute top-[max(52px,calc(env(safe-area-inset-top,0px)+44px))] left-3 right-3 bg-surface/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-2xl z-40 select-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-extrabold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Live Rankings
            </span>
            <button
              onClick={() => setShowMobileRankings(false)}
              className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-surface-elevated"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-1.5 mt-2 max-h-40 overflow-y-auto">
            {rankedClimbers.map((climber, idx) => {
              const isMe = climber.playerId === playerId;
              const meta = AVATAR_OPTIONS.find(a => a.id === climber.avatar) || AVATAR_OPTIONS[0];

              return (
                <div
                  key={climber.playerId}
                  className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                    isMe ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/50' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4 font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate max-w-[130px]">{climber.nickname} {isMe && '(You)'}</span>
                  </div>
                  <span className="font-extrabold text-orange-400">
                    {Math.round(climber.height)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimap: Vertical Pole Height Tracker */}
      <div className="absolute top-14 sm:top-20 right-2 sm:right-4 md:right-64 bottom-44 sm:bottom-28 w-4 sm:w-6 bg-slate-900/70 backdrop-blur-sm rounded-full border border-slate-800 flex flex-col items-center justify-between py-1.5 sm:py-2 z-20 pointer-events-none select-none">
        <span className="text-[8px] sm:text-[10px]">🏁</span>

        <div className="relative w-full flex-1 mx-auto my-1">
          {rankedClimbers.map(c => {
            const meta = AVATAR_OPTIONS.find(a => a.id === c.avatar) || AVATAR_OPTIONS[0];
            const isMe = c.playerId === playerId;
            return (
              <div
                key={c.playerId}
                className={`absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-150 ${
                  isMe ? 'w-3 h-3 sm:w-4 sm:h-4 border-2 border-white z-10' : 'w-2 h-2 sm:w-3 sm:h-3'
                }`}
                style={{
                  bottom: `${c.height}%`,
                  backgroundColor: meta.color,
                }}
                title={`${c.nickname}: ${Math.round(c.height)}%`}
              />
            );
          })}
        </div>

        <span className="text-[8px] sm:text-[10px]">🌱</span>
      </div>
    </>
  );
};
