import { 
  GameId, 
  GameMode, 
  RoomSettings, 
  Player, 
  GameResultData,
  PlayerGameResult,
  LudoColor,
  LudoToken,
  LudoPlayerState,
  LudoGameState,
  LudoInput
} from '@gamehouse/shared';
import { GameModule } from '../../core/GameModule';
import { Server as SocketIOServer } from 'socket.io';

export class LudoGame implements GameModule {
  public readonly id: GameId = 'ludo';
  public readonly name: string = 'Ludo Party';
  public readonly minPlayers: number = 2;
  public readonly maxPlayers: number = 4;
  public readonly availableModes: GameMode[] = ['classic', 'quick'];

  private roomId: string = '';
  private io!: SocketIOServer;
  private settings!: RoomSettings;
  private players: Map<string, LudoPlayerState> = new Map();
  private playerOrder: string[] = []; // Turn sequence
  private currentTurnIndex: number = 0;
  private diceValue: number | null = null;
  private isRolling: boolean = false;
  private hasRolled: boolean = false;
  private consecutiveSixes: number = 0;
  private validMoves: number[] = [];
  private turnTimeRemaining: number = 20; // 20s per turn
  private autoTurnTimeout: any = null;
  private winnerId: string | null = null;
  private rankings: PlayerGameResult[] = [];
  private finished: boolean = false;
  private lastMoveNotice: string = '';

  // Bot Automation Control
  private botTimer: number = 0;
  private botState: 'idle' | 'waiting-roll' | 'waiting-move' | 'waiting-pass' = 'idle';

  // Standard Ludo Board Constants
  private static readonly TRACK_LENGTH = 52;
  private static readonly START_TILES: Record<LudoColor, number> = {
    red: 0,
    blue: 13,
    green: 26,
    yellow: 39,
  };
  private static readonly SAFE_TILES = new Set<number>([
    0, 8, 13, 21, 26, 34, 39, 47 // 4 Start tiles + 4 Star tiles
  ]);

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
    this.validMoves = [];
    this.consecutiveSixes = 0;
    this.lastMoveNotice = 'Game started! Roll the dice to begin.';

    // Assign colors in balanced classic layout matching board corners:
    // Bottom-Left (Red) -> Top-Left (Blue) -> Top-Right (Green) -> Bottom-Right (Yellow)
    // 2 players: Red vs Green (diagonally opposite sides)
    // 3 players: Red, Blue, Green
    // 4 players: Red, Blue, Green, Yellow
    const colors: LudoColor[] = 
      players.length === 2
        ? ['red', 'green']
        : players.length === 3
        ? ['red', 'blue', 'green']
        : ['red', 'blue', 'green', 'yellow'];

    players.forEach((p, idx) => {
      const color = colors[idx % colors.length];
      const initialTokens: LudoToken[] = [0, 1, 2, 3].map((id) => ({
        id,
        color,
        state: 'base',
        stepCount: 0,
        trackPosition: -1,
      }));

      this.players.set(p.id, {
        playerId: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        color,
        tokens: initialTokens,
        finishedCount: 0,
        hasRolled: false,
        canRoll: idx === 0,
        consecutiveSixes: 0,
        isConnected: p.isConnected,
        isBot: Boolean(p.isBot),
      });

      this.playerOrder.push(p.id);
    });

    this.currentTurnIndex = 0;
    const firstPlayer = this.players.get(this.playerOrder[0]);
    if (firstPlayer && firstPlayer.isBot) {
      this.botState = 'waiting-roll';
      this.botTimer = 1.0;
    } else {
      this.botState = 'idle';
      this.botTimer = 0;
    }
    this.resetTurnTimer();
  }

  public start(): void {
    const firstPlayer = this.players.get(this.playerOrder[this.currentTurnIndex]);
    if (firstPlayer && firstPlayer.isBot) {
      this.botState = 'waiting-roll';
      this.botTimer = 1.0;
    }
    this.broadcastState();
  }

  public update(deltaTime: number): void {
    if (this.finished) return;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const currentPlayer = this.players.get(currentPlayerId);
    if (!currentPlayer) return;

    // Dedicated Bot Automation Loop
    if (currentPlayer.isBot) {
      this.updateBot(deltaTime, currentPlayer);
      return;
    }

    // Human AFK turn timeout
    this.turnTimeRemaining -= deltaTime;
    if (this.turnTimeRemaining <= 0) {
      this.handleTurnTimeout();
    }
  }

  public handleInput(playerId: string, input: LudoInput): void {
    if (this.finished) return;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    if (playerId !== currentPlayerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    if (input.action === 'roll-dice') {
      this.handleRollDice(player);
    } else if (input.action === 'move-token') {
      this.handleMoveToken(player, input.tokenIndex);
    } else if (input.action === 'pass-turn') {
      if (this.hasRolled && this.validMoves.length === 0) {
        this.passToNextPlayer();
      }
    }
  }

  public handleSkill(_playerId: string, _skill: any): void {
    // Standard Ludo has no fantasy cooldown skills
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

  public isFinished(): boolean {
    return this.finished;
  }

  public getState(): LudoGameState {
    const currentPlayerId = this.playerOrder[this.currentTurnIndex] || '';
    const currentPlayer = this.players.get(currentPlayerId);

    const playersRecord: Record<string, LudoPlayerState> = {};
    this.players.forEach((p, id) => {
      playersRecord[id] = p;
    });

    return {
      gameId: 'ludo',
      gameMode: this.settings.gameMode,
      status: this.finished ? 'finished' : 'in-game',
      currentTurnPlayerId: currentPlayerId,
      currentTurnColor: currentPlayer?.color || 'red',
      diceValue: this.diceValue,
      isRolling: this.isRolling,
      hasRolled: this.hasRolled,
      consecutiveSixes: this.consecutiveSixes,
      turnTimeRemaining: Math.max(0, Math.ceil(this.turnTimeRemaining)),
      players: playersRecord,
      playerOrder: this.playerOrder,
      validMoves: this.validMoves,
      lastMoveNotice: this.lastMoveNotice,
      winnerId: this.winnerId,
      rankings: this.rankings,
    };
  }

  public getResults(): GameResultData {
    return {
      gameId: 'ludo',
      gameMode: this.settings.gameMode,
      winner: this.rankings[0] || null,
      rankings: this.rankings,
      endedAt: Date.now(),
    };
  }

  public cleanup(): void {
    if (this.autoTurnTimeout) {
      clearTimeout(this.autoTurnTimeout);
      this.autoTurnTimeout = null;
    }
    this.botState = 'idle';
    this.botTimer = 0;
  }

  // =========================================================================
  // LUDO RULES & TURN STATE MACHINE
  // =========================================================================

  private handleRollDice(player: LudoPlayerState): void {
    if (this.hasRolled || !player.canRoll) return;

    // Server-Authoritative Dice Roll (1 to 6)
    this.diceValue = Math.floor(Math.random() * 6) + 1;
    this.hasRolled = true;
    player.hasRolled = true;
    player.canRoll = false;

    // Check consecutive 6s
    if (this.diceValue === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes === 3) {
        this.lastMoveNotice = `${player.nickname} dapat angka 6 tiga kali berturut-turut! Giliran dibatalkan.`;
        this.consecutiveSixes = 0;
        this.validMoves = [];
        this.broadcastState();
        this.schedulePassTurn(1500);
        return;
      }
    } else {
      this.consecutiveSixes = 0;
    }

    // Determine valid moves for player's tokens
    this.validMoves = this.calculateValidMoves(player, this.diceValue);

    if (this.validMoves.length === 0) {
      const hasBaseTokens = player.tokens.some((t) => t.state === 'base');
      const allBaseOrDone = player.tokens.every((t) => t.state === 'base' || t.state === 'finished');
      if (allBaseOrDone && hasBaseTokens) {
        this.lastMoveNotice = `${player.nickname} dapat ${this.diceValue}. Butuh angka 6 untuk keluar markas!`;
      } else {
        this.lastMoveNotice = `${player.nickname} dapat ${this.diceValue}. Tidak ada langkah valid!`;
      }
      this.broadcastState();
      this.schedulePassTurn(1500);
    } else {
      this.lastMoveNotice = `${player.nickname} dapat angka ${this.diceValue}! Pilih bidak yang ingin dijalankan.`;
      this.broadcastState();
    }
  }

  private calculateValidMoves(player: LudoPlayerState, dice: number): number[] {
    const valid: number[] = [];

    player.tokens.forEach((token) => {
      if (token.state === 'base') {
        // Only a 6 brings a token out of the yard
        if (dice === 6) {
          valid.push(token.id);
        }
      } else if (token.state === 'track' || token.state === 'home-stretch') {
        const targetStep = token.stepCount + dice;
        // Total steps to finish is 57. Must not overshoot 57.
        if (targetStep <= 57) {
          valid.push(token.id);
        }
      }
    });

    return valid;
  }

  private handleMoveToken(player: LudoPlayerState, tokenIndex: number): void {
    if (!this.hasRolled || this.diceValue === null) return;
    if (!this.validMoves.includes(tokenIndex)) return;

    if (this.autoTurnTimeout) {
      clearTimeout(this.autoTurnTimeout);
      this.autoTurnTimeout = null;
    }

    const token = player.tokens[tokenIndex];
    const dice = this.diceValue;
    let grantBonusRoll = false;
    let didCapture = false;
    let didFinishToken = false;

    if (token.state === 'base' && dice === 6) {
      // Move from yard to start square
      token.state = 'track';
      token.stepCount = 1;
      token.trackPosition = LudoGame.START_TILES[player.color];
      this.lastMoveNotice = `🎲 ${player.nickname} mengeluarkan bidak dari markas!`;
    } else {
      const newStep = token.stepCount + dice;
      if (newStep <= 51) {
        // Advancing along standard track
        token.state = 'track';
        token.stepCount = newStep;
        token.trackPosition = (LudoGame.START_TILES[player.color] + (newStep - 1)) % LudoGame.TRACK_LENGTH;
        this.lastMoveNotice = `${player.nickname} melangkah ${dice} kotak.`;
      } else if (newStep >= 52 && newStep < 57) {
        // Entering or advancing inside private home stretch
        token.state = 'home-stretch';
        token.stepCount = newStep;
        token.trackPosition = -1; // off common track
        this.lastMoveNotice = `${player.nickname} memasuki jalur home!`;
      } else if (newStep === 57) {
        // Reached HOME!
        token.state = 'finished';
        token.stepCount = 57;
        token.trackPosition = -1;
        player.finishedCount++;
        didFinishToken = true;
        grantBonusRoll = true;
        this.lastMoveNotice = `🎉 ${player.nickname} berhasil memasukkan bidak ke HOME! Lempar lagi!`;
      }
    }

    // Capture detection on shared track (if not on safe square)
    if (token.state === 'track' && !LudoGame.SAFE_TILES.has(token.trackPosition)) {
      this.players.forEach((otherPlayer) => {
        if (otherPlayer.playerId !== player.playerId) {
          otherPlayer.tokens.forEach((otherToken) => {
            if (otherToken.state === 'track' && otherToken.trackPosition === token.trackPosition) {
              // Knock opponent token back to yard!
              otherToken.state = 'base';
              otherToken.stepCount = 0;
              otherToken.trackPosition = -1;
              didCapture = true;
              grantBonusRoll = true;
              this.lastMoveNotice = `💥 ${player.nickname} memulangkan bidak ${otherPlayer.nickname} ke markas! Lempar lagi!`;
            }
          });
        }
      });
    }

    // Rolling a 6 also grants an extra turn
    if (dice === 6) {
      grantBonusRoll = true;
      if (!didCapture && !didFinishToken) {
        if (token.stepCount === 1) {
          this.lastMoveNotice = `🎲 ${player.nickname} mengeluarkan bidak ke arena & dapat lempar dadu lagi!`;
        } else {
          this.lastMoveNotice = `🎲 ${player.nickname} dapat dadu 6! Dapat giliran lempar ekstra.`;
        }
      }
    }

    // Check Victory Condition
    const targetWins = this.settings.gameMode === 'quick' ? 2 : 4;
    if (player.finishedCount >= targetWins && !player.rank) {
      player.rank = this.rankings.length + 1;
      this.rankings.push({
        playerId: player.playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        rank: player.rank,
        finalHeight: 100,
        fallCount: 0,
        skillsUsedCount: 0,
        score: (5 - player.rank) * 250,
      });

      if (!this.winnerId) {
        this.winnerId = player.playerId;
      }

      this.lastMoveNotice = `🏆 ${player.nickname} finished in ${player.rank}${
        player.rank === 1 ? 'st' : player.rank === 2 ? 'nd' : 'rd'
      } place!`;

      // If all but 1 player finished, or 1st place finishes in quick mode
      if (this.rankings.length >= this.players.size - 1 || this.settings.gameMode === 'quick') {
        this.endGame();
        return;
      }
    }

    // Determine next turn
    this.validMoves = [];
    this.hasRolled = false;
    this.diceValue = null;

    if (grantBonusRoll && !player.rank) {
      // Player rolls again
      player.canRoll = true;
      player.hasRolled = false;
      this.resetTurnTimer();
      if (player.isBot) {
        this.botState = 'waiting-roll';
        this.botTimer = 1.2;
      }
      this.broadcastState();
    } else {
      // Pass turn to next player
      this.passToNextPlayer();
    }
  }

  private passToNextPlayer(): void {
    if (this.finished) return;

    if (this.autoTurnTimeout) {
      clearTimeout(this.autoTurnTimeout);
      this.autoTurnTimeout = null;
    }

    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerOrder.length;
      attempts++;
      const nextPlayerId = this.playerOrder[this.currentTurnIndex];
      const nextPlayer = this.players.get(nextPlayerId);
      // Skip players that already completed all tokens
      if (nextPlayer && !nextPlayer.rank) {
        break;
      }
    } while (attempts < this.playerOrder.length);

    // Reset state for new player's turn
    this.hasRolled = false;
    this.diceValue = null;
    this.validMoves = [];
    this.consecutiveSixes = 0;

    const nextCurrentPlayerId = this.playerOrder[this.currentTurnIndex];
    const nextCurrentPlayer = this.players.get(nextCurrentPlayerId);

    this.players.forEach((p, pId) => {
      p.canRoll = pId === nextCurrentPlayerId;
      p.hasRolled = false;
    });

    if (nextCurrentPlayer && nextCurrentPlayer.isBot) {
      this.botState = 'waiting-roll';
      this.botTimer = 1.0;
    } else {
      this.botState = 'idle';
      this.botTimer = 0;
    }

    this.resetTurnTimer();
    this.broadcastState();
  }

  private schedulePassTurn(delayMs: number): void {
    if (this.autoTurnTimeout) {
      clearTimeout(this.autoTurnTimeout);
      this.autoTurnTimeout = null;
    }
    // Prevent AFK turn timeout from firing while auto turn pass is pending
    this.turnTimeRemaining = (delayMs / 1000) + 2;
    this.autoTurnTimeout = setTimeout(() => {
      this.autoTurnTimeout = null;
      this.passToNextPlayer();
    }, delayMs);
  }

  private handleTurnTimeout(): void {
    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const player = this.players.get(currentPlayerId);
    if (!player) return;

    if (!this.hasRolled) {
      // Auto-roll for AFK player
      this.handleRollDice(player);
      // Reset turn timer to 5s window so auto-move does not trigger 0ms later in next tick
      this.turnTimeRemaining = 5;
    } else if (this.validMoves.length > 0) {
      // Auto-move first available token
      this.handleMoveToken(player, this.validMoves[0]);
    } else {
      this.passToNextPlayer();
    }
  }

  // =========================================================================
  // BOT AUTOMATION & INTELLIGENCE
  // =========================================================================

  private updateBot(deltaTime: number, botPlayer: LudoPlayerState): void {
    if (this.finished) return;

    if (this.botState === 'idle') {
      this.botState = 'waiting-roll';
      this.botTimer = 1.0;
      return;
    }

    this.botTimer -= deltaTime;
    if (this.botTimer > 0) return;

    if (this.botState === 'waiting-roll') {
      if (!this.hasRolled && botPlayer.canRoll) {
        this.handleRollDice(botPlayer);

        if (this.validMoves.length === 0) {
          this.botState = 'waiting-pass';
          this.botTimer = 1.6; // Allow human players to see the rolled number
        } else {
          this.botState = 'waiting-move';
          this.botTimer = 1.2; // Natural delay before moving token
        }
      } else {
        this.botState = 'waiting-pass';
        this.botTimer = 1.0;
      }
    } else if (this.botState === 'waiting-move') {
      if (this.validMoves.length > 0 && this.diceValue !== null) {
        const chosenToken = this.chooseBestBotMove(botPlayer, this.validMoves, this.diceValue);
        this.handleMoveToken(botPlayer, chosenToken);
      } else {
        this.botState = 'waiting-pass';
        this.botTimer = 1.0;
      }
    } else if (this.botState === 'waiting-pass') {
      this.botState = 'idle';
      this.passToNextPlayer();
    }
  }

  private chooseBestBotMove(bot: LudoPlayerState, validMoves: number[], dice: number): number {
    if (validMoves.length === 1) {
      return validMoves[0];
    }

    // Priority 1: Move that reaches HOME (step 57)
    for (const tokenIdx of validMoves) {
      const token = bot.tokens[tokenIdx];
      if (token.stepCount + dice === 57) {
        return tokenIdx;
      }
    }

    // Priority 2: Move that captures an opponent's token
    for (const tokenIdx of validMoves) {
      const token = bot.tokens[tokenIdx];
      let targetTrackPos: number = -1;

      if (token.state === 'base' && dice === 6) {
        targetTrackPos = LudoGame.START_TILES[bot.color];
      } else if (token.state === 'track') {
        const newStep = token.stepCount + dice;
        if (newStep <= 51) {
          targetTrackPos = (LudoGame.START_TILES[bot.color] + (newStep - 1)) % LudoGame.TRACK_LENGTH;
        }
      }

      if (targetTrackPos !== -1 && !LudoGame.SAFE_TILES.has(targetTrackPos)) {
        for (const [otherId, otherPlayer] of Array.from(this.players.entries())) {
          if (otherId !== bot.playerId) {
            const hasOpponent = otherPlayer.tokens.some(
              (ot) => ot.state === 'track' && ot.trackPosition === targetTrackPos
            );
            if (hasOpponent) {
              return tokenIdx; // CAPTURE!
            }
          }
        }
      }
    }

    // Priority 3: If rolled a 6 and has tokens in base, bring a token out of base!
    if (dice === 6) {
      const baseToken = validMoves.find((idx) => bot.tokens[idx].state === 'base');
      if (baseToken !== undefined) {
        return baseToken;
      }
    }

    // Priority 4: Move onto a SAFE square (star or start tile)
    for (const tokenIdx of validMoves) {
      const token = bot.tokens[tokenIdx];
      if (token.state === 'track') {
        const newStep = token.stepCount + dice;
        if (newStep <= 51) {
          const targetTrackPos = (LudoGame.START_TILES[bot.color] + (newStep - 1)) % LudoGame.TRACK_LENGTH;
          if (LudoGame.SAFE_TILES.has(targetTrackPos)) {
            return tokenIdx;
          }
        }
      }
    }

    // Priority 5: Advance token in home stretch
    const homeStretchToken = validMoves.find((idx) => bot.tokens[idx].state === 'home-stretch');
    if (homeStretchToken !== undefined) {
      return homeStretchToken;
    }

    // Priority 6: Move furthest advanced token
    let bestTokenIdx = validMoves[0];
    let maxSteps = -1;
    for (const tokenIdx of validMoves) {
      const token = bot.tokens[tokenIdx];
      if (token.stepCount > maxSteps) {
        maxSteps = token.stepCount;
        bestTokenIdx = tokenIdx;
      }
    }

    return bestTokenIdx;
  }

  private resetTurnTimer(): void {
    this.turnTimeRemaining = 20; // 20 seconds
  }

  private endGame(): void {
    this.finished = true;
    if (this.autoTurnTimeout) {
      clearTimeout(this.autoTurnTimeout);
      this.autoTurnTimeout = null;
    }

    // Add remaining unfinished players to rankings
    const unfinished = Array.from(this.players.values())
      .filter((p) => !p.rank)
      .sort((a, b) => b.finishedCount - a.finishedCount);

    unfinished.forEach((p) => {
      const rank = this.rankings.length + 1;
      p.rank = rank;
      this.rankings.push({
        playerId: p.playerId,
        nickname: p.nickname,
        avatar: p.avatar,
        rank,
        finalHeight: p.finishedCount * 25,
        fallCount: 0,
        skillsUsedCount: 0,
        score: p.finishedCount * 50,
      });
    });

    this.broadcastState();
    this.io.to(this.roomId).emit('game:finished', this.getResults());
  }

  private broadcastState(): void {
    const state = this.getState();
    this.io.to(this.roomId).emit('game:state', state);
    this.io.to(this.roomId).emit('game:ludo_state', state);
  }
}
