'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { GameMode, RoomSettings } from '@gamehouse/shared';
import { 
  Users, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  Play, 
  LogOut, 
  UserX, 
  ShieldAlert, 
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Wifi,
  Settings
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ClimberAvatarIcon, AvatarSelector } from '../../components/ui/AvatarSelector';
import { GameHouseLogo } from '../../components/branding/GameHouseLogo';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Modal } from '../../components/ui/Modal';

export const LobbyView: React.FC = () => {
  const { socket, room, playerId, setPlayerId, ping, addToast } = useGameStore();
  const { isMuted, toggleMute, avatar, setAvatar } = useSettingsStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileTab, setMobileTab] = useState<'players' | 'settings'>('players');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  if (!room) return null;

  // Accurately find current player by matching EITHER socket.id OR playerId
  const myPlayer = room.players.find(p => 
    (socket?.id && p.socketId === socket.id) ||
    (playerId && p.id === playerId)
  );

  const hostPlayer = room.players.find(p => p.isHost || p.id === room.hostId);

  // Sync playerId in store if it differs
  useEffect(() => {
    if (myPlayer && myPlayer.id !== playerId) {
      setPlayerId(myPlayer.id);
    }
  }, [myPlayer, playerId, setPlayerId]);

  // Determine if this client is the room Host
  const isHost = Boolean(
    myPlayer?.isHost || 
    (myPlayer && room.hostId === myPlayer.id) || 
    room.hostId === playerId
  );

  const nonHostPlayers = room.players.filter(p => !p.isHost && p.id !== room.hostId);
  const allReady = nonHostPlayers.length === 0 ? true : nonHostPlayers.every(p => p.isReady);
  const canStart = isHost && room.players.length >= 1 && allReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    addToast('Room code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    addToast('Invitation link copied! Share with your friends!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleReady = () => {
    if (socket && !isHost) {
      socket.emit('room:ready', !myPlayer?.isReady);
    }
  };

  const handleUpdateMode = (gameMode: GameMode) => {
    if (socket && isHost) {
      socket.emit('room:update-settings', { gameMode });
    }
  };

  const handleUpdateDuration = (durationSeconds: number) => {
    if (socket && isHost) {
      socket.emit('room:update-settings', { durationSeconds });
    }
  };

  const handleKick = (targetId: string) => {
    if (socket && isHost) {
      socket.emit('room:kick-player', targetId);
    }
  };

  const handleStartGame = () => {
    if (socket && canStart) {
      socket.emit('game:start');
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('room:leave');
      window.location.href = '/';
    }
  };

  const handleSwitchGame = (gameId: 'panjat-pinang' | 'ludo') => {
    if (socket && isHost) {
      if (gameId === 'ludo') {
        socket.emit('room:update-settings', {
          gameId: 'ludo',
          gameMode: 'classic',
          maxPlayers: Math.min(room.settings.maxPlayers, 4),
        });
      } else {
        socket.emit('room:update-settings', {
          gameId: 'panjat-pinang',
          gameMode: 'classic-race',
          maxPlayers: Math.max(room.settings.maxPlayers, 8),
        });
      }
    }
  };

  const modes: { id: GameMode; title: string; desc: string; icon: string }[] = [
    {
      id: 'classic-race',
      title: 'Classic Race',
      desc: 'First climber to reach the gifts at top wins!',
      icon: '🏁',
    },
    {
      id: 'survival-climb',
      title: 'Survival Climb',
      desc: 'Pole gets greasier over time. Highest climber when time expires wins!',
      icon: '🔥',
    },
    {
      id: 'skill-battle',
      title: 'Skill Battle',
      desc: 'Faster skill cooldowns and tactical banana sabotage!',
      icon: '⚡',
    },
  ];

  const ludoModes: { id: GameMode; title: string; desc: string; icon: string }[] = [
    {
      id: 'classic',
      title: 'Classic Ludo',
      desc: 'Standard traditional rules. First to get all 4 tokens home wins!',
      icon: '🎲',
    },
    {
      id: 'quick',
      title: 'Quick Match',
      desc: 'Fast party mode. First to get 2 tokens home wins!',
      icon: '⚡',
    },
  ];

  const currentModes = room.settings.gameId === 'ludo' ? ludoModes : modes;

  return (
    <div className="min-h-screen bg-background text-white p-3 sm:p-8 pb-32 sm:pb-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-slate-800">
        <GameHouseLogo size="sm" />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Latency badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-elevated border border-slate-700/60 text-[11px] sm:text-xs font-semibold text-slate-300">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>{ping > 0 ? `${ping}ms` : 'Online'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 sm:p-2.5 rounded-xl bg-surface-elevated border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Leave Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveRoom}
            icon={<LogOut className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Leave
          </Button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex w-full max-w-6xl mb-4 bg-surface p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => setMobileTab('players')}
          className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'players'
              ? 'bg-indigo-600 text-white shadow-glow-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Climbers ({room.players.length}/{room.settings.maxPlayers})</span>
        </button>
        <button
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-glow-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings & Code</span>
        </button>
      </div>

      {/* Main Lobby Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Room Info & Settings */}
        <div className={`lg:col-span-5 flex flex-col gap-4 sm:gap-6 ${mobileTab === 'settings' ? 'block' : 'hidden lg:flex'}`}>
          {/* Room Code & Invite Card */}
          <div className="bg-surface border border-slate-700/70 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Room Code (5 Digits)
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {room.players.length} / {room.settings.maxPlayers} Climbers
              </span>
            </div>

            {/* Room Code Display */}
            <div className="flex items-center justify-between bg-surface-elevated border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 mb-3 sm:mb-4">
              <span className="text-2xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                {room.code}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCode}
                icon={copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Share Invitation Link Button */}
            <Button
              variant="accent"
              className="w-full"
              size="md"
              glow
              onClick={handleCopyInviteLink}
              icon={copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            >
              {copiedLink ? 'Link Copied!' : 'Copy Invitation Link'}
            </Button>
          </div>

          {/* Game & Mode Settings Card */}
          <div className="bg-surface border border-slate-700/70 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base sm:text-lg text-white">Game Settings</h3>
              {isHost ? (
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Host Controls
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Host: <strong className="text-amber-400">{hostPlayer?.nickname || 'Host'}</strong>
                </span>
              )}
            </div>

            {/* Selected Game */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                  Game {isHost ? '(Host can click to change)' : ''}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleSwitchGame('panjat-pinang')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                    room.settings.gameId === 'panjat-pinang'
                      ? 'bg-orange-600/25 border-orange-500 shadow-glow-orange text-white'
                      : 'bg-surface-elevated/60 border-slate-800 text-slate-400 hover:text-white'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-xl sm:text-2xl">🌴</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Panjat Pinang</h5>
                    <p className="text-[10px] text-slate-400">2-8 Pemain</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleSwitchGame('ludo')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                    room.settings.gameId === 'ludo'
                      ? 'bg-indigo-600/25 border-indigo-500 shadow-glow-primary text-white'
                      : 'bg-surface-elevated/60 border-slate-800 text-slate-400 hover:text-white'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-xl sm:text-2xl">🎲</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Ludo Party</h5>
                    <p className="text-[10px] text-slate-400">2-4 Pemain (Board)</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Game Modes Selection */}
            <div>
              <label className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 mb-1.5 block">
                Game Mode {isHost ? '(Click to change)' : ''}
              </label>
              <div className="flex flex-col gap-2">
                {currentModes.map((mode) => {
                  const isSelected = room.settings.gameMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleUpdateMode(mode.id)}
                      className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-400 shadow-glow-primary'
                          : 'bg-surface-elevated/60 border-slate-800 hover:border-slate-700'
                      } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="text-lg sm:text-xl mt-0.5">{mode.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs sm:text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {mode.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{mode.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selector */}
            {isHost && (
              <div>
                <label className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 mb-1.5 block">
                  Time Limit
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[120, 180, 240].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleUpdateDuration(sec)}
                      className={`py-1.5 sm:py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        room.settings.durationSeconds === sec
                          ? 'bg-orange-500/20 text-orange-300 border-orange-400'
                          : 'bg-surface-elevated text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {sec / 60} Min
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Climber Player List */}
        <div className={`lg:col-span-7 flex flex-col justify-between gap-4 sm:gap-6 ${mobileTab === 'players' ? 'block' : 'hidden lg:flex'}`}>
          <div className="bg-surface border border-slate-700/70 rounded-3xl p-4 sm:p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <h3 className="font-black text-base sm:text-lg text-white">
                  Climbers in Lobby ({room.players.length}/{room.settings.maxPlayers})
                </h3>
              </div>

              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">
                Min. 2 players to start
              </span>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
              {room.players.map((p) => {
                const isThisPlayerMe = (myPlayer && p.id === myPlayer.id) || p.id === playerId || (socket?.id && p.socketId === socket.id);
                const isPlayerHost = p.isHost || p.id === room.hostId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isThisPlayerMe
                        ? 'bg-indigo-600/15 border-indigo-400 shadow-glow-primary'
                        : 'bg-surface-elevated/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 truncate">
                      <ClimberAvatarIcon avatar={p.avatar} size={42} />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[120px]">
                            {p.nickname}
                          </span>
                          {isThisPlayerMe && (
                            <>
                              <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/30 border border-indigo-500/50 px-1.5 py-0.5 rounded">
                                YOU
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsAvatarModalOpen(true)}
                                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-0.5 rounded cursor-pointer transition-all ml-1"
                              >
                                Ganti Karakter
                              </button>
                            </>
                          )}
                        </div>

                        {isPlayerHost ? (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-400">
                            <Crown className="w-3 h-3" /> Host
                          </span>
                        ) : p.isReady ? (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                            <Clock className="w-3 h-3" /> Waiting
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Host kick button */}
                    {isHost && !isPlayerHost && (
                      <button
                        onClick={() => handleKick(p.id)}
                        title="Kick player"
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Empty Player Slots */}
              {Array.from({ length: Math.max(0, room.settings.maxPlayers - room.players.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-slate-800 bg-surface/30 text-[11px] font-semibold text-slate-600"
                >
                  Waiting for climber...
                </div>
              ))}
            </div>

            {/* Desktop Bottom Actions */}
            <div className="hidden sm:flex pt-6 mt-4 border-t border-slate-800 items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                {room.players.length === 1 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Ready to play! Host can start now!
                  </span>
                ) : !allReady ? (
                  <span className="text-amber-300 font-semibold">
                    Waiting for climbers to get ready...
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> All climbers ready! Host can start!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Guest Action: Ready / Unready Toggle */}
                {!isHost && (
                  <div className="flex items-center gap-2">
                    {myPlayer?.isReady ? (
                      <>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>You are Ready! Waiting for Host to start...</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={handleToggleReady}
                        >
                          Cancel Ready
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        glow
                        onClick={handleToggleReady}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        className="font-black px-6"
                      >
                        I'm Ready!
                      </Button>
                    )}
                  </div>
                )}

                {/* Host Action: START BATTLE Button */}
                {isHost && (
                  <Button
                    variant="orange"
                    size="xl"
                    glow={canStart}
                    disabled={!canStart}
                    onClick={handleStartGame}
                    icon={<Play className="w-6 h-6 fill-white" />}
                    className={`font-black px-8 py-3.5 text-lg ${canStart ? 'shadow-glow-orange scale-102 animate-pulse' : 'opacity-50'}`}
                  >
                    START BATTLE!
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MOBILE STICKY BOTTOM ACTION BAR ================= */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-slate-800 p-3 pb-safe z-30 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex-1 truncate">
          <span className="text-[11px] font-bold text-slate-400 block truncate">
            {room.players.length === 1
              ? 'Solo/Party Ready • Tap START!'
              : !allReady
              ? 'Waiting for all ready...'
              : isHost
              ? 'All ready! Tap START!'
              : 'You are ready! Waiting for Host...'}
          </span>
          <span className="text-[10px] text-amber-400 font-extrabold uppercase">
            {room.code} • {isHost ? 'YOU ARE HOST' : 'GUEST'}
          </span>
        </div>

        {!isHost ? (
          <Button
            variant={myPlayer?.isReady ? 'secondary' : 'primary'}
            size="md"
            glow={!myPlayer?.isReady}
            onClick={handleToggleReady}
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="font-black shrink-0"
          >
            {myPlayer?.isReady ? 'Unready' : "I'm Ready!"}
          </Button>
        ) : (
          <Button
            variant="orange"
            size="md"
            glow={canStart}
            disabled={!canStart}
            onClick={handleStartGame}
            icon={<Play className="w-4 h-4 fill-white" />}
            className="font-black shrink-0 text-sm py-2.5 px-5"
          >
            START!
          </Button>
        )}
      </div>

      {/* Modal Ganti Karakter */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Pilih Karakter Anda"
      >
        <div className="flex flex-col gap-4">
          <AvatarSelector
            selected={myPlayer?.avatar || avatar}
            onSelect={(newAvatar) => {
              setAvatar(newAvatar);
              socket?.emit('player:update-avatar' as any, { avatar: newAvatar });
              setIsAvatarModalOpen(false);
              addToast('Karakter berhasil diubah!', 'success');
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
