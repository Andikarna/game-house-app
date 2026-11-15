import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/useGameStore';
import { useEmoteStore } from '../stores/useEmoteStore';
import { soundManager } from '../components/audio/SoundManager';
import { ClientToServerEvents, ServerToClientEvents } from '@gamehouse/shared';

// Module-level persistent singleton socket so route navigation never disconnects the player!
let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isInitialized = false;

export function getGlobalSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return globalSocket;
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
  } = useGameStore();

  useEffect(() => {
    if (!globalSocket && typeof window !== 'undefined') {
      let serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
      if (!serverUrl) {
        const hostname = window.location.hostname || 'localhost';
        serverUrl = `http://${hostname}:4000`;
      }

      globalSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        autoConnect: true,
      });
    }

    const socket = globalSocket;
    if (!socket) return;

    setSocket(socket);
    setIsConnected(socket.connected);

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
      socket.on('room:updated', (updatedRoom) => {
        setRoom(updatedRoom);
        if (updatedRoom.status === 'lobby') {
          resetGame();
        }
      });

      socket.on('room:player-joined', (newPlayer) => {
        addToast(`${newPlayer.nickname} joined the room!`, 'info');
      });

      socket.on('room:player-left', ({ nickname, newHostId }) => {
        addToast(`${nickname} left the room.`, 'info');
        if (newHostId && newHostId === playerId) {
          addToast('You are now the room Host!', 'success');
        }
      });

      socket.on('room:kicked', (reason) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'You have been kicked from the room.', 'error');
      });

      socket.on('room:closed', (reason) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'Room closed by host.', 'warning');
      });

      // Game Events
      socket.on('game:countdown', (count) => {
        setCountdown(count);
        if (count === 3) {
          setGameResults(null);
        }
      });

      socket.on('game:started', (initialState) => {
        setCountdown(null);
        setGameState(initialState);
        addToast('BATTLE STARTED! CLIMB TO THE TOP!', 'success');
      });

      socket.on('game:state', (state) => {
        setGameState(state);
      });

      socket.on('game:finished', (results) => {
        setGameResults(results);
      });

      // Player SFX and action events
      socket.on('player:skill-used', ({ skill, nickname, playerId: pId }) => {
        soundManager.playSkill(skill);
        if (pId !== playerId) {
          addToast(`${nickname} activated ${skill.replace('_', ' ').toUpperCase()}!`, 'info');
        }
      });

      socket.on('player:fallen', ({ nickname, heightDropped, playerId: pId }) => {
        if (pId === playerId) {
          soundManager.playSlip();
          addToast(`You slipped and dropped ${heightDropped}%! MASH RECOVER!`, 'error');
        } else {
          addToast(`${nickname} slipped down!`, 'warning');
        }
      });

      socket.on('player:recovered', ({ nickname, playerId: pId }) => {
        if (pId === playerId) {
          soundManager.playRecovery();
          addToast('Recovered! Back in the race!', 'success');
        }
      });

      // In-Game Emote Received
      socket.on('game:emote', (emoteData) => {
        useEmoteStore.getState().triggerEmote(emoteData);
      });

      socket.on('error:message', (msg) => {
        addToast(msg, 'error');
      });

      // Heartbeat ping loop (every 3 seconds)
      setInterval(() => {
        if (socket.connected) {
          const start = Date.now();
          socket.emit('ping:check', start, (clientStart) => {
            const latency = Date.now() - clientStart;
            setPing(latency);
          });
        }
      }, 3000);
    }
  }, []);

  return globalSocket;
}
