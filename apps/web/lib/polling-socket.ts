import { RoomInfo, PanjatPinangGameState, LudoGameState, GameResultData, Player } from '../shared';

type EventHandler = (...args: any[]) => void;

class PollingSocket {
  public connected: boolean = true;
  public id: string = '';
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private pollInterval: any = null;
  private currentRoomCode: string | null = null;
  private currentPlayerId: string | null = null;
  private lastGameStateStr: string = '';
  private lastRoomStateStr: string = '';
  private processedEmoteIds: Set<string> = new Set();

  constructor() {
    this.id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // Dispatch connect event after initial tick
    setTimeout(() => {
      this.emitInternal('connect');
    }, 100);
  }

  public on(event: string, handler: EventHandler): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return this;
  }

  public off(event: string, handler?: EventHandler): this {
    if (!handler) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(handler);
    }
    return this;
  }

  private emitInternal(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`Error in socket event listener [${event}]:`, e);
        }
      });
    }
  }

  public emit(event: string, ...args: any[]): this {
    // Separate callback if passed as the last argument
    let callback: ((res: any) => void) | null = null;
    let payload = args[0];

    if (typeof args[args.length - 1] === 'function') {
      callback = args[args.length - 1];
      if (args.length === 2) {
        payload = args[0];
      }
    }

    this.handleClientEmit(event, payload, callback);
    return this;
  }

  private async handleClientEmit(event: string, payload: any, callback: ((res: any) => void) | null) {
    try {
      // 1. CREATE ROOM
      if (event === 'room:create') {
        const res = await fetch('/api/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.currentRoomCode = data.room.code;
          this.currentPlayerId = data.playerId;
          this.startPolling(data.room.code, data.playerId);
          callback?.({ success: true, room: data.room });
        } else {
          callback?.({ success: false, error: data.error || 'Failed to create room' });
        }
        return;
      }

      // 2. JOIN ROOM
      if (event === 'room:join') {
        const res = await fetch('/api/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.currentRoomCode = data.room.code;
          this.currentPlayerId = data.playerId;
          this.startPolling(data.room.code, data.playerId);
          callback?.({ success: true, room: data.room });
        } else {
          callback?.({ success: false, error: data.error || 'Failed to join room' });
        }
        return;
      }

      // If we don't have a room code yet, check payload
      const roomCode = this.currentRoomCode || payload?.roomCode || payload?.code;
      const playerId = this.currentPlayerId || payload?.playerId;

      if (!roomCode) return;

      // 3. READY
      if (event === 'room:ready') {
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ready', playerId, isReady: payload?.isReady }),
        });
        this.pollOnce();
        return;
      }

      // 4. START
      if (event === 'room:start') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', playerId }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          this.emitInternal('game:start', data.gameState);
        }
        this.pollOnce();
        return;
      }

      // 5. LUDO ACTION
      if (event === 'game:ludo_action') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ludo_action', playerId, ...payload }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          this.emitInternal('game:ludo_state', data.gameState);
          if (data.results) {
            this.emitInternal('game:finished', data.results);
          }
        }
        return;
      }

      // 6. PANJAT PINANG INPUT
      if (event === 'game:input') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'input', playerId, ...payload }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          this.emitInternal('game:state', data.gameState);
        }
        return;
      }

      // 7. EMOTE
      if (event === 'emote:send') {
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'emote', playerId, emoteId: payload?.emoteId }),
        });
        return;
      }

      // 8. LEAVE
      if (event === 'room:leave') {
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', playerId }),
        });
        this.stopPolling();
        return;
      }
    } catch (err) {
      console.error('[PollingSocket emit error]:', err);
    }
  }

  public setContext(roomCode: string, playerId: string) {
    this.currentRoomCode = roomCode;
    this.currentPlayerId = playerId;
    this.startPolling(roomCode, playerId);
  }

  public startPolling(roomCode: string, playerId: string) {
    this.currentRoomCode = roomCode;
    this.currentPlayerId = playerId;
    this.stopPolling();

    this.pollOnce();
    this.pollInterval = setInterval(() => {
      this.pollOnce();
    }, 1000); // 1-second interval for smooth updates & friendly DB quota
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public async pollOnce() {
    if (!this.currentRoomCode) return;
    try {
      const url = `/api/rooms/${this.currentRoomCode}${this.currentPlayerId ? `?playerId=${this.currentPlayerId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !data.room) return;

      const room: RoomInfo = data.room;
      const roomStr = JSON.stringify(room);
      if (roomStr !== this.lastRoomStateStr) {
        this.lastRoomStateStr = roomStr;
        this.emitInternal('room:updated', room);
      }

      // Handle Game State
      if (data.gameState) {
        const gameStr = JSON.stringify(data.gameState);
        if (gameStr !== this.lastGameStateStr) {
          this.lastGameStateStr = gameStr;
          if (room.settings.gameId === 'ludo') {
            this.emitInternal('game:ludo_state', data.gameState);
          } else {
            this.emitInternal('game:state', data.gameState);
          }
        }
      }

      // Handle Game Finished
      if (data.gameResults) {
        this.emitInternal('game:finished', data.gameResults);
      }

      // Handle Emotes
      if (Array.isArray(data.emotes)) {
        data.emotes.forEach((em: any) => {
          if (!this.processedEmoteIds.has(em.id)) {
            this.processedEmoteIds.add(em.id);
            this.emitInternal('emote:received', {
              id: em.id,
              playerId: em.playerId,
              nickname: em.nickname,
              emoteId: em.emoteId,
              timestamp: em.timestamp,
            });
          }
        });
      }
    } catch (e) {
      console.error('[PollingSocket pollOnce error]:', e);
    }
  }
}

export const globalPollingSocket = new PollingSocket();
