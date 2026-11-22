import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { 
  RoomInfo, 
  PanjatPinangGameState, 
  GameResultData, 
  Player, 
  SkillType,
  ClientToServerEvents,
  ServerToClientEvents,
  ImpostorPrivateRoleData,
  HiddenTeamPlayerPrivate
} from '@gamehouse/shared';
import { soundManager } from '../components/audio/SoundManager';

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface GameStoreState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  ping: number;
  playerId: string;
  room: RoomInfo | null;
  gameState: any | null;
  impostorRole: ImpostorPrivateRoleData | null;
  hiddenTeamPrivate: HiddenTeamPlayerPrivate | null;
  countdown: number | null;
  gameResults: GameResultData | null;
  toasts: ToastNotification[];

  // Actions
  setSocket: (socket: Socket<ServerToClientEvents, ClientToServerEvents> | null) => void;
  setIsConnected: (connected: boolean) => void;
  setPing: (ping: number) => void;
  setPlayerId: (id: string) => void;
  setRoom: (room: RoomInfo | null) => void;
  setGameState: (state: any) => void;
  setImpostorRole: (role: ImpostorPrivateRoleData | null) => void;
  setHiddenTeamPrivate: (state: HiddenTeamPlayerPrivate | null) => void;
  setCountdown: (count: number | null) => void;
  setGameResults: (results: GameResultData | null) => void;
  addToast: (message: string, type?: ToastNotification['type']) => void;
  removeToast: (id: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  let storedPlayerId = '';
  if (typeof window !== 'undefined') {
    try {
      storedPlayerId = sessionStorage.getItem('gh_player_id') || '';
      if (!storedPlayerId) {
        storedPlayerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('gh_player_id', storedPlayerId);
      }
    } catch {
      storedPlayerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
  } else {
    storedPlayerId = `p_${Date.now()}`;
  }

  return {
    socket: null,
    isConnected: false,
    ping: 0,
    playerId: storedPlayerId,
    room: null,
    gameState: null,
    impostorRole: null,
    hiddenTeamPrivate: null,
    countdown: null,
    gameResults: null,
    toasts: [],

    setSocket: (socket) => set({ socket }),
    setIsConnected: (isConnected) => set({ isConnected }),
    setPing: (ping) => set({ ping }),
    setPlayerId: (playerId) => {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('gh_player_id', playerId);
        } catch {}
      }
      set({ playerId });
    },
    setRoom: (room) => set({ room }),
    setGameState: (gameState) => set({ gameState }),
    setImpostorRole: (impostorRole) => set({ impostorRole }),
    setHiddenTeamPrivate: (hiddenTeamPrivate) => set({ hiddenTeamPrivate }),
    setCountdown: (countdown) => {
      if (countdown !== null) {
        soundManager.playCountdown(countdown);
      }
      set({ countdown });
    },
    setGameResults: (gameResults) => {
      if (gameResults) {
        soundManager.playVictory();
        if (typeof window !== 'undefined') {
          import('canvas-confetti').then((mod) => {
            const confetti = mod.default || mod;
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#EF4444', '#FFFFFF', '#F97316', '#8B5CF6', '#F59E0B']
            });
          }).catch(() => {});
        }
      }
      set({ gameResults });
    },
    addToast: (message, type = 'info') => {
      const id = `${Date.now()}_${Math.random()}`;
      set((state) => ({
        // Keep at most 2 active toasts so they never clutter mobile screens
        toasts: [...state.toasts.slice(-1), { id, message, type }]
      }));
      setTimeout(() => {
        get().removeToast(id);
      }, 2800);
    },
    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    },
    resetGame: () => set({
      gameState: null,
      impostorRole: null,
      hiddenTeamPrivate: null,
      countdown: null,
      gameResults: null
    }),
  };
});
