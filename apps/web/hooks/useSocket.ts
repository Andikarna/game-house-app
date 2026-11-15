import { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { useEmoteStore } from '../stores/useEmoteStore';
import { soundManager } from '../components/audio/SoundManager';
import { globalPollingSocket } from '../lib/polling-socket';

let isInitialized = false;

export function getGlobalSocket() {
  return globalPollingSocket as any;
}

export function useSocket() {
  const {
    setSocket,
    setIsConnected,
    setPing,
    setRoom,
    setGameState,
    setCountdown,
    setGameResults,
    addToast,
    resetGame,
    playerId,
    room,
  } = useGameStore();

  const { triggerEmote } = useEmoteStore();

  useEffect(() => {
    const socket = globalPollingSocket as any;
    setSocket(socket);
    setIsConnected(true);

    if (room?.code && playerId) {
      globalPollingSocket.setContext(room.code, playerId);
    }

    if (!isInitialized) {
      isInitialized = true;

      socket.on('connect', () => {
        setIsConnected(true);
        addToast('Connected to GameHouse server', 'success');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Room Events
      socket.on('room:updated', (updatedRoom: any) => {
        setRoom(updatedRoom);
        if (updatedRoom.status === 'lobby') {
          resetGame();
        }
      });

      socket.on('room:player-joined', (newPlayer: any) => {
        addToast(`${newPlayer.nickname} joined the room!`, 'info');
      });

      socket.on('room:player-left', ({ nickname, newHostId }: any) => {
        addToast(`${nickname} left the room.`, 'info');
        if (newHostId && newHostId === playerId) {
          addToast('You are now the room Host!', 'success');
        }
      });

      socket.on('room:kicked', (reason: string) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'You have been kicked from the room.', 'error');
      });

      socket.on('room:closed', (reason: string) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'Room closed by host.', 'warning');
      });

      // Game Events
      socket.on('game:countdown', (count: number) => {
        setCountdown(count);
        if (count === 3) {
          setGameResults(null);
        }
        if (count > 0) {
          soundManager.playCountdown(count);
        } else {
          soundManager.playCountdown(0);
        }
      });

      socket.on('game:start', (initialState: any) => {
        setCountdown(null);
        setGameState(initialState);
        soundManager.playCountdown(0);
      });

      socket.on('game:state', (state: any) => {
        setGameState(state);
      });

      socket.on('game:ludo_state', (state: any) => {
        setGameState(state);
      });

      socket.on('game:finished', (results: any) => {
        setGameResults(results);
        soundManager.playVictory();
      });

      socket.on('emote:received', (emoteEvent: any) => {
        triggerEmote(emoteEvent);
      });

      socket.on('player:skill-used', ({ nickname, skill }: any) => {
        addToast(`${nickname} used skill: ${skill}!`, 'warning');
        soundManager.playSkill(skill);
      });

      socket.on('player:fallen', ({ nickname }: any) => {
        addToast(`${nickname} slipped down the pole!`, 'warning');
        soundManager.playSlip();
      });

      socket.on('player:recovered', ({ nickname }: any) => {
        addToast(`${nickname} recovered balance!`, 'info');
        soundManager.playRecovery();
      });
    }
  }, [room?.code, playerId]);

  return globalPollingSocket as any;
}
