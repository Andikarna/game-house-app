import { 
  Player, 
  RoomInfo, 
  RoomSettings, 
  RoomStatus, 
  SERVER_TICK_RATE,
  DEFAULT_GAME_DURATION,
  ChatMessage,
  VoteKickState
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
  private activeVoteKick: {
    targetPlayerId: string;
    targetNickname: string;
    initiatedByPlayerId: string;
    initiatedByNickname: string;
    votes: Map<string, 'yes' | 'no'>;
    requiredVotes: number;
    expiresAt: number;
    timeout?: NodeJS.Timeout;
  } | null = null;

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

  public getGameState(): any {
    return this.gameInstance?.getState() || null;
  }

  public addPlayer(player: Player): { success: boolean; error?: string } {
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

    if (this.status !== 'lobby') {
      return { success: false, error: 'Game is already in progress or finished.' };
    }

    const isSixPlayerGame = this.settings.gameId === 'impostor-desa' || this.settings.gameId === 'hidden-team';
    const maxCapacity = isSixPlayerGame ? 6 : this.settings.maxPlayers;
    if (this.players.size >= maxCapacity) {
      // Check if there is an automated bot that can be replaced by the incoming human player
      const botPlayer = Array.from(this.players.values()).find(p => p.isBot);
      if (botPlayer) {
        this.players.delete(botPlayer.id);
      } else {
        return { 
          success: false, 
          error: isSixPlayerGame 
            ? `Room sudah penuh (maksimal 6 pemain untuk ${this.settings.gameId === 'hidden-team' ? 'Hidden Team' : 'Impostor Desa'}).` 
            : 'Room is full.' 
        };
      }
    }

    // Deduplicate nickname if another player in room already has it
    let finalNickname = player.nickname;
    let suffix = 2;
    const existingNicknames = Array.from(this.players.values())
      .filter(p => p.id !== player.id)
      .map(p => p.nickname.toLowerCase());
    while (existingNicknames.includes(finalNickname.toLowerCase())) {
      finalNickname = `${player.nickname} (${suffix})`;
      suffix++;
    }
    player.nickname = finalNickname;

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

    if (this.activeVoteKick) {
      if (this.activeVoteKick.targetPlayerId === playerId) {
        this.endVoteKick(false, 'Target vote kick keluar dari room.');
      } else if (this.players.size <= 2) {
        this.endVoteKick(false, 'Vote kick dibatalkan karena jumlah pemain tersisa <= 2.');
      }
    }

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

    const isSixPlayerGame = this.settings.gameId === 'impostor-desa' || this.settings.gameId === 'hidden-team';
    const maxAllowed = isSixPlayerGame ? 6 : this.settings.maxPlayers;
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
    const minTarget = this.settings.gameId === 'hidden-team' ? 6 : (this.settings.gameId === 'impostor-desa' ? 4 : 2);
    const maxTarget = (this.settings.gameId === 'impostor-desa' || this.settings.gameId === 'hidden-team') ? 6 : this.settings.maxPlayers;
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

    if (this.settings.gameId === 'hidden-team') {
      if (this.players.size !== 6) {
        return {
          canStart: false,
          reason: `Hidden Team: Secret Role membutuhkan tepat 6 pemain (saat ini ${this.players.size}/6). Host dapat menambahkan bot latihan.`
        };
      }
    } else if (this.settings.gameId === 'impostor-desa') {
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

  public handleChat(playerId: string, rawMessage: string): { success: boolean; error?: string } {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Pemain tidak ditemukan di room.' };
    }
    const message = (rawMessage || '').trim();
    if (!message || message.length > 60) {
      return { success: false, error: 'Pesan chat harus antara 1 sampai 60 karakter.' };
    }

    let color: string | undefined = undefined;
    if (this.gameInstance && typeof (this.gameInstance as any).getPlayerColor === 'function') {
      color = (this.gameInstance as any).getPlayerColor(playerId);
    }

    const chatMessage: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playerId: player.id,
      nickname: player.nickname,
      color,
      avatar: player.avatar,
      message,
      timestamp: Date.now(),
    };

    this.io.to(this.id).emit('game:chat-message', chatMessage);
    return { success: true };
  }

  public startVoteKick(initiatorPlayerId: string, targetPlayerId: string, reason?: string): { success: boolean; error?: string } {
    if (this.status !== 'in-game') {
      return { success: false, error: 'Vote kick hanya bisa dilakukan saat gameplay berlangsung.' };
    }
    if (this.players.size <= 2) {
      return { success: false, error: 'Vote kick hanya tersedia jika jumlah pemain lebih dari 2 orang.' };
    }
    if (this.activeVoteKick) {
      return { success: false, error: 'Voting kick pemain lain sedang berjalan.' };
    }

    const initiator = this.players.get(initiatorPlayerId);
    if (!initiator) {
      return { success: false, error: 'Pemain pembuat vote tidak ditemukan.' };
    }

    const target = this.players.get(targetPlayerId);
    if (!target) {
      return { success: false, error: 'Pemain target kick tidak ditemukan.' };
    }

    if (initiatorPlayerId === targetPlayerId) {
      return { success: false, error: 'Anda tidak dapat melakukan vote kick pada diri sendiri.' };
    }

    // Eligible voters are all players in the room except the target
    const eligibleCount = this.players.size - 1;
    const requiredVotes = Math.floor(eligibleCount / 2) + 1;

    let targetColor: string | undefined;
    if (this.gameInstance && typeof (this.gameInstance as any).getPlayerColor === 'function') {
      targetColor = (this.gameInstance as any).getPlayerColor(targetPlayerId);
    }

    const expiresAt = Date.now() + 25000;
    const votes = new Map<string, 'yes' | 'no'>();
    // Initiator automatically votes yes
    votes.set(initiatorPlayerId, 'yes');

    const timeout = setTimeout(() => {
      this.endVoteKick(false, 'Waktu voting berakhir (tidak mencapai kuorum).');
    }, 25000);

    this.activeVoteKick = {
      targetPlayerId: target.id,
      targetNickname: target.nickname,
      initiatedByPlayerId: initiator.id,
      initiatedByNickname: initiator.nickname,
      votes,
      requiredVotes,
      expiresAt,
      timeout,
    };

    const voteState: VoteKickState = {
      targetPlayerId: target.id,
      targetNickname: target.nickname,
      targetColor,
      initiatedByPlayerId: initiator.id,
      initiatedByNickname: initiator.nickname,
      votes: { [initiatorPlayerId]: 'yes' },
      yesCount: 1,
      noCount: 0,
      requiredVotes,
      expiresAt,
    };

    this.io.to(this.id).emit('game:vote-kick-started', voteState);

    if (votes.size >= requiredVotes) {
      this.endVoteKick(true, 'Vote kick disetujui oleh mayoritas pemain.');
    }

    return { success: true };
  }

  public voteVoteKick(voterPlayerId: string, vote: 'yes' | 'no'): { success: boolean; error?: string } {
    if (!this.activeVoteKick) {
      return { success: false, error: 'Tidak ada voting kick yang sedang aktif.' };
    }

    if (voterPlayerId === this.activeVoteKick.targetPlayerId) {
      return { success: false, error: 'Pemain yang menjadi target kick tidak dapat memberikan vote.' };
    }

    if (!this.players.has(voterPlayerId)) {
      return { success: false, error: 'Pemain tidak ditemukan di dalam room.' };
    }

    this.activeVoteKick.votes.set(voterPlayerId, vote);

    let yesCount = 0;
    let noCount = 0;
    for (const v of this.activeVoteKick.votes.values()) {
      if (v === 'yes') yesCount++;
      if (v === 'no') noCount++;
    }

    this.io.to(this.id).emit('game:vote-kick-updated', {
      targetPlayerId: this.activeVoteKick.targetPlayerId,
      yesCount,
      noCount,
      requiredVotes: this.activeVoteKick.requiredVotes,
    });

    if (yesCount >= this.activeVoteKick.requiredVotes) {
      this.endVoteKick(true, 'Vote kick disetujui oleh mayoritas pemain.');
      return { success: true };
    }

    const eligibleCount = this.players.size - 1;
    const maxPossibleYes = eligibleCount - noCount;
    if (maxPossibleYes < this.activeVoteKick.requiredVotes) {
      this.endVoteKick(false, 'Vote kick ditolak (tidak mencapai suara mayoritas).');
      return { success: true };
    }

    return { success: true };
  }

  private endVoteKick(passed: boolean, reason: string): void {
    if (!this.activeVoteKick) return;

    if (this.activeVoteKick.timeout) {
      clearTimeout(this.activeVoteKick.timeout);
      this.activeVoteKick.timeout = undefined;
    }

    const targetId = this.activeVoteKick.targetPlayerId;
    const targetNick = this.activeVoteKick.targetNickname;
    this.activeVoteKick = null;

    this.io.to(this.id).emit('game:vote-kick-ended', {
      targetPlayerId: targetId,
      targetNickname: targetNick,
      kicked: passed,
      reason,
    });

    if (passed) {
      // Remove token and state from game engine if game is Ludo
      if (this.gameInstance && typeof (this.gameInstance as any).removePlayer === 'function') {
        (this.gameInstance as any).removePlayer(targetId);
        this.io.to(this.id).emit('game:ludo_state', this.gameInstance.getState());
      }
      this.removePlayer(targetId);
      this.io.to(this.id).emit('room:updated', this.getInfo());
    }
  }

  public cleanup(): void {
    if (this.activeVoteKick?.timeout) {
      clearTimeout(this.activeVoteKick.timeout);
      this.activeVoteKick = null;
    }
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
