'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { AvatarSelector } from '../../components/ui/AvatarSelector';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { getGlobalSocket } from '../../hooks/useSocket';
import { GameId, GameMode } from '@gamehouse/shared';
import { Sparkles, Users, Flame, Clock } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameId?: GameId;
  initialAutoFillBots?: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  initialGameId,
  initialAutoFillBots = false,
}) => {
  const router = useRouter();
  const { nickname, avatar, setNickname, setAvatar } = useSettingsStore();
  const { socket, setRoom, setPlayerId, playerId, addToast } = useGameStore();

  const [selectedGame, setSelectedGame] = useState<GameId>(
    initialGameId === 'snake-ladder' ? 'snake-ladder' : 'ludo'
  );
  const [roomName, setRoomName] = useState(`${nickname}'s Ludo Table`);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [autoFillBots, setAutoFillBots] = useState<boolean>(initialAutoFillBots);
  const [isLoading, setIsLoading] = useState(false);

  // Sync selected game whenever modal opens (only playable games allowed)
  React.useEffect(() => {
    if (isOpen) {
      if (initialAutoFillBots) {
        setAutoFillBots(true);
      }
      const nextGame: GameId = initialGameId === 'snake-ladder' ? 'snake-ladder' : 'ludo';
      setSelectedGame(nextGame);
      setMaxPlayers(4);
      setGameMode(nextGame === 'snake-ladder' ? 'snake-classic' : 'classic');
      setRoomName(
        nextGame === 'snake-ladder'
          ? `${nickname || 'Player'}'s Ular Tangga`
          : `${nickname || 'Player'}'s Ludo Table`
      );
    }
  }, [isOpen, initialGameId, nickname]);

  const handleSelectGame = (gameId: GameId) => {
    if (gameId === 'panjat-pinang') {
      addToast('Game Panjat Pinang sedang dalam pemeliharaan (maintenance).', 'info');
      return;
    }
    if (gameId === 'impostor-desa' || gameId === 'hidden-team') {
      addToast('Game ini masih berstatus Coming Soon dan belum dapat dimainkan.', 'info');
      return;
    }
    setSelectedGame(gameId);
    setMaxPlayers(4);
    setGameMode(gameId === 'snake-ladder' ? 'snake-classic' : 'classic');
    setRoomName(
      gameId === 'snake-ladder'
        ? `${nickname || 'Player'}'s Ular Tangga`
        : `${nickname || 'Player'}'s Ludo Table`
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGame !== 'ludo' && selectedGame !== 'snake-ladder') {
      addToast('Saat ini hanya Ludo Party & Ular Tangga yang dapat dimainkan. Game lain berstatus Maintenance / Coming Soon.', 'error');
      return;
    }

    if (!nickname.trim() || nickname.length < 2) {
      addToast('Please enter a nickname with at least 2 characters.', 'error');
      return;
    }

    const activeSocket = socket?.connected ? socket : getGlobalSocket();
    if (!activeSocket || !activeSocket.connected) {
      addToast('Connecting to game server...', 'info');
      return;
    }

    setIsLoading(true);
    activeSocket.emit(
      'room:create',
      {
        nickname: nickname.trim(),
        avatar,
        roomName: roomName.trim() || (selectedGame === 'ludo' ? `${nickname}'s Ludo Table` : `${nickname}'s Arena`),
        gameId: selectedGame,
        gameMode,
        maxPlayers,
        playerId,
      },
      (res: any) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          const hostPlayer = res.room.players?.find((p: any) => p.isHost);
          if (hostPlayer) {
            setPlayerId(hostPlayer.id);
          } else if (res.playerId) {
            setPlayerId(res.playerId);
          }
          if (autoFillBots) {
            activeSocket.emit('room:fill-bots');
          }
          onClose();
          router.push(`/room/${res.room.code}`);
        } else {
          addToast(res.error || 'Failed to create room', 'error');
        }
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Party Room">
      <form onSubmit={handleCreate} className="flex flex-col gap-5">
        {/* Nickname & Avatar */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Your Nickname
          </label>
          <input
            type="text"
            required
            maxLength={18}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setRoomName(`${e.target.value}'s Arena`);
            }}
            placeholder="Enter nickname..."
            className="w-full px-4 py-2.5 bg-surface-elevated border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Select Your Climber Avatar
          </label>
          <AvatarSelector selected={avatar} onSelect={setAvatar} />
        </div>

        {/* Game Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Pilih Permainan
          </label>

          {/* Row 1: Playable Games (2 balanced columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectGame('ludo')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 min-w-0 ${
                selectedGame === 'ludo'
                  ? 'bg-indigo-600/25 border-indigo-500 shadow-glow-primary text-white ring-1 ring-indigo-400/50'
                  : 'bg-surface-elevated/80 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0">
                🎲
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <h4 className="text-sm font-black leading-tight truncate">Ludo Party</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                    Siap
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">2–6 Pemain • Klasik & Cepat</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectGame('snake-ladder')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 min-w-0 ${
                selectedGame === 'snake-ladder'
                  ? 'bg-emerald-600/25 border-emerald-500 shadow-glow-primary text-white ring-1 ring-emerald-400/50'
                  : 'bg-surface-elevated/80 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                🐍
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <h4 className="text-sm font-black leading-tight truncate">Ular Tangga 2.5D</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                    Siap
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">2–6 Pemain • Ular Hidup</p>
              </div>
            </button>
          </div>

          {/* Row 2: Maintenance & Coming Soon (3 balanced columns) */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'panjat-pinang' as GameId,
                emoji: '🌴',
                title: 'Panjat Pinang',
                badge: 'Maint',
                badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                tooltip: 'Game Panjat Pinang sedang dalam pemeliharaan (maintenance)',
              },
              {
                id: 'impostor-desa' as GameId,
                emoji: '🌾',
                title: "I'amPostor",
                badge: 'Soon',
                badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                tooltip: "Game I'amPostor segera hadir (Coming Soon)",
              },
              {
                id: 'hidden-team' as GameId,
                emoji: '🕵️',
                title: 'Hidden Team',
                badge: 'Soon',
                badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                tooltip: 'Game Hidden Team segera hadir (Coming Soon)',
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled
                onClick={() => handleSelectGame(item.id)}
                className="p-2 rounded-xl border text-left flex flex-col gap-1 opacity-55 cursor-not-allowed bg-surface-elevated/40 border-slate-800 text-slate-500 overflow-hidden min-w-0"
                title={item.tooltip}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-lg grayscale leading-none">{item.emoji}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-[11px] font-bold leading-tight text-slate-400 truncate w-full">
                  {item.title}
                </h4>
              </button>
            ))}
          </div>
        </div>

        {/* Room Name */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Room Name
          </label>
          <input
            type="text"
            maxLength={30}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room Name..."
            className="w-full px-4 py-2.5 bg-surface-elevated border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Game Mode */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Game Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedGame === 'hidden-team' ? (
              [
                { id: 'hidden-team-5r', title: '5 Ronde (Standar)' },
                { id: 'hidden-team-4r', title: '4 Ronde (Cepat)' },
                { id: 'hidden-team-6r', title: '6 Ronde (Panjang)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id as GameMode)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    gameMode === m.id
                      ? 'bg-rose-600/30 text-rose-300 border-rose-400 shadow-glow-orange'
                      : 'bg-surface-elevated border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.title}
                </button>
              ))
            ) : selectedGame === 'impostor-desa' ? (
              [
                { id: 'impostor-classic', title: 'Tebak Impostor (Klasik)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id as GameMode)}
                  className="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all bg-emerald-600/30 text-emerald-300 border-emerald-400"
                >
                  {m.title}
                </button>
              ))
            ) : selectedGame === 'panjat-pinang' ? (
              [
                { id: 'classic-race', title: 'Classic Race' },
                { id: 'survival-climb', title: 'Survival' },
                { id: 'skill-battle', title: 'Skill Battle' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id as GameMode)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    gameMode === m.id
                      ? 'bg-orange-600/30 text-orange-300 border-orange-400 shadow-glow-orange'
                      : 'bg-surface-elevated text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m.title}
                </button>
              ))
            ) : selectedGame === 'snake-ladder' ? (
              [
                { id: 'snake-classic', title: 'Klasik (Pantul 100)' },
                { id: 'snake-quick', title: 'Cepat (Santai)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id as GameMode)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    gameMode === m.id
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400 shadow-glow-primary'
                      : 'bg-surface-elevated text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m.title}
                </button>
              ))
            ) : (
              [
                { id: 'classic', title: 'Classic (4 Bidak)' },
                { id: 'quick', title: 'Quick (2 Bidak Menang)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id as GameMode)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    gameMode === m.id
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-400 shadow-glow-primary'
                      : 'bg-surface-elevated text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Max Players */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kapasitas: {maxPlayers} Pemain
            </label>
            <span className="text-xs text-slate-500">
              {selectedGame === 'hidden-team'
                ? 'Tepat 6 Pemain Dewan'
                : selectedGame === 'impostor-desa'
                ? '4 - 6 Pemain'
                : selectedGame === 'ludo' || selectedGame === 'snake-ladder'
                ? '2 - 6 Pemain'
                : '2 - 8 Pemain'}
            </span>
          </div>
          {selectedGame === 'hidden-team' ? (
            <div className="p-2.5 rounded-xl bg-surface-elevated border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
              <span>🏛️ Kursi Dewan Tetap: <strong>6 Slot</strong></span>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">Fixed 6 Seats</span>
            </div>
          ) : (
            <input
              type="range"
              min={selectedGame === 'impostor-desa' ? 4 : 2}
              max={selectedGame === 'impostor-desa' || selectedGame === 'ludo' || selectedGame === 'snake-ladder' ? 6 : 8}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          )}
        </div>

        {/* Solo / Practice with Bots Toggle */}
        <div
          onClick={() => setAutoFillBots(!autoFillBots)}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
            autoFillBots
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10'
              : 'bg-surface-elevated/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div>
              <span className="text-xs font-extrabold text-white block">
                Main Sendiri (Otomatis Isi Bot AI)
              </span>
              <span className="text-[10px] text-slate-400 block">
                Slot langsung diisi bot latihan agar bisa langsung bermain solo
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoFillBots}
            onChange={(e) => setAutoFillBots(e.target.checked)}
            className="w-4 h-4 accent-purple-500 rounded cursor-pointer shrink-0"
          />
        </div>

        {/* Create Button */}
        <Button
          type="submit"
          variant="orange"
          size="lg"
          glow
          isLoading={isLoading}
          icon={<Sparkles className="w-5 h-5" />}
          className="w-full mt-2 font-black"
        >
          Create Room & Enter Lobby
        </Button>
      </form>
    </Modal>
  );
};
