import { useEffect, useState } from 'react';
import { io as ioClient, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/useGameStore';
import { useEmoteStore } from '../stores/useEmoteStore';
import { soundManager } from '../components/audio/SoundManager';
import { globalPollingSocket } from '../lib/polling-socket';

let globalSocket: any = null;
let isSocketInitialized = false;

export function getGlobalSocket() {
  return globalSocket || (globalPollingSocket as any);
}

export function useSocket() {
  const {
    setSocket,
    setIsConnected,
    setPing,
    setRoom,
    setGameState,
    setImpostorRole,
    setCountdown,
    setGameResults,
    addToast,
    resetGame,
    playerId,
    room,
  } = useGameStore();

  const { triggerEmote } = useEmoteStore();
  const [, setRerender] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Determine target Socket.IO URL
    let serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
    if (!serverUrl) {
      const hostname = window.location.hostname || 'localhost';
      serverUrl = `http://${hostname}:4000`;
    }

    if (!globalSocket) {
      try {
        globalSocket = ioClient(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 4000,
          autoConnect: true,
        });
      } catch (err) {
        console.warn('Could not initialize direct Socket.IO client, falling back to polling socket', err);
        globalSocket = globalPollingSocket as any;
      }
    }

    const socket = globalSocket;
    setSocket(socket);

    if (room?.code && playerId && globalPollingSocket.setContext) {
      globalPollingSocket.setContext(room.code, playerId);
    }

    if (!isSocketInitialized && socket) {
      isSocketInitialized = true;

      socket.on('connect', () => {
        setIsConnected(true);
        addToast('Connected to GameHouse server', 'success');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', () => {
        // If standalone socket server fails to connect, fallback to polling socket
        if (socket !== globalPollingSocket) {
          console.warn('Socket.IO connection failed, switching to polling fallback');
        }
      });

      // Room Events
      socket.on('room:updated', (updatedRoom: any) => {
        setRoom(updatedRoom);
        if (updatedRoom.status === 'lobby') {
          resetGame();
          soundManager.playLobbyBGM();
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

      // Game Countdown & Start Events
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

      socket.on('game:started', (initialState: any) => {
        setCountdown(null);
        setGameState(initialState);
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

      // Impostor Desa Specific Events
      socket.on('impostor:private-role', (roleData: any) => {
        setImpostorRole(roleData);
      });

      socket.on('impostor:state', (state: any) => {
        setGameState(state);
      });

      socket.on('impostor:result', (resultData: any) => {
        setGameState((prev: any) => ({
          ...(prev || {}),
          phase: 'result',
          resultData,
          winner: resultData.winner,
          winReason: resultData.winReason,
        }));
      });

      socket.on('emote:received', (emoteEvent: any) => {
        triggerEmote(emoteEvent);
      });

      socket.on('game:emote', (emoteEvent: any) => {
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

      socket.on('error:message', (msg: string) => {
        addToast(msg, 'error');
      });
    }
  }, [room?.code, playerId]);

  return (globalSocket || globalPollingSocket) as any;
}
