import { useEffect, useState, useRef } from 'react';
import { io as ioClient, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/useGameStore';
import { useEmoteStore } from '../stores/useEmoteStore';
import { soundManager } from '../components/audio/SoundManager';
import { globalPollingSocket } from '../lib/polling-socket';
import { unoRealtime } from '../lib/uno-realtime';

let globalSocket: any = null;
const registeredSockets = new WeakSet<any>();

export function getGlobalSocket() {
  if (globalSocket) {
    return globalSocket;
  }
  return (globalPollingSocket as any);
}

export function useSocket() {
  const {
    setSocket,
    setIsConnected,
    setPing,
    setTransportMode,
    setRoom,
    setGameState,
    setImpostorRole,
    setHiddenTeamPrivate,
    setCountdown,
    setGameResults,
    setVoteKickState,
    addChatMessage,
    addToast,
    resetGame,
    playerId,
    room,
  } = useGameStore();

  const { triggerEmote } = useEmoteStore();
  const [, setRerender] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const attachSocketListeners = (targetSocket: any) => {
      if (!targetSocket || registeredSockets.has(targetSocket)) return;
      registeredSockets.add(targetSocket);

      targetSocket.on('connect', () => {
        setIsConnected(true);
        addToast('Connected to GameHouse server', 'success');
      });

      targetSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Room Events
      targetSocket.on('room:updated', (updatedRoom: any) => {
        setRoom(updatedRoom);
        if (updatedRoom.status === 'lobby') {
          resetGame();
          soundManager.playLobbyBGM();
        }
      });

      targetSocket.on('room:player-joined', (newPlayer: any) => {
        addToast(`${newPlayer.nickname} joined the room!`, 'info');
      });

      targetSocket.on('room:player-left', ({ nickname, newHostId }: any) => {
        addToast(`${nickname} left the room.`, 'info');
        if (newHostId && newHostId === playerId) {
          addToast('You are now the room Host!', 'success');
        }
      });

      targetSocket.on('room:kicked', (reason: string) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'You have been kicked from the room.', 'error');
      });

      targetSocket.on('room:closed', (reason: string) => {
        setRoom(null);
        resetGame();
        addToast(reason || 'Room closed by host.', 'warning');
      });

      // Game Countdown & Start Events
      targetSocket.on('game:countdown', (count: number) => {
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

      targetSocket.on('game:start', (initialState: any) => {
        setCountdown(null);
        setGameState(initialState);
        soundManager.playCountdown(0);
      });

      targetSocket.on('game:started', (initialState: any) => {
        setCountdown(null);
        setGameState(initialState);
      });

      targetSocket.on('game:state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('game:ludo_state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('game:snake_state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('game:uno_state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('game:finished', (results: any) => {
        setGameResults(results);
        soundManager.playVictory();
      });

      // Impostor Desa Specific Events
      targetSocket.on('impostor:private-role', (roleData: any) => {
        setImpostorRole(roleData);
      });

      targetSocket.on('impostor:state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('impostor:result', (resultData: any) => {
        setGameState((prev: any) => ({
          ...(prev || {}),
          phase: 'result',
          resultData,
          winner: resultData.winner,
          winReason: resultData.winReason,
        }));
      });

      // Hidden Team: Secret Role Specific Events
      targetSocket.on('hidden-team:private-state', (privateState: any) => {
        setHiddenTeamPrivate(privateState);
      });

      targetSocket.on('hidden-team:state', (state: any) => {
        setGameState(state);
      });

      targetSocket.on('hidden-team:round-result', (roundResult: any) => {
        setGameState((prev: any) => ({
          ...(prev || {}),
          phase: 'ROUND_RESOLUTION',
          currentRoundResult: roundResult,
        }));
      });

      targetSocket.on('hidden-team:match-result', (matchResult: any) => {
        setGameState((prev: any) => ({
          ...(prev || {}),
          phase: 'MATCH_FINISHED',
          matchResult,
        }));
      });

      targetSocket.on('emote:received', (emoteEvent: any) => {
        triggerEmote(emoteEvent);
      });

      targetSocket.on('game:emote', (emoteEvent: any) => {
        triggerEmote(emoteEvent);
      });

      targetSocket.on('player:skill-used', ({ nickname, skill }: any) => {
        addToast(`${nickname} used skill: ${skill}!`, 'warning');
        soundManager.playSkill(skill);
      });

      targetSocket.on('player:fallen', ({ nickname }: any) => {
        addToast(`${nickname} slipped down the pole!`, 'warning');
        soundManager.playSlip();
      });

      targetSocket.on('player:recovered', ({ nickname }: any) => {
        addToast(`${nickname} recovered balance!`, 'info');
        soundManager.playRecovery();
      });

      targetSocket.on('error:message', (msg: string) => {
        addToast(msg, 'error');
      });

      // Free Chat Messages
      targetSocket.on('game:chat-message', (chatMsg: any) => {
        addChatMessage(chatMsg);
        soundManager.playPop?.();
      });

      // Vote Kick Events
      targetSocket.on('game:vote-kick-started', (voteState: any) => {
        setVoteKickState(voteState);
        addToast(`Vote kick dimulai untuk ${voteState.targetNickname}!`, 'warning');
      });

      targetSocket.on('game:vote-kick-updated', (updateData: any) => {
        setVoteKickState((prev: any) =>
          prev
            ? {
                ...prev,
                yesCount: updateData.yesCount,
                noCount: updateData.noCount,
                requiredVotes: updateData.requiredVotes,
              }
            : null
        );
      });

      targetSocket.on('game:vote-kick-ended', (result: any) => {
        setVoteKickState(null);
        if (result.kicked) {
          addToast(`${result.targetNickname} telah di-kick dari permainan!`, 'error');
        } else {
          addToast(`Vote kick untuk ${result.targetNickname} berakhir: ${result.reason}`, 'info');
        }
      });
    };

    const switchToPolling = () => {
      if (globalSocket === globalPollingSocket) return;
      console.log('[useSocket] Switching to globalPollingSocket fallback');
      try {
        if (globalSocket && typeof globalSocket.close === 'function') {
          globalSocket.close();
        }
      } catch {}
      globalSocket = globalPollingSocket;
      attachSocketListeners(globalPollingSocket);
      setSocket(globalPollingSocket as any);
      setIsConnected(true);
      setTransportMode('polling');
    };

    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local');
    const configuredServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;

    // In production without standalone server URL, default directly to polling socket
    if (!isLocal && !configuredServerUrl) {
      if (globalSocket !== globalPollingSocket) {
        switchToPolling();
      } else {
        attachSocketListeners(globalPollingSocket);
        setSocket(globalPollingSocket as any);
        setIsConnected(true);
      }
      return;
    }

    const serverUrl = configuredServerUrl || `http://${hostname || 'localhost'}:4000`;

    if (!globalSocket) {
      try {
        globalSocket = ioClient(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 3500,
          autoConnect: true,
        });

        // Timeout fallback if standalone server is not reachable
        const connectTimeout = setTimeout(() => {
          if (globalSocket && !globalSocket.connected && globalSocket !== globalPollingSocket) {
            console.warn('[useSocket] Standalone socket timed out, falling back to polling socket');
            switchToPolling();
          }
        }, 3500);

        globalSocket.on('connect', () => {
          clearTimeout(connectTimeout);
          setIsConnected(true);
        });

        globalSocket.on('connect_error', () => {
          clearTimeout(connectTimeout);
          switchToPolling();
        });
      } catch (err) {
        console.warn('[useSocket] Could not initialize direct Socket.IO client, falling back to polling socket', err);
        switchToPolling();
      }
    }

    const active = globalSocket || globalPollingSocket;
    attachSocketListeners(active);
    setSocket(active as any);

    if (active.connected) {
      setIsConnected(true);
    }

    if (room?.code && playerId && globalPollingSocket.setContext) {
      if (globalSocket === globalPollingSocket) {
        globalPollingSocket.setContext(room.code, playerId);
      }
    }

    if (active === globalPollingSocket) {
      setTransportMode('polling');
    } else {
      setTransportMode('websocket');
    }

    // Periodic RTT latency probe
    const unsubLat = unoRealtime.onLatency((ms) => {
      if (globalSocket === globalPollingSocket) {
        setPing(ms);
        setTransportMode('polling');
      }
    });

    const pingInterval = setInterval(() => {
      if (globalSocket && globalSocket !== globalPollingSocket && globalSocket.connected) {
        const t0 = performance.now();
        globalSocket.emit('ping:check', Date.now(), () => {
          setPing(Math.max(1, Math.round(performance.now() - t0)));
          setTransportMode('websocket');
        });
      } else if (room?.settings.gameId === 'uno') {
        setTransportMode('polling');
      }
    }, 3000);

    return () => {
      unsubLat();
      clearInterval(pingInterval);
    };
  }, [room?.code, room?.settings.gameId, playerId]);

  return (globalSocket || globalPollingSocket) as any;
}
