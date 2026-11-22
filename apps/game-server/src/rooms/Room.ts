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

    const maxCapacity = this.settings.gameId === 'impostor-desa' ? 6 : this.settings.maxPlayers;
    if (this.players.size >= maxCapacity) {
      // Check if there is an automated bot that can be replaced by the incoming human player
      const botPlayer = Array.from(this.players.values()).find(p => p.isBot);
      if (botPlayer) {
        this.players.delete(botPlayer.id);
      } else {
        return { 
          success: false, 
          error: this.settings.gameId === 'impostor-desa' 
            ? 'Room sudah penuh (maksimal 6 pemain untuk Impostor Desa).' 
            : 'Room is full.' 
        };
      }
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

  public addBot(): { success: boolean; bot?: Player; error?: string } {
    if (this.status !== 'lobby') {
      return { success: false, error: 'Cannot add bot while game is in progress.' };
    }

    const maxAllowed = this.settings.gameId === 'impostor-desa' ? 6 : this.settings.maxPlayers;
    if (this.players.size >= maxAllowed) {
      return { success: false, error: `Room sudah penuh (maksimal ${maxAllowed} pemain).` };
    }

    const BOT_PRESETS: Array<{ nickname: string; avatar: any }> = [
      { nickname: 'Bot Joko', avatar: 'joko' },
      { nickname: 'Bot Siti', avatar: 'siti' },
      { nickname: 'Bot Andi', avatar: 'climber-yellow' },
      { nickname: 'Bot Rina', avatar: 'rina' },
      { nickname: 'Bot Budi', avatar: 'budi' },
      { nickname: 'Bot Ujang', avatar: 'climber-green' },
    ];

    const currentNicknames = new Set(Array.from(this.players.values()).map(p => p.nickname));
    const availablePreset = BOT_PRESETS.find(p => !currentNicknames.has(p.nickname));
    const botNum = this.players.size + 1;
    const nickname = availablePreset?.nickname || `Bot Warga ${botNum}`;
    const avatar = availablePreset?.avatar || 'joko';

    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const botPlayer: Player = {
      id: botId,
      socketId: `socket_${botId}`,
      nickname,
      avatar,
      isHost: false,
      isReady: true,
      isConnected: true,
      joinedAt: Date.now(),
      isBot: true,
    };

    this.players.set(botId, botPlayer);
    return { success: true, bot: botPlayer };
  }

  public removeBot(botId?: string): { success: boolean; error?: string } {
    if (this.status !== 'lobby') {
      return { success: false, error: 'Cannot remove bot while game is in progress.' };
    }

    let targetId = botId;
    if (!targetId) {
      const allBots = Array.from(this.players.values()).filter(p => p.isBot);
      if (allBots.length === 0) {
        return { success: false, error: 'Tidak ada bot di room.' };
      }
      targetId = allBots[allBots.length - 1].id;
    }

    const player = this.players.get(targetId);
    if (!player || !player.isBot) {
      return { success: false, error: 'Bot tidak ditemukan.' };
    }

    this.players.delete(targetId);
    return { success: true };
  }

  public fillBots(targetCount?: number): { added: number } {
    if (this.status !== 'lobby') return { added: 0 };
    const minTarget = this.settings.gameId === 'impostor-desa' ? 4 : 2;
    const maxTarget = this.settings.gameId === 'impostor-desa' ? 6 : this.settings.maxPlayers;
    const desired = Math.min(Math.max(targetCount || minTarget, minTarget), maxTarget);

    let addedCount = 0;
    while (this.players.size < desired) {
      const res = this.addBot();
      if (!res.success) break;
      addedCount++;
    }
    return { added: addedCount };
  }

  public clearBots(): { removed: number } {
    if (this.status !== 'lobby') return { removed: 0 };
    let removedCount = 0;
    const botIds: string[] = [];
    this.players.forEach((p, id) => {
      if (p.isBot) botIds.push(id);
    });
    botIds.forEach(id => {
      this.players.delete(id);
      removedCount++;
    });
    return { removed: removedCount };
  }

  public canStartGame(requesterPlayerId: string): { canStart: boolean; reason?: string } {
    const requester = this.players.get(requesterPlayerId);
    const isRequesterHost = requester?.isHost || this.hostId === requesterPlayerId;
    if (!isRequesterHost) {
      return { canStart: false, reason: 'Only the room host can start the game.' };
    }

    if (this.settings.gameId === 'impostor-desa') {
      if (this.players.size < 4) {
        return { canStart: false, reason: 'Impostor Desa membutuhkan minimal 4 pemain untuk memulai.' };
      }
      if (this.players.size > 6) {
        return { canStart: false, reason: 'Impostor Desa mendukung maksimal 6 pemain.' };
      }
    } else if (this.players.size < 2) {
      return { canStart: false, reason: 'At least 2 players are required to start.' };
    }

    if (this.settings.gameId === 'ludo' && this.players.size > 4) {
      return { canStart: false, reason: 'Ludo Party supports a maximum of 4 players.' };
    }

    const nonHostPlayers = Array.from(this.players.values()).filter(p => !p.isHost && !p.isBot);
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

      // Sync cumulative player scores from game instance to room players
      const finalState = currentState as any;
      if (finalState && finalState.players) {
        Object.values(finalState.players).forEach((p: any) => {
          const roomPlayer = this.players.get(p.id);
          if (roomPlayer && typeof p.score === 'number') {
            roomPlayer.score = p.score;
          }
        });
        this.io.to(this.id).emit('room:updated', this.getInfo());
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

    // Reset ready states for players (except host and bots)
    this.players.forEach(p => {
      p.isReady = p.isHost || Boolean(p.isBot);
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
