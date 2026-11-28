import {
  GameId,
  GameMode,
  RoomSettings,
  Player,
  GameResultData,
  PlayerGameResult,
  SnakeLadderColor,
  SnakeLadderPlayerState,
  SnakeLadderGameState,
  SnakeLadderInput,
  SnakeLadderMoveEvent,
  SnakeLadderTrigger,
  SNAKE_LADDER_LADDERS,
  SNAKE_LADDER_SNAKES,
} from '@gamehouse/shared';
import { GameModule } from '../../core/GameModule';
import { Server as SocketIOServer } from 'socket.io';

const TURN_DURATION_SECONDS = 20;

export class SnakeLadderGame implements GameModule {
  public readonly id: GameId = 'snake-ladder';
  public readonly name: string = 'Ular Tangga 2.5D';
  public readonly minPlayers: number = 2;
  public readonly maxPlayers: number = 6;
  public readonly availableModes: GameMode[] = ['snake-classic', 'snake-quick'];

  private roomId: string = '';
  private io!: SocketIOServer;
  private settings!: RoomSettings;
  private players: Map<string, SnakeLadderPlayerState> = new Map();
  private playerOrder: string[] = [];
  private currentTurnIndex: number = 0;
  private diceValue: number | null = null;
  private hasRolled: boolean = false;
  private consecutiveSixes: number = 0;
  private turnTimeRemaining: number = TURN_DURATION_SECONDS;
  private turnStartedAt: number = Date.now();
  private rolledAt: number | null = null;
  private moveAnimUntil: number | null = null;
  private moveSeq: number = 0;
  private lastMove: SnakeLadderMoveEvent | null = null;
  private lastMoveNotice: string = '';
  private winnerId: string | null = null;
  private rankings: PlayerGameResult[] = [];
  private finished: boolean = false;
  private stateVersion: number = 0;

  // Bot Automation Control (for Socket.IO tick loop)
  private botTimer: number = 0;

  private static readonly LADDER_MAP = new Map(
    SNAKE_LADDER_LADDERS.map((l) => [l.from, l])
  );
  private static readonly SNAKE_MAP = new Map(
    SNAKE_LADDER_SNAKES.map((s) => [s.from, s])
  );

  public initialize(
    roomId: string,
    players: Player[],
    settings: RoomSettings,
    io: SocketIOServer
  ): void {
    this.roomId = roomId;
    this.settings = settings;
    this.io = io;
    this.players.clear();
    this.playerOrder = [];
    this.rankings = [];
    this.winnerId = null;
    this.finished = false;
    this.diceValue = null;
    this.hasRolled = false;
    this.consecutiveSixes = 0;
    this.moveSeq = 0;
    this.lastMove = null;
    this.stateVersion = 1;
    this.turnStartedAt = Date.now();
    this.rolledAt = null;
    this.moveAnimUntil = null;
    this.lastMoveNotice = 'Permainan Ular Tangga dimulai! Lempar dadu untuk melangkah.';

    const colors: SnakeLadderColor[] =
      players.length === 2
        ? ['red', 'green']
        : players.length === 3
        ? ['red', 'blue', 'yellow']
        : players.length === 4
        ? ['red', 'blue', 'green', 'yellow']
        : players.length === 5
        ? ['red', 'blue', 'purple', 'green', 'yellow']
        : ['red', 'blue', 'purple', 'green', 'yellow', 'orange'];

    players.forEach((p, idx) => {
      const color = colors[idx % colors.length];
      this.players.set(p.id, {
        playerId: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        color,
        position: 0,
        laddersClimbed: 0,
        snakesBitten: 0,
        rollsCount: 0,
        consecutiveSixes: 0,
        canRoll: idx === 0,
        isConnected: p.isConnected,
        isBot: Boolean(p.isBot),
      });
      this.playerOrder.push(p.id);
    });

    this.currentTurnIndex = 0;
    const firstPlayer = this.players.get(this.playerOrder[0]);
    this.botTimer = firstPlayer?.isBot ? 1.0 : 0;
    this.resetTurnTimer(0);
  }

  public start(): void {
    const firstPlayer = this.players.get(this.playerOrder[this.currentTurnIndex]);
    if (firstPlayer?.isBot) {
      this.botTimer = 1.0;
    }
    this.broadcastState();
  }

  public update(deltaTime: number): void {
    if (this.finished) return;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const currentPlayer = this.players.get(currentPlayerId);
    if (!currentPlayer) return;

    if (currentPlayer.isBot) {
      this.botTimer -= deltaTime;
      if (this.botTimer <= 0 && currentPlayer.canRoll) {
        this.handleRollDice(currentPlayer);
      }
      return;
    }

    // Pause AFK countdown while move animation plays
    if (this.moveAnimUntil && Date.now() < this.moveAnimUntil) {
      return;
    }

    this.turnTimeRemaining -= deltaTime;
    if (this.turnTimeRemaining <= 0) {
      this.handleRollDice(currentPlayer);
    }
  }

  public handleInput(playerId: string, input: SnakeLadderInput): void {
    if (this.finished) return;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    if (playerId !== currentPlayerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    if (input?.action === 'roll-dice') {
      this.handleRollDice(player);
    }
  }

  public handleSkill(_playerId: string, _skill: any): void {
    // Standard Snakes & Ladders has no fantasy skills
  }

  public handlePlayerDisconnect(playerId: string): void {
    const p = this.players.get(playerId);
    if (p) {
      p.isConnected = false;
      this.broadcastState();
    }
  }

  public handlePlayerReconnect(player: Player): void {
    const p = this.players.get(player.id);
    if (p) {
      p.isConnected = true;
      this.broadcastState();
    }
  }

  public removePlayer(playerId: string): void {
    if (!this.players.has(playerId)) return;
    const player = this.players.get(playerId);
    if (!player) return;

    const isCurrentTurn = this.playerOrder[this.currentTurnIndex] === playerId;
    this.players.delete(playerId);
    this.playerOrder = this.playerOrder.filter((id) => id !== playerId);
    this.stateVersion++;

    if (this.playerOrder.length <= 1) {
      this.endGame();
      return;
    }

    if (isCurrentTurn) {
      if (this.currentTurnIndex >= this.playerOrder.length) {
        this.currentTurnIndex = 0;
      }
      this.consecutiveSixes = 0;
      this.diceValue = null;
      this.hasRolled = false;
      this.resetTurnTimer(0);
      const nextPlayer = this.players.get(this.playerOrder[this.currentTurnIndex]);
      if (nextPlayer) {
        this.players.forEach((p, id) => {
          p.canRoll = id === nextPlayer.playerId;
        });
        this.botTimer = nextPlayer.isBot ? 1.0 : 0;
        this.lastMoveNotice = `${player.nickname} keluar. Giliran ${nextPlayer.nickname}!`;
      }
    } else {
      const curId = this.playerOrder[this.currentTurnIndex];
      const newIdx = this.playerOrder.indexOf(curId);
      if (newIdx !== -1) {
        this.currentTurnIndex = newIdx;
      }
    }

    this.broadcastState();
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public getState(): SnakeLadderGameState {
    const currentPlayerId = this.playerOrder[this.currentTurnIndex] || '';
    const currentPlayer = this.players.get(currentPlayerId);

    const playersRecord: Record<string, SnakeLadderPlayerState> = {};
    this.players.forEach((p, id) => {
      playersRecord[id] = p;
    });

    const effectiveStart = Math.max(this.turnStartedAt || Date.now(), this.moveAnimUntil || 0);
    const elapsedSeconds = Math.max(0, (Date.now() - effectiveStart) / 1000);
    const remaining = Math.max(0, Math.ceil(TURN_DURATION_SECONDS - elapsedSeconds));

    return {
      gameId: 'snake-ladder',
      gameMode: this.settings.gameMode,
      stateVersion: this.stateVersion,
      status: this.finished ? 'finished' : 'in-game',
      currentTurnPlayerId: currentPlayerId,
      currentTurnColor: currentPlayer?.color || 'red',
      diceValue: this.diceValue,
      hasRolled: this.hasRolled,
      turnTimeRemaining: remaining,
      turnStartedAt: this.turnStartedAt,
      rolledAt: this.rolledAt,
      moveAnimUntil: this.moveAnimUntil,
      consecutiveSixes: this.consecutiveSixes,
      players: playersRecord,
      playerOrder: this.playerOrder,
      lastMove: this.lastMove,
      lastMoveNotice: this.lastMoveNotice,
      winnerId: this.winnerId,
      rankings: this.rankings,
    };
  }

  public getResults(): GameResultData {
    return {
      gameId: 'snake-ladder',
      gameMode: this.settings.gameMode,
      winner: this.rankings[0] || null,
      rankings: this.rankings,
      endedAt: Date.now(),
    };
  }

  public cleanup(): void {
    this.botTimer = 0;
  }

  // =========================================================================
  // SERVER POLLING TIMEOUT & BOT CHECK (used in serverless polling mode)
  // =========================================================================

  public checkTimeouts(now: number = Date.now()): boolean {
    if (this.finished) return false;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const player = this.players.get(currentPlayerId);
    if (!player) return false;

    if (player.isBot && player.canRoll) {
      const waitUntil = Math.max((this.turnStartedAt || 0) + 600, (this.moveAnimUntil || 0) + 450);
      if (now >= waitUntil) {
        this.handleRollDice(player);
        return true;
      }
      return false;
    }

    const effectiveStart = Math.max(this.turnStartedAt || now, this.moveAnimUntil || 0);
    if (now - effectiveStart >= TURN_DURATION_SECONDS * 1000) {
      this.handleRollDice(player);
      return true;
    }

    return false;
  }

  // =========================================================================
  // SNAKES & LADDERS CORE TURN ENGINE
  // =========================================================================

  public executeRollForTest(playerId: string, forcedDice: number): void {
    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    if (playerId !== currentPlayerId) return;
    const player = this.players.get(playerId);
    if (!player) return;
    this.handleRollDice(player, forcedDice);
  }

  private handleRollDice(player: SnakeLadderPlayerState, forcedDice?: number): void {
    if (this.finished || !player.canRoll) return;

    const dice =
      typeof forcedDice === 'number' && forcedDice >= 1 && forcedDice <= 6
        ? forcedDice
        : Math.floor(Math.random() * 6) + 1;

    const now = Date.now();
    this.diceValue = dice;
    this.hasRolled = true;
    this.rolledAt = now;
    player.rollsCount++;
    this.stateVersion++;
    this.moveSeq++;

    // 3 consecutive 6s rule (forfeit turn to avoid infinite loops)
    if (dice === 6) {
      this.consecutiveSixes++;
      player.consecutiveSixes = this.consecutiveSixes;
      if (this.consecutiveSixes >= 3) {
        this.consecutiveSixes = 0;
        player.consecutiveSixes = 0;
        this.lastMove = {
          seq: this.moveSeq,
          playerId: player.playerId,
          diceValue: dice,
          fromTile: player.position,
          walkPath: [],
          bouncedAt100: false,
          toTile: player.position,
          bonusRoll: false,
          forfeitedThreeSixes: true,
          timestamp: now,
        };
        this.lastMoveNotice = `🎲 ${player.nickname} dapat angka 6 tiga kali berturut-turut! Giliran hangus.`;
        this.advanceToNextPlayer(950);
        return;
      }
    } else {
      this.consecutiveSixes = 0;
      player.consecutiveSixes = 0;
    }

    // Compute step-by-step walk path
    const fromTile = player.position;
    const walkPath: number[] = [];
    let current = fromTile;
    let direction = 1;
    let bouncedAt100 = false;
    const isQuick = this.settings.gameMode === 'snake-quick';

    for (let step = 0; step < dice; step++) {
      if (isQuick) {
        current = Math.min(100, current + 1);
        walkPath.push(current);
        if (current === 100) break;
      } else {
        if (current === 100) {
          direction = -1;
          bouncedAt100 = true;
        }
        current += direction;
        walkPath.push(current);
      }
    }

    const landingTile = walkPath.length > 0 ? walkPath[walkPath.length - 1] : fromTile;
    let toTile = landingTile;
    let trigger: SnakeLadderTrigger | undefined;

    const ladder = SnakeLadderGame.LADDER_MAP.get(landingTile);
    const snake = SnakeLadderGame.SNAKE_MAP.get(landingTile);

    if (ladder) {
      toTile = ladder.to;
      player.laddersClimbed++;
      trigger = {
        type: 'ladder',
        linkId: ladder.id,
        from: ladder.from,
        to: ladder.to,
        name: ladder.name,
      };
    } else if (snake) {
      toTile = snake.to;
      player.snakesBitten++;
      trigger = {
        type: 'snake',
        linkId: snake.id,
        from: snake.from,
        to: snake.to,
        name: snake.name,
      };
    }

    player.position = toTile;
    const bonusRoll = dice === 6 && toTile < 100;

    this.lastMove = {
      seq: this.moveSeq,
      playerId: player.playerId,
      diceValue: dice,
      fromTile,
      walkPath,
      bouncedAt100,
      trigger,
      toTile,
      bonusRoll,
      timestamp: now,
    };

    // Estimate animation duration (dice reveal + 1s pause 1450ms + walk steps * 290ms + trigger 950ms + settle)
    const animDurationMs = 1550 + walkPath.length * 290 + (trigger ? 980 : 220) + (bouncedAt100 ? 250 : 0);

    // Build descriptive notice
    if (toTile === 100) {
      this.lastMoveNotice = `🏆 ${player.nickname} melempar ${dice} dan mencapai petak 100! JUARA!`;
    } else if (trigger?.type === 'ladder') {
      this.lastMoveNotice = `🪜 ${player.nickname} dapat ${dice} & NAIK ${trigger.name} (${trigger.from} → ${trigger.to})${bonusRoll ? ' + Bonus Dadu 6!' : '!'}`;
    } else if (trigger?.type === 'snake') {
      this.lastMoveNotice = `🐍 Waduh! ${player.nickname} digigit ${trigger.name} & TURUN (${trigger.from} → ${trigger.to})${bonusRoll ? ' + Bonus Dadu 6!' : '!'}`;
    } else if (bouncedAt100) {
      this.lastMoveNotice = `💥 ${player.nickname} dapat ${dice}, memantul di 100 ke petak ${toTile}!`;
    } else if (bonusRoll) {
      this.lastMoveNotice = `🎲 ${player.nickname} dapat angka 6 (ke petak ${toTile})! Lempar dadu lagi!`;
    } else {
      this.lastMoveNotice = `🎲 ${player.nickname} dapat angka ${dice} → petak ${toTile}.`;
    }

    // Check victory
    if (toTile >= 100) {
      this.winnerId = player.playerId;
      this.endGame();
      return;
    }

    if (bonusRoll) {
      player.canRoll = true;
      this.hasRolled = false;
      this.resetTurnTimer(animDurationMs);
      if (player.isBot) {
        this.botTimer = Math.max(1.4, animDurationMs / 1000 + 0.35);
      }
      this.broadcastState();
    } else {
      this.advanceToNextPlayer(animDurationMs);
    }
  }

  private advanceToNextPlayer(animDurationMs: number): void {
    if (this.finished) return;

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerOrder.length;
    this.consecutiveSixes = 0;
    this.hasRolled = false;

    const nextId = this.playerOrder[this.currentTurnIndex];
    const nextPlayer = this.players.get(nextId);

    this.players.forEach((p, id) => {
      p.canRoll = id === nextId;
      if (id !== nextId) {
        p.consecutiveSixes = 0;
      }
    });

    this.resetTurnTimer(animDurationMs);
    if (nextPlayer?.isBot) {
      this.botTimer = Math.max(1.3, animDurationMs / 1000 + 0.4);
    } else {
      this.botTimer = 0;
    }

    this.broadcastState();
  }

  private resetTurnTimer(animDelayMs: number): void {
    const now = Date.now();
    this.turnStartedAt = now;
    this.moveAnimUntil = animDelayMs > 0 ? now + animDelayMs : null;
    this.turnTimeRemaining = TURN_DURATION_SECONDS;
  }

  private endGame(): void {
    this.finished = true;
    this.players.forEach((p) => {
      p.canRoll = false;
    });

    const sorted = Array.from(this.players.values()).sort((a, b) => {
      if (a.playerId === this.winnerId) return -1;
      if (b.playerId === this.winnerId) return 1;
      if (b.position !== a.position) return b.position - a.position;
      if (a.snakesBitten !== b.snakesBitten) return a.snakesBitten - b.snakesBitten;
      return b.laddersClimbed - a.laddersClimbed;
    });

    this.rankings = sorted.map((p, idx) => {
      const rank = idx + 1;
      p.rank = rank;
      const baseScore = p.position * 10;
      const bonusWin = rank === 1 ? 500 : Math.max(0, (6 - rank) * 50);
      return {
        playerId: p.playerId,
        nickname: p.nickname,
        avatar: p.avatar,
        rank,
        finalHeight: p.position,
        fallCount: p.snakesBitten,
        skillsUsedCount: p.laddersClimbed,
        score: baseScore + bonusWin,
      };
    });

    this.broadcastState();
    if (this.io?.to) {
      this.io.to(this.roomId).emit('game:finished', this.getResults());
    }
  }

  private broadcastState(): void {
    const state = this.getState();
    if (this.io?.to) {
      this.io.to(this.roomId).emit('game:state', state);
      this.io.to(this.roomId).emit('game:snake_state', state);
    }
  }
}
