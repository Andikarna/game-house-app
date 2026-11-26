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

  const [selectedGame, setSelectedGame] = useState<GameId>('ludo');
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
      setSelectedGame('ludo');
      setMaxPlayers(4);
      setGameMode('classic');
      setRoomName(`${nickname || 'Player'}'s Ludo Table`);
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
    setGameMode('classic');
    setRoomName(`${nickname || 'Player'}'s Ludo Table`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGame !== 'ludo') {
      addToast('Saat ini hanya Ludo Party yang dapat dimainkan. Game lain berstatus Maintenance / Coming Soon.', 'error');
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
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Pilih Permainan
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              disabled
              onClick={() => handleSelectGame('panjat-pinang')}
              className="p-2.5 rounded-2xl border text-left flex items-center gap-2.5 opacity-50 cursor-not-allowed bg-surface-elevated/40 border-slate-800 text-slate-500 relative"
              title="Game Panjat Pinang sedang dalam pemeliharaan (maintenance)"
            >
              <span className="text-2xl grayscale">🌴</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black leading-tight text-slate-400">Panjat Pinang</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                    Maint
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Maintenance</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectGame('ludo')}
              className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                selectedGame === 'ludo'
                  ? 'bg-indigo-600/25 border-indigo-500 shadow-glow-primary text-white'
                  : 'bg-surface-elevated/80 border-slate-700/80 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-2xl">🎲</span>
              <div>
                <h4 className="text-xs font-black leading-tight">Ludo Party</h4>
                <p className="text-[10px] text-slate-400">2-4 Pemain</p>
              </div>
            </button>

            <button
              type="button"
              disabled
              onClick={() => handleSelectGame('impostor-desa')}
              className="p-2.5 rounded-2xl border text-left flex items-center gap-2.5 opacity-50 cursor-not-allowed bg-surface-elevated/40 border-slate-800 text-slate-500 relative"
              title="Game I'amPostor segera hadir (Coming Soon)"
            >
              <span className="text-2xl grayscale">🌾</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black leading-tight text-slate-400">I'amPostor</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                    Soon
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Coming Soon</p>
              </div>
            </button>

            <button
              type="button"
              disabled
              onClick={() => handleSelectGame('hidden-team')}
              className="p-2.5 rounded-2xl border text-left flex items-center gap-2.5 opacity-50 cursor-not-allowed bg-surface-elevated/40 border-slate-800 text-slate-500 relative"
              title="Game Hidden Team segera hadir (Coming Soon)"
            >
              <span className="text-2xl grayscale">🕵️</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black leading-tight text-slate-400">Hidden Team</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                    Soon
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Coming Soon</p>
              </div>
            </button>
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
                : selectedGame === 'ludo'
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
              max={selectedGame === 'impostor-desa' ? 6 : selectedGame === 'ludo' ? 6 : 8}
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
