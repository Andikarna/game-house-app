'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { AvatarSelector } from '../../components/ui/AvatarSelector';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { LogIn } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const router = useRouter();
  const { nickname, avatar, setNickname, setAvatar } = useSettingsStore();
  const { socket, setRoom, setPlayerId, playerId, addToast } = useGameStore();

  const [roomCode, setRoomCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean symbols and spaces - keep only letters and numbers
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      addToast('Please enter the 5-digit room code (e.g. 48291).', 'error');
      return;
    }

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
      'room:join',
      {
        roomCode: cleanCode,
        nickname: nickname.trim(),
        avatar,
        playerId,
      },
      (res) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          const me = res.room.players.find(p => p.socketId === socket.id || p.id === playerId);
          if (me) {
            setPlayerId(me.id);
          }
          onClose();
          router.push(`/room/${res.room.code}`);
        } else {
          addToast(res.error || 'Room not found. Please verify the room code.', 'error');
        }
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Party Room">
      <form onSubmit={handleJoin} className="flex flex-col gap-4 sm:gap-5">
        <div>
          <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Room Code (5 Digits, No Symbols)
          </label>
          <input
            type="text"
            required
            maxLength={8}
            autoFocus
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
            placeholder="e.g. 48291"
            className="w-full px-4 py-3 bg-surface-elevated border border-slate-700 rounded-xl text-amber-300 font-black tracking-widest text-2xl text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <span className="text-[10px] text-slate-400 mt-1 block text-center">
            Enter the 5-digit number shown on your friend's screen
          </span>
        </div>

        <div>
          <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Your Nickname
          </label>
          <input
            type="text"
            required
            maxLength={18}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname..."
            className="w-full px-4 py-2.5 bg-surface-elevated border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Select Your Climber Avatar
          </label>
          <AvatarSelector selected={avatar} onSelect={setAvatar} />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          glow
          isLoading={isLoading}
          icon={<LogIn className="w-5 h-5" />}
          className="w-full mt-2 font-black py-3"
        >
          Join Lobby
        </Button>
      </form>
    </Modal>
  );
};
