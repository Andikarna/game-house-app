import { RoomInfo, PanjatPinangGameState, LudoGameState, GameResultData, Player } from '../shared';
import { unoRealtime, UnoSyncPayload } from './uno-realtime';

type EventHandler = (...args: any[]) => void;

class PollingSocket {
  public connected: boolean = true;
  public id: string = '';
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private pollTimer: any = null;
  private isPollingActive: boolean = false;
  private isCurrentlyFetching: boolean = false;
  private abortController: AbortController | null = null;
  private currentRoomCode: string | null = null;
  private currentPlayerId: string | null = null;
  private lastGameStateStr: string = '';
  private lastGameStateVersion: number = 0;
  private lastDbUpdatedAt: number = 0;
  private lastPlayerCount: number = 0;
  private lastChatTs: number = 0;
  private lastEmoteTs: number = 0;
  private isMyTurnActive: boolean = false;
  private isBotTurnActive: boolean = false;
  private isUnoRoom: boolean = false;
  private cachedUnoHand: any[] = [];
  private unoSyncUnsub: (() => void) | null = null;
  private lastRoomStateStr: string = '';
  private lastVoteKickStr: string = '';
  private inFlightActionCount: number = 0;
  private minExpectedVersion: number = 0;
  private processedEmoteIds: Set<string> = new Set();
  private processedChatIds: Set<string> = new Set();

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
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.currentRoomCode = data.room.code;
          this.currentPlayerId = data.playerId;
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.lastPlayerCount = data.room.players.length;
          if (data.u) {
            this.lastDbUpdatedAt = Number(data.u);
          }
          if (this.isUnoRoom) {
            this.attachUnoRealtime(data.room.code);
            unoRealtime.broadcast({ type: 'room', room: data.room, senderId: data.playerId });
          }
          this.startPolling(data.room.code, data.playerId);
          callback?.({ success: true, room: data.room, playerId: data.playerId });
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
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.currentRoomCode = data.room.code;
          this.currentPlayerId = data.playerId;
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.lastPlayerCount = data.room.players.length;
          if (data.u) {
            this.lastDbUpdatedAt = Number(data.u);
          }
          if (this.isUnoRoom) {
            this.attachUnoRealtime(data.room.code);
            unoRealtime.broadcast({ type: 'room', room: data.room, senderId: data.playerId });
          }
          this.startPolling(data.room.code, data.playerId);
          callback?.({ success: true, room: data.room, playerId: data.playerId });
        } else {
          callback?.({ success: false, error: data.error || 'Failed to join room' });
        }
        return;
      }

      // Determine active context
      let roomCode = this.currentRoomCode || payload?.roomCode || payload?.code;
      let playerId = this.currentPlayerId || payload?.playerId;

      if (typeof window !== 'undefined' && (!roomCode || !playerId)) {
        try {
          const store = (window as any).__gh_game_store || require('../stores/useGameStore').useGameStore?.getState?.();
          if (!roomCode && store?.room?.code) roomCode = store.room.code;
          if (!playerId && store?.playerId) playerId = store.playerId;
        } catch {}
      }

      if (!roomCode) return;

      // 3. READY
      if (event === 'room:ready') {
        const isReady = typeof payload === 'boolean' ? payload : (payload?.isReady ?? true);
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ready', playerId, isReady }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      // 3b. UPDATE AVATAR
      if (event === 'room:update-avatar' || event === 'player:update-avatar') {
        const avatar = typeof payload === 'string' ? payload : (payload?.avatar || 'budi');
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_avatar', playerId, avatar }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      // 3c. UPDATE SETTINGS
      if (event === 'room:update-settings') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_settings', playerId, ...payload }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      // 3d. KICK PLAYER
      if (event === 'room:kick-player') {
        const targetId = typeof payload === 'string' ? payload : payload?.targetId;
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'kick', playerId, targetId }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      // 3e. BOT MANAGEMENT
      if (event === 'room:add-bot') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_bot', playerId }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      if (event === 'room:fill-bots') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fill_bots', playerId }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      if (event === 'room:remove-bot') {
        const botId = typeof payload === 'string' ? payload : payload?.botId;
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remove_bot', playerId, botId }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      if (event === 'room:clear-bots') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear_bots', playerId }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          this.isUnoRoom = data.room.settings?.gameId === 'uno';
          this.lastRoomStateStr = JSON.stringify(data.room);
          this.emitInternal('room:updated', data.room);
          if (this.isUnoRoom) unoRealtime.broadcast({ type: 'room', room: data.room, senderId: playerId });
        }
        return;
      }

      // 4. START GAME (Both 'room:start' and 'game:start')
      if (event === 'room:start' || event === 'game:start') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', playerId }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          this.lastGameStateVersion = data.gameState.stateVersion || 1;
          this.lastGameStateStr = JSON.stringify(data.gameState);
          if (Array.isArray(data.gameState.myHand)) {
            this.cachedUnoHand = data.gameState.myHand;
          }
          if (data.room) {
            this.isUnoRoom = data.room.settings?.gameId === 'uno';
            this.emitInternal('room:updated', data.room);
          }
          this.emitInternal('game:countdown', 0);
          this.emitInternal('game:start', data.gameState);
          this.emitInternal('game:started', data.gameState);
          this.emitInternal('game:state', data.gameState);
          this.emitInternal('game:ludo_state', data.gameState);
          if (data.gameState.gameId === 'snake-ladder') {
            this.emitInternal('game:snake_state', data.gameState);
          } else if (data.gameState.gameId === 'uno') {
            this.emitInternal('game:uno_state', data.gameState);
            this.attachUnoRealtime(roomCode);
            const { myHand, playableCardIds, ...sanitizedPublic } = data.gameState;
            unoRealtime.broadcast({
              type: 'state',
              room: data.room,
              publicState: sanitizedPublic,
              stateVersion: data.gameState.stateVersion,
              senderId: playerId,
            });
          }
          await this.pollOnce(true);
        }
        return;
      }

      // 5. LUDO ACTION OR GENERIC GAME INPUT
      if (event === 'game:ludo_action') {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ludo_action', playerId, ...payload }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          if (data.gameState.stateVersion) {
            this.lastGameStateVersion = data.gameState.stateVersion;
          }
          if (data.u) {
            this.lastDbUpdatedAt = Number(data.u);
          }
          this.isMyTurnActive = data.gameState.currentTurnPlayerId === this.currentPlayerId;
          this.lastGameStateStr = JSON.stringify(data.gameState);
          this.emitInternal('game:ludo_state', data.gameState);
          if (data.results) {
            this.emitInternal('game:finished', data.results);
          }
        }
        return;
      }

      // 6. GAME INPUT (Ludo / Snake-Ladder / UNO / Panjat Pinang)
      if (event === 'game:input') {
        const isLudoAction = payload?.action === 'roll-dice' || payload?.action === 'move-token' || payload?.action === 'pass-turn';
        const isUnoAction =
          payload?.action === 'play-card' ||
          payload?.action === 'draw-card' ||
          payload?.action === 'call-uno' ||
          payload?.action === 'catch-uno' ||
          payload?.action === 'pass-turn';
        const isTurnGame = isLudoAction || isUnoAction;
        const actionName = 'input';
        this.inFlightActionCount++;
        if (isTurnGame && this.lastGameStateVersion > 0) {
          this.minExpectedVersion = Math.max(this.minExpectedVersion, this.lastGameStateVersion + 1);
        }

        const sendInput = async () => {
          const res = await fetch(`/api/rooms/${roomCode}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: actionName, playerId, ...payload }),
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        };

        try {
          let data: any = null;
          try {
            data = await sendInput();
          } catch {
            // Transient network / DB contention retry once
            await new Promise((r) => setTimeout(r, 180));
            data = await sendInput();
          }

          if (data?.success && data.gameState) {
            if (data.gameState.stateVersion) {
              this.lastGameStateVersion = data.gameState.stateVersion;
              this.minExpectedVersion = Math.max(this.minExpectedVersion, data.gameState.stateVersion);
            }
            if (data.u) {
              this.lastDbUpdatedAt = Number(data.u);
            }
            this.isMyTurnActive = data.gameState.currentTurnPlayerId === this.currentPlayerId;
            this.isBotTurnActive = Boolean(data.gameState.players?.[data.gameState.currentTurnPlayerId]?.isBot);
            this.lastGameStateStr = JSON.stringify(data.gameState);
            if (Array.isArray(data.gameState.myHand)) {
              this.cachedUnoHand = data.gameState.myHand;
            }
            if (data.gameState.gameId === 'ludo') {
              this.emitInternal('game:ludo_state', data.gameState);
            } else if (data.gameState.gameId === 'snake-ladder') {
              this.emitInternal('game:snake_state', data.gameState);
              this.emitInternal('game:state', data.gameState);
            } else if (data.gameState.gameId === 'uno') {
              this.emitInternal('game:uno_state', data.gameState);
              this.emitInternal('game:state', data.gameState);
              const { myHand, playableCardIds, ...sanitizedPublic } = data.gameState;
              unoRealtime.broadcast({
                type: 'state',
                publicState: sanitizedPublic,
                results: data.results || null,
                stateVersion: data.gameState.stateVersion,
                senderId: playerId,
              });
            } else {
              this.emitInternal('game:state', data.gameState);
            }
            if (data.results) {
              this.emitInternal('game:finished', data.results);
            }
          }
        } catch (actionErr) {
          console.error('[PollingSocket game:input error]:', actionErr);
          this.minExpectedVersion = 0;
          await this.pollOnce(true);
        } finally {
          this.inFlightActionCount = Math.max(0, this.inFlightActionCount - 1);
        }
        return;
      }

      // 7. SKILL ACTIVATION
      if (event === 'player:skill') {
        const skill = typeof payload === 'string' ? payload : payload?.skill;
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'skill', playerId, skill }),
        });
        const data = await res.json();
        if (data.success && data.gameState) {
          this.emitInternal('game:state', data.gameState);
        }
        return;
      }

      // 8. EMOTE
      if (event === 'emote:send' || event === 'game:emote') {
        const emoteId = payload?.emoteId || payload;
        if (this.isUnoRoom) {
          unoRealtime.broadcast({
            type: 'emote',
            emote: {
              id: `emote_rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              playerId,
              nickname: 'Player',
              emoteId,
              timestamp: Date.now(),
            },
            senderId: playerId,
          });
        }
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'emote', playerId, emoteId }),
        });
        return;
      }

      // 8b. CHAT
      if (event === 'game:chat') {
        const message = payload?.message || '';
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', playerId, message }),
        });
        const data = await res.json();
        if (data.success && data.chatMessage) {
          this.processedChatIds.add(data.chatMessage.id);
          this.emitInternal('game:chat-message', data.chatMessage);
          if (this.isUnoRoom) {
            unoRealtime.broadcast({ type: 'chat', chatMessage: data.chatMessage, senderId: playerId });
          }
        }
        return;
      }

      // 8c. VOTE KICK START
      if (event === 'game:vote-kick-start') {
        const targetPlayerId = payload?.targetPlayerId;
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vote_kick_start', playerId, targetPlayerId }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.voteKick) {
            this.lastVoteKickStr = JSON.stringify(data.voteKick);
            this.emitInternal('game:vote-kick-started', data.voteKick);
          }
          await this.pollOnce(true);
        } else if (data.error) {
          this.emitInternal('error:message', data.error);
        }
        return;
      }

      // 8d. VOTE KICK VOTE
      if (event === 'game:vote-kick-vote') {
        const vote = payload?.vote;
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vote_kick_vote', playerId, vote }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.voteKick) {
            this.lastVoteKickStr = JSON.stringify(data.voteKick);
            this.emitInternal('game:vote-kick-updated', {
              targetPlayerId: data.voteKick.targetPlayerId,
              yesCount: data.voteKick.yesCount,
              noCount: data.voteKick.noCount,
              requiredVotes: data.voteKick.requiredVotes,
            });
          }
          await this.pollOnce(true);
        }
        return;
      }

      // 9. RESTART GAME
      if (event === 'game:restart') {
        this.lastGameStateVersion = 0;
        this.lastGameStateStr = '';
        this.lastDbUpdatedAt = 0;
        this.lastChatTs = 0;
        this.isMyTurnActive = false;
        this.isBotTurnActive = false;
        this.cachedUnoHand = [];
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restart', playerId }),
        });
        if (this.isUnoRoom) {
          unoRealtime.broadcast({ type: 'restart', senderId: playerId });
        }
        await this.pollOnce(true);
        return;
      }

      // 10. LEAVE
      if (event === 'room:leave') {
        await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', playerId }),
          keepalive: true,
        });
        this.stopPolling(true);
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

  private computeLocalUnoPlayables(pubState: any): string[] {
    if (!pubState || pubState.status === 'finished') return [];
    if (pubState.currentTurnPlayerId !== this.currentPlayerId) return [];
    const hand = this.cachedUnoHand || [];
    if (pubState.drawnPlayableCardId) {
      return hand.some((c: any) => c.id === pubState.drawnPlayableCardId)
        ? [pubState.drawnPlayableCardId]
        : [];
    }
    if ((pubState.pendingDrawCount || 0) > 0) {
      return hand
        .filter((c: any) =>
          pubState.pendingDrawType === 'draw2'
            ? c.value === 'draw2' || c.value === 'wild_draw4'
            : c.value === 'wild_draw4'
        )
        .map((c: any) => c.id);
    }
    const topVal = pubState.topCard?.value;
    return hand
      .filter(
        (c: any) =>
          c.color === 'wild' || c.color === pubState.activeColor || c.value === topVal
      )
      .map((c: any) => c.id);
  }

  private unoStatusUnsub: (() => void) | null = null;

  private attachUnoRealtime(roomCode: string) {
    unoRealtime.connect(roomCode);
    if (!this.unoStatusUnsub) {
      this.unoStatusUnsub = unoRealtime.onStatus((connected) => {
        if (this.isUnoRoom) {
          this.emitInternal('transport:mode', connected ? 'supabase-realtime' : 'polling');
        }
      });
    }
    if (this.unoSyncUnsub) return;

    this.unoSyncUnsub = unoRealtime.onSync((sync: UnoSyncPayload) => {
      if (sync.senderId && sync.senderId === this.currentPlayerId) return;

      if (sync.type === 'room' && sync.room) {
        if (sync.ts && Number(sync.ts) > this.lastDbUpdatedAt) {
          this.lastDbUpdatedAt = Number(sync.ts);
        }
        this.lastPlayerCount = sync.room.players?.length || this.lastPlayerCount;
        this.lastRoomStateStr = JSON.stringify(sync.room);
        this.emitInternal('room:updated', sync.room);
      }

      if (sync.type === 'chat' && sync.chatMessage) {
        if (!this.processedChatIds.has(sync.chatMessage.id)) {
          this.processedChatIds.add(sync.chatMessage.id);
          this.emitInternal('game:chat-message', sync.chatMessage);
        }
        return;
      }

      if (sync.type === 'emote' && sync.emote) {
        if (!this.processedEmoteIds.has(sync.emote.id)) {
          this.processedEmoteIds.add(sync.emote.id);
          this.emitInternal('emote:received', sync.emote);
        }
        return;
      }

      if (sync.type === 'restart') {
        this.lastGameStateVersion = 0;
        this.lastGameStateStr = '';
        this.cachedUnoHand = [];
        this.pollOnce(true);
        return;
      }

      if (sync.type === 'pg_change') {
        if ((sync.stateVersion || 0) > this.lastGameStateVersion) {
          this.pollOnce(true);
        }
        return;
      }

      if (sync.type === 'state' && sync.publicState) {
        const incomingVersion = sync.publicState.stateVersion || 0;
        if (incomingVersion <= this.lastGameStateVersion) return;

        const myId = this.currentPlayerId || '';
        const myPub = sync.publicState.players?.[myId];
        const fxType = sync.publicState.lastFx?.type;
        const needsPrivateHandFetch =
          !myPub ||
          this.cachedUnoHand.length !== myPub.cardCount ||
          fxType === 'start' ||
          fxType === 'swap' ||
          fxType === 'rotate';

        this.lastGameStateVersion = incomingVersion;
        this.isMyTurnActive = sync.publicState.currentTurnPlayerId === myId;
        this.isBotTurnActive = Boolean(
          sync.publicState.players?.[sync.publicState.currentTurnPlayerId]?.isBot
        );

        const mergedState = {
          ...sync.publicState,
          myHand: this.cachedUnoHand,
          playableCardIds: this.computeLocalUnoPlayables(sync.publicState),
        };
        this.lastGameStateStr = JSON.stringify(mergedState);
        this.emitInternal('game:uno_state', mergedState);
        this.emitInternal('game:state', mergedState);

        if (sync.results) {
          this.emitInternal('game:finished', sync.results);
        }

        if (needsPrivateHandFetch) {
          this.pollOnce(true);
        }
      }
    });
  }

  public startPolling(roomCode: string, playerId: string) {
    if (this.currentRoomCode !== roomCode) {
      this.lastDbUpdatedAt = 0;
      this.lastGameStateVersion = 0;
      this.lastGameStateStr = '';
      this.lastRoomStateStr = '';
      this.lastPlayerCount = 0;
      this.lastChatTs = 0;
      this.lastEmoteTs = 0;
      this.isMyTurnActive = false;
      this.isBotTurnActive = false;
      this.cachedUnoHand = [];
    }
    this.currentRoomCode = roomCode;
    this.currentPlayerId = playerId;
    this.isPollingActive = true;
    this.stopPolling(false);

    // Initial immediate poll
    this.pollOnce();
  }

  public stopPolling(clearContext: boolean = false) {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    if (clearContext) {
      this.isPollingActive = false;
      this.currentRoomCode = null;
      this.currentPlayerId = null;
      this.isUnoRoom = false;
      this.cachedUnoHand = [];
      if (this.unoSyncUnsub) {
        this.unoSyncUnsub();
        this.unoSyncUnsub = null;
      }
      unoRealtime.disconnect();
    }
  }

  public async pollOnce(force: boolean = false) {
    if (!this.currentRoomCode) return;
    if (this.isCurrentlyFetching && !force) return;

    this.isCurrentlyFetching = true;
    try {
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          this.abortController?.abort();
        } catch {}
      }, 5000);

      const params = new URLSearchParams();
      if (this.currentPlayerId) params.set('playerId', this.currentPlayerId);
      if (this.lastDbUpdatedAt > 0) params.set('u', String(this.lastDbUpdatedAt));
      if (this.lastGameStateVersion > 0) params.set('v', String(this.lastGameStateVersion));
      if (this.lastPlayerCount > 0) params.set('pc', String(this.lastPlayerCount));
      if (this.lastChatTs > 0) params.set('cs', String(this.lastChatTs));
      if (this.lastEmoteTs > 0) params.set('es', String(this.lastEmoteTs));
      if (this.lastVoteKickStr) params.set('vk', '1');

      const url = `/api/rooms/${this.currentRoomCode}?${params.toString()}`;
      const res = await fetch(url, {
        signal: this.abortController.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (!res.ok) return;

      const data = await res.json();
      if (!data.success) return;
      if (data.unchanged) {
        if (data.u) this.lastDbUpdatedAt = Number(data.u);
        return;
      }
      if (!data.room) return;

      if (data.u) {
        this.lastDbUpdatedAt = Number(data.u);
      }

      const room: RoomInfo = data.room;
      if (!Array.isArray(room.players) || room.players.length === 0) {
        return;
      }
      this.isUnoRoom = room.settings?.gameId === 'uno';
      if (this.isUnoRoom) {
        this.attachUnoRealtime(room.code);
      }
      const incomingDbUpdatedAt = Number(data.u || 0);
      const isStaleLobbySnapshot =
        room.status === 'lobby' &&
        incomingDbUpdatedAt > 0 &&
        this.lastDbUpdatedAt > 0 &&
        incomingDbUpdatedAt < this.lastDbUpdatedAt;

      if (!isStaleLobbySnapshot) {
        if (incomingDbUpdatedAt > this.lastDbUpdatedAt) {
          this.lastDbUpdatedAt = incomingDbUpdatedAt;
        }
        this.lastPlayerCount = room.players.length;
        const roomStr = JSON.stringify(room);
        if (roomStr !== this.lastRoomStateStr) {
          this.lastRoomStateStr = roomStr;
          if (room.status === 'lobby') {
            this.lastGameStateVersion = 0;
            this.minExpectedVersion = 0;
            this.lastGameStateStr = '';
            this.isMyTurnActive = false;
            this.isBotTurnActive = false;
            this.cachedUnoHand = [];
          }
          this.emitInternal('room:updated', room);
        }
      }

      // Handle Game State
      if (data.gameState) {
        const incomingVersion = data.gameState.stateVersion || 0;
        const blockedByOptimistic = this.inFlightActionCount > 0 || (this.minExpectedVersion > 0 && incomingVersion > 0 && incomingVersion < this.minExpectedVersion);
        const isStale = blockedByOptimistic || (incomingVersion > 0 && incomingVersion < this.lastGameStateVersion);
        if (!isStale) {
          if (incomingVersion > 0) {
            this.lastGameStateVersion = incomingVersion;
            if (incomingVersion >= this.minExpectedVersion) {
              this.minExpectedVersion = 0;
            }
          }
          this.isMyTurnActive = data.gameState.currentTurnPlayerId === this.currentPlayerId;
          this.isBotTurnActive = Boolean(data.gameState.players?.[data.gameState.currentTurnPlayerId]?.isBot);
          if (Array.isArray(data.gameState.myHand)) {
            this.cachedUnoHand = data.gameState.myHand;
          }
          const gameStr = JSON.stringify(data.gameState);
          if (gameStr !== this.lastGameStateStr) {
            this.lastGameStateStr = gameStr;
            if (room.settings.gameId === 'ludo') {
              this.emitInternal('game:ludo_state', data.gameState);
            } else if (room.settings.gameId === 'snake-ladder') {
              this.emitInternal('game:snake_state', data.gameState);
              this.emitInternal('game:state', data.gameState);
            } else if (room.settings.gameId === 'uno') {
              this.emitInternal('game:uno_state', data.gameState);
              this.emitInternal('game:state', data.gameState);
            } else {
              this.emitInternal('game:state', data.gameState);
            }
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
          const ts = Number(em.timestamp) || 0;
          if (ts > this.lastEmoteTs) this.lastEmoteTs = ts;
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

      // Handle Vote Kick
      const currentVoteKickStr = data.voteKick ? JSON.stringify(data.voteKick) : '';
      if (currentVoteKickStr !== this.lastVoteKickStr) {
        if (data.voteKick) {
          if (!this.lastVoteKickStr) {
            this.emitInternal('game:vote-kick-started', data.voteKick);
          } else {
            this.emitInternal('game:vote-kick-updated', {
              targetPlayerId: data.voteKick.targetPlayerId,
              yesCount: data.voteKick.yesCount,
              noCount: data.voteKick.noCount,
              requiredVotes: data.voteKick.requiredVotes,
            });
          }
        } else if (this.lastVoteKickStr) {
          this.emitInternal('game:vote-kick-ended', {
            targetPlayerId: '',
            targetNickname: '',
            kicked: false,
            reason: 'Vote kick telah berakhir.',
          });
        }
        this.lastVoteKickStr = currentVoteKickStr;
      }

      // Handle Chats
      if (Array.isArray(data.chats)) {
        data.chats.forEach((chat: any) => {
          const ts = Number(chat.timestamp) || 0;
          if (ts > this.lastChatTs) this.lastChatTs = ts;
          if (!this.processedChatIds.has(chat.id)) {
            this.processedChatIds.add(chat.id);
            this.emitInternal('game:chat-message', chat);
          }
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('[PollingSocket pollOnce error]:', e);
      }
    } finally {
      this.isCurrentlyFetching = false;
      // Adaptive polling: if UNO Supabase Realtime WebSocket is live, relax human-turn safety polls; keep fast bot cadence
      if (this.isPollingActive && this.currentRoomCode) {
        if (this.pollTimer) clearTimeout(this.pollTimer);
        const isGameActive = this.lastRoomStateStr.includes('"in-game"') || this.lastRoomStateStr.includes('"countdown"');
        let delay = !isGameActive ? 1100 : this.isMyTurnActive ? 600 : 300;
        if (this.isUnoRoom && unoRealtime.connected) {
          delay = !isGameActive ? 1800 : this.isBotTurnActive ? 550 : 2000;
        }
        this.pollTimer = setTimeout(() => {
          this.pollOnce();
        }, delay);
      }
    }
  }
}

export const globalPollingSocket = new PollingSocket();
