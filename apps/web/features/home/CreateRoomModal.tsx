'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { AvatarSelector } from '../../components/ui/AvatarSelector';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { GameId, GameMode } from '@gamehouse/shared';
import { Sparkles, Users, Flame, Clock } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { nickname, avatar, setNickname, setAvatar } = useSettingsStore();
  const { socket, setRoom, setPlayerId, playerId, addToast } = useGameStore();

  const [selectedGame, setSelectedGame] = useState<GameId>('panjat-pinang');
  const [roomName, setRoomName] = useState(`${nickname}'s Arena`);
  const [gameMode, setGameMode] = useState<GameMode>('classic-race');
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectGame = (gameId: GameId) => {
    setSelectedGame(gameId);
    if (gameId === 'ludo') {
      setMaxPlayers(4);
      setGameMode('classic');
      setRoomName(`${nickname}'s Ludo Table`);
    } else {
      setMaxPlayers(8);
      setGameMode('classic-race');
      setRoomName(`${nickname}'s Arena`);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim() || nickname.length < 2) {
      addToast('Please enter a nickname with at least 2 characters.', 'error');
      return;
    }

    if (!socket || !socket.connected) {
      addToast('Connecting to game server...', 'info');
      return;
    }

    setIsLoading(true);
    socket.emit(
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
      (res) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          const hostPlayer = res.room.players.find(p => p.isHost);
          if (hostPlayer) {
            setPlayerId(hostPlayer.id);
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
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectGame('panjat-pinang')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                selectedGame === 'panjat-pinang'
                  ? 'bg-orange-600/25 border-orange-500 shadow-glow-orange text-white'
                  : 'bg-surface-elevated/80 border-slate-700/80 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-2xl">🌴</span>
              <div>
                <h4 className="text-xs sm:text-sm font-black leading-tight">Panjat Pinang</h4>
                <p className="text-[10px] text-slate-400">2-8 Pemain</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectGame('ludo')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                selectedGame === 'ludo'
                  ? 'bg-indigo-600/25 border-indigo-500 shadow-glow-primary text-white'
                  : 'bg-surface-elevated/80 border-slate-700/80 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-2xl">🎲</span>
              <div>
                <h4 className="text-xs sm:text-sm font-black leading-tight">Ludo Party</h4>
                <p className="text-[10px] text-slate-400">2-4 Pemain (Klasik)</p>
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
            {selectedGame === 'panjat-pinang' ? (
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
              {selectedGame === 'ludo' ? '2 - 4 Pemain' : '2 - 8 Pemain'}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={selectedGame === 'ludo' ? 4 : 8}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer"
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
