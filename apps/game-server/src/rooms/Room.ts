import { 
  Player, 
  RoomInfo, 
  RoomSettings, 
  RoomStatus, 
  SERVER_TICK_RATE,
  DEFAULT_GAME_DURATION
} from '@gamehouse/shared';
import { Server as SocketIOServer } from 'socket.io';
import { GameModule } from '../core/GameModule';
import { GameRegistry } from '../games/GameRegistry';

export class Room {
  public readonly id: string;
  public readonly code: string;
  public settings: RoomSettings;
  public status: RoomStatus = 'lobby';
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public createdAt: number;

  private io: SocketIOServer;
  private gameInstance: GameModule | null = null;
  private gameLoopTimer: NodeJS.Timeout | null = null;
  private lastTickTime: number = 0;
  private onRoomEmptyCallback?: (roomId: string) => void;

  constructor(
    id: string,
    code: string,
    hostPlayer: Player,
    settings: RoomSettings,
    io: SocketIOServer,
    onEmpty?: (roomId: string) => void
  ) {
    this.id = id;
    this.code = code;
    this.hostId = hostPlayer.id;
    this.settings = {
      ...settings,
      durationSeconds: settings.durationSeconds || (DEFAULT_GAME_DURATION[settings.gameMode] || 180),
    };
    this.io = io;
    this.createdAt = Date.now();
    this.onRoomEmptyCallback = onEmpty;

    hostPlayer.isHost = true;
    hostPlayer.isReady = true; // Host is inherently ready
    this.players.set(hostPlayer.id, hostPlayer);
  }

  public getInfo(): RoomInfo {
    return {
      id: this.id,
      code: this.code,
      settings: { ...this.settings },
      status: this.status,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
      createdAt: this.createdAt,
    };
  }

  public addPlayer(player: Player): { success: boolean; error?: string } {
    if (this.status !== 'lobby') {
      return { success: false, error: 'Game is already in progress or finished.' };
    }

    if (this.players.size >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    // Check if player is rejoining
    const existing = this.players.get(player.id);
    if (existing) {
      existing.socketId = player.socketId;
      existing.isConnected = true;
      existing.nickname = player.nickname;
      existing.avatar = player.avatar;
      if (existing.id === this.hostId) {
        existing.isHost = true;
        existing.isReady = true;
      }
      return { success: true };
    }

    const isHostPlayer = this.hostId === player.id || this.players.size === 0;
    if (isHostPlayer) {
      this.hostId = player.id;
      player.isHost = true;
      player.isReady = true;
    } else {
      player.isHost = false;
      player.isReady = false;
    }
    player.isConnected = true;
    this.players.set(player.id, player);

    return { success: true };
  }

  public removePlayer(playerId: string): { newHostId?: string; wasHost: boolean; roomEmpty: boolean } {
    const player = this.players.get(playerId);
    if (!player) {
      return { wasHost: false, roomEmpty: this.players.size === 0 };
    }

    const wasHost = player.isHost;
    this.players.delete(playerId);

    if (this.gameInstance) {
      this.gameInstance.handlePlayerDisconnect(playerId);
    }

    let newHostId: string | undefined;

    // Check if room is empty
    if (this.players.size === 0) {
      this.cleanup();
      if (this.onRoomEmptyCallback) {
        this.onRoomEmptyCallback(this.id);
      }
      return { wasHost, roomEmpty: true };
    }

    // Host migration
    if (wasHost) {
      // Pick the next connected player, or oldest joined player
      const remainingPlayers = Array.from(this.players.values());
      const nextHost = remainingPlayers.find(p => p.isConnected) || remainingPlayers[0];
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        this.hostId = nextHost.id;
        newHostId = nextHost.id;
      }
    }

    return { newHostId, wasHost, roomEmpty: false };
  }

  public setPlayerReady(playerId: string, isReady: boolean): boolean {
    const player = this.players.get(playerId);
    if (!player || player.isHost) return false; // Host is always ready
    player.isReady = isReady;
    return true;
  }

  public updateSettings(newSettings: Partial<RoomSettings>, requesterPlayerId: string): boolean {
    if (requesterPlayerId !== this.hostId) return false;
    if (this.status !== 'lobby') return false;

    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    return true;
  }

  public kickPlayer(targetPlayerId: string, requesterPlayerId: string): boolean {
    if (requesterPlayerId !== this.hostId) return false;
    if (targetPlayerId === this.hostId) return false; // cannot kick self

    const target = this.players.get(targetPlayerId);
    if (!target) return false;

    this.removePlayer(targetPlayerId);
    return true;
  }

  public canStartGame(requesterPlayerId: string): { canStart: boolean; reason?: string } {
    const requester = this.players.get(requesterPlayerId);
    const isRequesterHost = requester?.isHost || this.hostId === requesterPlayerId;
    if (!isRequesterHost) {
      return { canStart: false, reason: 'Only the room host can start the game.' };
    }

    if (this.players.size < 2) {
      return { canStart: false, reason: 'At least 2 players are required to start.' };
    }

    if (this.settings.gameId === 'ludo' && this.players.size > 4) {
      return { canStart: false, reason: 'Ludo Party supports a maximum of 4 players.' };
    }

    const nonHostPlayers = Array.from(this.players.values()).filter(p => !p.isHost);
    const unreadyPlayers = nonHostPlayers.filter(p => !p.isReady);

    if (unreadyPlayers.length > 0) {
      return { 
        canStart: false, 
        reason: `Waiting for ${unreadyPlayers.map(p => p.nickname).join(', ')} to get ready.` 
      };
    }

    return { canStart: true };
  }

  public startGame(): boolean {
    const game = GameRegistry.create(this.settings.gameId);
    if (!game) {
      return false;
    }

    this.gameInstance = game;
    this.status = 'in-game';

    const playerList = Array.from(this.players.values());
    this.gameInstance.initialize(this.id, playerList, this.settings, this.io);
    this.gameInstance.start();

    // Start server authoritative game loop
    this.lastTickTime = Date.now();
    const intervalMs = Math.floor(1000 / SERVER_TICK_RATE);

    this.gameLoopTimer = setInterval(() => {
      this.tick();
    }, intervalMs);

    return true;
  }

  private tick(): void {
    if (!this.gameInstance) return;

    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    this.gameInstance.update(deltaTime);

    const currentState = this.gameInstance.getState();
    // Broadcast state to room
    this.io.to(this.id).emit('game:state', currentState);

    if (this.gameInstance.isFinished()) {
      this.status = 'finished';
      if (this.gameLoopTimer) {
        clearInterval(this.gameLoopTimer);
        this.gameLoopTimer = null;
      }
    }
  }

  public restartGame(requesterPlayerId: string): boolean {
    if (requesterPlayerId !== this.hostId) return false;

    // Reset game loop
    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }

    if (this.gameInstance) {
      this.gameInstance.cleanup();
      this.gameInstance = null;
    }

    this.status = 'lobby';

    // Reset ready states for players (except host)
    this.players.forEach(p => {
      p.isReady = p.isHost;
    });

    return true;
  }

  public getGameInstance(): GameModule | null {
    return this.gameInstance;
  }

  public cleanup(): void {
    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }
    if (this.gameInstance) {
      this.gameInstance.cleanup();
      this.gameInstance = null;
    }
    this.players.clear();
  }
}
