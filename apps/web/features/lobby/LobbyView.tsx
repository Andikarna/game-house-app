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
  Settings,
  Bot,
  Plus
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ClimberAvatarIcon, AvatarSelector } from '../../components/ui/AvatarSelector';
import { GameHouseLogo } from '../../components/branding/GameHouseLogo';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Modal } from '../../components/ui/Modal';
import { ImpostorLobbyScreen } from '../games/impostor-desa/components/ImpostorLobbyScreen';
import { getGlobalSocket } from '../../hooks/useSocket';

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

  const isImpostorDesa = room.settings.gameId === 'impostor-desa';
  const isHiddenTeam = room.settings.gameId === 'hidden-team';
  const isPanjatPinang = room.settings.gameId === 'panjat-pinang';
  if (isImpostorDesa) {
    return <ImpostorLobbyScreen />;
  }
  const minPlayersRequired = isHiddenTeam ? 6 : (isImpostorDesa ? 4 : (room.settings.gameId === 'ludo' ? 2 : 1));
  const maxPlayersAllowed = (isHiddenTeam || isImpostorDesa || room.settings.gameId === 'ludo') ? 6 : 8;

  const nonHostPlayers = room.players.filter(p => !p.isHost && p.id !== room.hostId && !p.isBot);
  const allReady = nonHostPlayers.length === 0 ? true : nonHostPlayers.every(p => p.isReady);
  const canStart = isHost && !isPanjatPinang && room.players.length >= minPlayersRequired && room.players.length <= maxPlayersAllowed && allReady;

  const activeSocket = socket || getGlobalSocket();

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
    if (activeSocket && !isHost) {
      activeSocket.emit('room:ready', !myPlayer?.isReady);
    }
  };

  const handleUpdateMode = (gameMode: GameMode) => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:update-settings', { gameMode });
    }
  };

  const handleUpdateDuration = (durationSeconds: number) => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:update-settings', { durationSeconds });
    }
  };

  const handleKick = (targetId: string) => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:kick-player', targetId);
    }
  };

  // Bot Practice Mode Actions
  const handleAddBot = () => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:add-bot');
      addToast('Bot berhasil ditambahkan ke room.', 'info');
    }
  };

  const handleFillBots = () => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:fill-bots');
      addToast('Slot terisi penuh dengan Bot AI! Siap bermain sendiri.', 'success');
    }
  };

  const handleRemoveBot = (botId?: string) => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:remove-bot', { botId });
      addToast('Bot dikeluarkan dari room.', 'info');
    }
  };

  const handleClearBots = () => {
    if (activeSocket && isHost) {
      activeSocket.emit('room:clear-bots');
      addToast('Semua bot telah dikeluarkan.', 'info');
    }
  };

  const handleStartGame = () => {
    if (activeSocket && canStart) {
      activeSocket.emit('game:start');
    }
  };

  const handleLeaveRoom = () => {
    if (activeSocket) {
      activeSocket.emit('room:leave');
      window.location.href = '/';
    }
  };

  const handleSwitchGame = (gameId: 'panjat-pinang' | 'ludo' | 'impostor-desa' | 'hidden-team') => {
    if (gameId === 'panjat-pinang') {
      addToast('Game Panjat Pinang sedang dalam pemeliharaan (maintenance).', 'error');
      return;
    }
    if (socket && isHost) {
      if (gameId === 'hidden-team') {
        socket.emit('room:update-settings', {
          gameId: 'hidden-team',
          gameMode: 'hidden-team-5r',
          maxPlayers: 6,
          durationSeconds: 600,
        });
      } else if (gameId === 'impostor-desa') {
        socket.emit('room:update-settings', {
          gameId: 'impostor-desa',
          gameMode: 'impostor-classic',
          maxPlayers: 6,
          durationSeconds: 240,
        });
      } else if (gameId === 'ludo') {
        socket.emit('room:update-settings', {
          gameId: 'ludo',
          gameMode: 'classic',
          maxPlayers: Math.min(room.settings.maxPlayers, 6),
        });
      } else {
        socket.emit('room:update-settings', {
          gameId: 'panjat-pinang',
          gameMode: 'classic-race',
          maxPlayers: 8,
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

  const impostorModes: { id: GameMode; title: string; desc: string; icon: string }[] = [
    {
      id: 'impostor-classic',
      title: "Tebak I'amPostor",
      desc: '1 Impostor bersembunyi di antara warga. Temukan lewat kata rahasia & petunjuk!',
      icon: '🌾',
    },
  ];

  const hiddenTeamModes: Array<{ id: GameMode; title: string; desc: string; icon: string }> = [
    {
      id: 'hidden-team-5r',
      title: '5 Ronde Dewan (Standar)',
      desc: 'Pertarungan seimbang 5 ronde penuh kalkulasi suara dan pertukaran peran.',
      icon: '🕵️',
    },
    {
      id: 'hidden-team-4r',
      title: '4 Ronde Dewan (Cepat)',
      desc: 'Pertandingan intensif 4 ronde cepat.',
      icon: '⚡',
    },
    {
      id: 'hidden-team-6r',
      title: '6 Ronde Dewan (Panjang)',
      desc: 'Pertarungan maraton 6 ronde dewan penuh intrik.',
      icon: '👑',
    },
  ];

  const currentModes = room.settings.gameId === 'hidden-team'
    ? hiddenTeamModes
    : room.settings.gameId === 'impostor-desa'
    ? impostorModes
    : room.settings.gameId === 'ludo'
    ? ludoModes
    : modes;

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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled
                  onClick={() => handleSwitchGame('panjat-pinang')}
                  className="p-2.5 rounded-2xl border text-left flex items-center gap-2.5 opacity-50 cursor-not-allowed bg-surface-elevated/40 border-slate-800 text-slate-500 relative"
                  title="Game Panjat Pinang sedang dalam pemeliharaan (maintenance)"
                >
                  <span className="text-xl sm:text-2xl grayscale">🌴</span>
                  <div>
                    <div className="flex items-center gap-1">
                      <h5 className="font-extrabold text-xs text-slate-400">Panjat Pinang</h5>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                        Maint
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">Maintenance</p>
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
                    <p className="text-[10px] text-slate-400">2-4 Pemain</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleSwitchGame('impostor-desa')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                    room.settings.gameId === 'impostor-desa'
                      ? 'bg-emerald-600/25 border-emerald-500 shadow-glow-primary text-white'
                      : 'bg-surface-elevated/60 border-slate-800 text-slate-400 hover:text-white'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-xl sm:text-2xl">🌾</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-white">I'amPostor</h5>
                    <p className="text-[10px] text-slate-400">4-6 Pemain</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleSwitchGame('hidden-team')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                    room.settings.gameId === 'hidden-team'
                      ? 'bg-rose-600/25 border-rose-500 shadow-glow-orange text-white'
                      : 'bg-surface-elevated/60 border-slate-800 text-slate-400 hover:text-white'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-xl sm:text-2xl">🕵️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-white">Hidden Team</h5>
                    <p className="text-[10px] text-slate-400">Tepat 6 Pemain</p>
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
                  {isImpostorDesa ? 'Warga & Pemain' : isHiddenTeam ? 'Dewan Pemain' : 'Pemain'} ({room.players.length}/{room.settings.maxPlayers})
                </h3>
              </div>

              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">
                {isHiddenTeam ? 'Tepat 6 pemain (bisa diisi Bot)' : isImpostorDesa ? 'Min. 4 pemain (maks. 6)' : 'Min. 2 players to start'}
              </span>
            </div>

            {/* Host Bot Controls */}
            {isHost && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 mb-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 border border-purple-500/30">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                    🤖
                  </div>
                  <div>
                    <span className="font-bold text-white block">Mode Main Sendiri (Bot AI)</span>
                    <span className="text-[10px] text-slate-400">Isi slot kosong dengan bot latihan otomatis</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFillBots}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Isi Bot Otomatis</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddBot}
                    disabled={room.players.length >= room.settings.maxPlayers}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bot</span>
                  </button>

                  {room.players.some((p) => p.isBot) && (
                    <button
                      type="button"
                      onClick={handleClearBots}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
                    >
                      <span>Hapus Bot</span>
                    </button>
                  )}
                </div>
              </div>
            )}

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
                          {p.isBot && (
                            <span className="text-[9px] font-black text-purple-300 bg-purple-500/25 border border-purple-500/50 px-1.5 py-0.5 rounded">
                              🤖 BOT
                            </span>
                          )}
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
                        ) : p.isBot ? (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-purple-300">
                            <Bot className="w-3 h-3 text-purple-400" /> AI Bot Ready
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

                    {/* Host kick / remove bot button */}
                    {isHost && !isPlayerHost && (
                      <button
                        onClick={() => p.isBot ? handleRemoveBot(p.id) : handleKick(p.id)}
                        title={p.isBot ? "Keluarkan Bot" : "Kick player"}
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
                  className="flex items-center justify-between p-3 rounded-2xl border border-dashed border-slate-800 bg-surface/30 text-[11px] font-semibold text-slate-500"
                >
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    Slot Kosong #{room.players.length + idx + 1}
                  </span>
                  {isHost && (
                    <button
                      type="button"
                      onClick={handleAddBot}
                      className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Bot</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Bottom Actions */}
            <div className="hidden sm:flex pt-6 mt-4 border-t border-slate-800 items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                {isPanjatPinang ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    🛠️ Game Panjat Pinang sedang dalam pemeliharaan (maintenance). Silakan ganti permainan.
                  </span>
                ) : isHiddenTeam && room.players.length !== 6 ? (
                  <div className="flex items-center gap-2.5">
                    <span className="text-purple-300 font-semibold">
                      Hidden Team butuh tepat 6 pemain (saat ini: {room.players.length}/6).
                    </span>
                    {isHost && (
                      <button
                        type="button"
                        onClick={handleFillBots}
                        className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md shadow-purple-500/25 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Isi Bot Otomatis ({6 - room.players.length} lagi)</span>
                      </button>
                    )}
                  </div>
                ) : isImpostorDesa && room.players.length < 4 ? (
                  <span className="text-amber-300 font-semibold">
                    Butuh minimal 4 pemain untuk memulai I'amPostor (saat ini: {room.players.length}/6)...
                  </span>
                ) : !allReady ? (
                  <span className="text-amber-300 font-semibold">
                    Menunggu semua pemain siap...
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Semua pemain siap! Host dapat memulai!
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
            {isHiddenTeam && room.players.length !== 6
              ? `Butuh 6 pemain (${room.players.length}/6)`
              : room.players.length === 1
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
