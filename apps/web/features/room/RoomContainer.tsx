'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSocket, getGlobalSocket } from '../../hooks/useSocket';
import { globalPollingSocket } from '../../lib/polling-socket';
import { LobbyView } from '../lobby/LobbyView';
import { PanjatPinangView } from '../games/panjat-pinang/PanjatPinangView';
import { LudoView } from '../games/ludo/LudoView';
import { ImpostorDesaView } from '../games/impostor-desa/ImpostorDesaView';
import { HiddenTeamView } from '../games/hidden-team/HiddenTeamView';
import { Button } from '../../components/ui/Button';
import { AvatarSelector } from '../../components/ui/AvatarSelector';
import { GameHouseLogo } from '../../components/branding/GameHouseLogo';
import { ToastContainer } from '../../components/ui/ToastContainer';
import { soundManager } from '../../components/audio/SoundManager';
import { ArrowLeft, LogIn } from 'lucide-react';
import Link from 'next/link';

interface RoomContainerProps {
  roomCode: string;
}

export const RoomContainer: React.FC<RoomContainerProps> = ({ roomCode }) => {
  const socket = useSocket();
  const { room, playerId, setPlayerId, setRoom, addToast } = useGameStore();
  const { nickname, avatar, setNickname, setAvatar } = useSettingsStore();

  const [isJoining, setIsJoining] = useState(false);

  // Clean code without symbols
  const cleanCode = (roomCode || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // If already in this room, proceed directly
  const isInThisRoom = room && (room.code === cleanCode || room.code === roomCode);

  // Auto-play BGM in room
  useEffect(() => {
    soundManager.playLobbyBGM();
  }, []);

  // Check if player can auto-reconnect upon page refresh
  useEffect(() => {
    if (isInThisRoom || !cleanCode) return;

    let isMounted = true;
    const attemptAutoReconnect = async () => {
      try {
        const res = await fetch(`/api/rooms/${cleanCode}?playerId=${playerId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.room) {
          const isPlayerInRoom = data.room.players?.some((p: any) => p.id === playerId);
          if (isPlayerInRoom) {
            setRoom(data.room);
            if (data.gameState) {
              useGameStore.getState().setGameState(data.gameState);
            }
            if (globalPollingSocket.setContext) {
              globalPollingSocket.setContext(cleanCode, playerId);
            }
          }
        }
      } catch (err) {
        // Silent fallback - user can click "Enter Room"
      }
    };

    attemptAutoReconnect();
    return () => {
      isMounted = false;
    };
  }, [cleanCode, isInThisRoom, playerId, setRoom]);

  const handleJoinDirectly = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeSocket = socket?.connected ? socket : getGlobalSocket();
    if (!activeSocket || !activeSocket.connected) {
      addToast('Connecting to game server...', 'info');
      return;
    }

    if (!nickname.trim() || nickname.length < 2) {
      addToast('Please enter a nickname with at least 2 characters.', 'error');
      return;
    }

    setIsJoining(true);
    activeSocket.emit(
      'room:join',
      {
        roomCode: cleanCode,
        nickname: nickname.trim(),
        avatar,
        playerId,
      },
      (res: any) => {
        setIsJoining(false);
        if (res.success && res.room) {
          setRoom(res.room);
          if (res.playerId) {
            setPlayerId(res.playerId);
          }
          if (globalPollingSocket.setContext) {
            globalPollingSocket.setContext(res.room.code, res.playerId || playerId);
          }
        } else {
          addToast(res.error || `Room ${cleanCode} not found. Please verify the 5-digit room code.`, 'error');
        }
      }
    );
  };

  // If not yet in room, show the Join form
  if (!isInThisRoom) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-3 sm:p-4 py-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-surface border border-slate-700/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl z-10 text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <GameHouseLogo size="sm" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
            Join Party Room
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mb-4 sm:mb-6">
            Room Code: <span className="text-amber-400 font-black text-lg tracking-wider">{cleanCode}</span>
          </p>

          <form onSubmit={handleJoinDirectly} className="flex flex-col gap-4 text-left">
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
                className="w-full px-4 py-2.5 sm:py-3 bg-surface-elevated border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Choose Climber Avatar
              </label>
              <AvatarSelector selected={avatar} onSelect={setAvatar} />
            </div>

            <Button
              type="submit"
              variant="orange"
              size="lg"
              glow
              isLoading={isJoining}
              className="w-full mt-2 font-black py-3"
              icon={<LogIn className="w-5 h-5" />}
            >
              Enter Room
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to GameHouse Home
            </Link>
          </div>
        </div>

        <ToastContainer />
      </div>
    );
  }

  // If in game, render Arena based on selected game
  if (room.status === 'in-game' || room.status === 'countdown' || room.status === 'finished') {
    if (room.settings.gameId === 'hidden-team') {
      return (
        <>
          <HiddenTeamView />
          <ToastContainer />
        </>
      );
    }
    if (room.settings.gameId === 'impostor-desa') {
      return (
        <>
          <ImpostorDesaView />
          <ToastContainer />
        </>
      );
    }
    if (room.settings.gameId === 'ludo') {
      return (
        <>
          <LudoView />
          <ToastContainer />
        </>
      );
    }
    return (
      <>
        <PanjatPinangView />
        <ToastContainer />
      </>
    );
  }

  // Otherwise in Lobby
  return (
    <>
      <LobbyView />
      <ToastContainer />
    </>
  );
};
