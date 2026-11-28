import {
  GameId,
  GameMode,
  RoomSettings,
  Player,
  GameResultData,
  PlayerGameResult,
  UnoColor,
  UnoCard,
  UnoCardValue,
  UnoActionFx,
  UnoFxType,
  UnoPlayerPublic,
  UnoGameState,
  UnoInput,
  UNO_PLAYER_LIMITS,
} from '../../../shared';
import { GameModule } from '../../core/GameModule';
// Standalone/serverless compatible IO interface

const UNO_COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
const NUMBER_VALUES: UnoCardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES: UnoCardValue[] = ['skip', 'reverse', 'draw2'];

export function getCardPoints(card: UnoCard): number {
  if (card.value === 'wild' || card.value === 'wild_draw4') return 50;
  if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return 20;
  return parseInt(card.value, 10) || 0;
}

export function shuffleCards<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createUnoDeck(deckCopies: number = 1, salt: number = 0): UnoCard[] {
  const cards: UnoCard[] = [];
  let seq = 0;

  for (let copy = 0; copy < deckCopies; copy++) {
    for (const color of UNO_COLORS) {
      // One '0' per color
      cards.push({ id: `c_${salt}_${copy}_${seq++}_${color}_0`, color, value: '0' });

      // Two of each 1..9
      for (let n = 1; n <= 9; n++) {
        const val = String(n) as UnoCardValue;
        cards.push({ id: `c_${salt}_${copy}_${seq++}_${color}_${val}`, color, value: val });
        cards.push({ id: `c_${salt}_${copy}_${seq++}_${color}_${val}`, color, value: val });
      }

      // Two of each skip, reverse, draw2
      for (const act of ACTION_VALUES) {
        cards.push({ id: `c_${salt}_${copy}_${seq++}_${color}_${act}`, color, value: act });
        cards.push({ id: `c_${salt}_${copy}_${seq++}_${color}_${act}`, color, value: act });
      }
    }

    // Four Wild & Four Wild Draw 4
    for (let w = 0; w < 4; w++) {
      cards.push({ id: `c_${salt}_${copy}_${seq++}_wild`, color: 'wild', value: 'wild' });
      cards.push({ id: `c_${salt}_${copy}_${seq++}_wild_draw4`, color: 'wild', value: 'wild_draw4' });
    }
  }

  return shuffleCards(cards);
}

export class UnoGame implements GameModule {
  public readonly id: GameId = 'uno';
  public readonly name: string = 'UNO Party';
  public readonly minPlayers: number = UNO_PLAYER_LIMITS.minPlayers;
  public readonly maxPlayers: number = UNO_PLAYER_LIMITS.maxPlayers;
  public readonly availableModes: GameMode[] = ['uno-classic', 'uno-stack', 'uno-chaos'];

  private roomId: string = '';
  private io!: any;
  private settings!: RoomSettings;

  private players: Map<string, UnoPlayerPublic> = new Map();
  private socketIds: Map<string, string> = new Map();
  private hands: Map<string, UnoCard[]> = new Map();
  private unoShoutCounts: Map<string, number> = new Map();
  private playerOrder: string[] = [];

  private currentTurnIndex: number = 0;
  private direction: 1 | -1 = 1;
  private activeColor: UnoColor = 'red';
  private drawPile: UnoCard[] = [];
  private discardPile: UnoCard[] = [];
  private pendingDrawCount: number = 0;
  private pendingDrawType: 'draw2' | 'wild_draw4' | null = null;
  private drawnPlayableCardId: string | null = null;

  private turnDurationSeconds: number = UNO_PLAYER_LIMITS.turnDurationSeconds;
  private turnTimeRemaining: number = UNO_PLAYER_LIMITS.turnDurationSeconds;
  private turnStartedAt: number = Date.now();
  private startedAt: number = Date.now();
  private turnCount: number = 0;
  private stateVersion: number = 0;
  private fxSeq: number = 0;
  private lastFx: UnoActionFx | null = null;
  private lastMoveNotice: string = '';

  private winnerId: string | null = null;
  private rankings: PlayerGameResult[] = [];
  private finished: boolean = false;

  // Bot & 1s timer sync
  private botTimer: number = 0;
  private botActionPending: boolean = false;
  private tickAccumulator: number = 0;
  private deckGenerationSalt: number = 1;

  public shouldBroadcastTick(): boolean {
    // Event-driven: UnoGame broadcasts personalized private-hand states on transitions & 1s timer intervals
    return false;
  }

  public initialize(
    roomId: string,
    players: Player[],
    settings: RoomSettings,
    io: any
  ): void {
    this.roomId = roomId;
    this.settings = settings;
    this.io = io;

    this.players.clear();
    this.socketIds.clear();
    this.hands.clear();
    this.unoShoutCounts.clear();
    this.playerOrder = [];
    this.rankings = [];
    this.winnerId = null;
    this.finished = false;
    this.direction = 1;
    this.pendingDrawCount = 0;
    this.pendingDrawType = null;
    this.drawnPlayableCardId = null;
    this.turnCount = 0;
    this.stateVersion = 1;
    this.fxSeq = 1;
    this.startedAt = Date.now();
    this.turnStartedAt = this.startedAt;
    this.turnDurationSeconds = settings.gameMode === 'uno-stack' ? 16 : UNO_PLAYER_LIMITS.turnDurationSeconds;
    this.turnTimeRemaining = this.turnDurationSeconds;
    this.tickAccumulator = 0;

    // Use 2 full decks (216 cards) for 7-10 players so massive +4 chains never starve the deck
    const deckCopies = players.length >= 7 ? 2 : 1;
    this.drawPile = createUnoDeck(deckCopies, this.deckGenerationSalt++);
    this.discardPile = [];

    players.forEach((p, idx) => {
      const dealt = this.drawPile.splice(0, UNO_PLAYER_LIMITS.startingCards);
      this.hands.set(p.id, dealt);
      this.socketIds.set(p.id, p.socketId);
      this.unoShoutCounts.set(p.id, 0);
      this.playerOrder.push(p.id);
      this.players.set(p.id, {
        playerId: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        seatIndex: idx,
        cardCount: dealt.length,
        calledUno: false,
        unoPreArmed: false,
        isConnected: p.isConnected,
        isBot: Boolean(p.isBot),
        score: p.score || 0,
      });
    });

    // Pick a clean starting number card from the deck
    const starterIdx = this.drawPile.findIndex(
      (c) => c.color !== 'wild' && NUMBER_VALUES.includes(c.value)
    );
    const starterCard =
      starterIdx >= 0
        ? this.drawPile.splice(starterIdx, 1)[0]
        : this.drawPile.pop() || { id: 'c_fallback_0', color: 'red' as const, value: '5' as const };

    this.discardPile.push(starterCard);
    this.activeColor = starterCard.color === 'wild' ? 'red' : starterCard.color;

    this.currentTurnIndex = 0;
    const firstPlayer = this.players.get(this.playerOrder[0]);
    this.lastMoveNotice = `Permainan UNO dimulai (${players.length} Pemain)! Giliran ${firstPlayer?.nickname || 'Pemain 1'}.`;
    this.lastFx = {
      seq: this.fxSeq,
      type: 'start',
      actorId: firstPlayer?.playerId || '',
      actorNickname: firstPlayer?.nickname,
      card: starterCard,
      chosenColor: this.activeColor,
      direction: this.direction,
      message: this.lastMoveNotice,
      timestamp: this.startedAt,
    };

    this.scheduleBotIfNeeded();
  }

  public start(): void {
    this.scheduleBotIfNeeded();
    this.broadcastState();
  }

  public update(deltaTime: number): void {
    if (this.finished || this.playerOrder.length === 0) return;

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const currentPlayer = this.players.get(currentPlayerId);
    if (!currentPlayer) return;

    if (currentPlayer.isBot) {
      if (this.botActionPending) {
        this.botTimer -= deltaTime;
        if (this.botTimer <= 0) {
          this.botActionPending = false;
          this.executeBotTurn(currentPlayer);
        }
      }
      return;
    }

    this.turnTimeRemaining = Math.max(0, this.turnTimeRemaining - deltaTime);
    if (this.turnTimeRemaining <= 0) {
      this.handleTurnTimeout(currentPlayer);
      return;
    }

    // Light 1-second timer pulse so clients stay aligned without 20Hz spam
    this.tickAccumulator += deltaTime;
    if (this.tickAccumulator >= 1.0) {
      this.tickAccumulator = 0;
      this.broadcastState();
    }
  }

  public handleInput(playerId: string, input: UnoInput): void {
    if (this.finished || !input) return;

    // UNO shout & Catch UNO can be pressed even outside your turn!
    if (input.action === 'call-uno') {
      this.handleCallUno(playerId);
      return;
    }

    if (input.action === 'catch-uno') {
      this.handleCatchUno(playerId, input.targetPlayerId);
      return;
    }

    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    if (playerId !== currentPlayerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    if (input.action === 'play-card') {
      this.handlePlayCard(player, input.cardId, input.chosenColor, input.targetPlayerId);
    } else if (input.action === 'draw-card') {
      this.handleDrawCard(player);
    } else if (input.action === 'pass-turn') {
      this.handlePassTurn(player);
    }
  }

  public handleSkill(_playerId: string, _skill: any): void {
    // No cooldown skills in UNO
  }

  public handlePlayerDisconnect(playerId: string): void {
    const p = this.players.get(playerId);
    if (p) {
      p.isConnected = false;
      this.stateVersion++;
      this.broadcastState();
    }
  }

  public handlePlayerReconnect(player: Player): void {
    const p = this.players.get(player.id);
    if (p) {
      p.isConnected = true;
      this.socketIds.set(player.id, player.socketId);
      this.broadcastStateToPlayer(player.id);
    }
  }

  public removePlayer(playerId: string): void {
    if (!this.players.has(playerId)) return;
    const removed = this.players.get(playerId);
    const wasCurrent = this.playerOrder[this.currentTurnIndex] === playerId;

    // Return removed player's cards back to bottom of draw pile
    const removedHand = this.hands.get(playerId) || [];
    this.drawPile.unshift(...removedHand);
    this.hands.delete(playerId);
    this.players.delete(playerId);
    this.socketIds.delete(playerId);
    this.playerOrder = this.playerOrder.filter((id) => id !== playerId);
    this.stateVersion++;

    if (this.playerOrder.length <= 1) {
      const soleId = this.playerOrder[0] || null;
      this.finishGame(soleId, `${removed?.nickname || 'Pemain'} keluar. Pertandingan berakhir!`);
      return;
    }

    if (wasCurrent) {
      if (this.currentTurnIndex >= this.playerOrder.length) {
        this.currentTurnIndex = 0;
      }
      this.drawnPlayableCardId = null;
      this.resetTurnTimer();
      this.scheduleBotIfNeeded();
    } else {
      const curId = this.playerOrder[this.currentTurnIndex];
      const idx = this.playerOrder.indexOf(curId);
      this.currentTurnIndex = idx >= 0 ? idx : 0;
    }

    this.lastMoveNotice = `${removed?.nickname || 'Pemain'} keluar dari meja.`;
    this.broadcastState();
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public getUnoShoutCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.unoShoutCounts.forEach((v, k) => {
      counts[k] = v;
    });
    return counts;
  }

  public getPlayableCardIds(playerId: string): string[] {
    if (this.finished) return [];
    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    if (playerId !== currentPlayerId) return [];

    const hand = this.hands.get(playerId) || [];
    const topCard = this.getTopCard();

    if (this.drawnPlayableCardId) {
      return hand.some((c) => c.id === this.drawnPlayableCardId) ? [this.drawnPlayableCardId] : [];
    }

    if (this.pendingDrawCount > 0) {
      return hand
        .filter((card) => {
          if (this.pendingDrawType === 'draw2') {
            return card.value === 'draw2' || card.value === 'wild_draw4';
          }
          return card.value === 'wild_draw4';
        })
        .map((c) => c.id);
    }

    return hand
      .filter(
        (card) =>
          card.color === 'wild' ||
          card.color === this.activeColor ||
          card.value === topCard.value
      )
      .map((c) => c.id);
  }

  public getState(): UnoGameState {
    return this.buildPublicState();
  }

  public getStateWithSecrets(): UnoGameState {
    const publicState = this.buildPublicState();
    const privateHands: Record<string, UnoCard[]> = {};
    this.hands.forEach((cards, pId) => {
      privateHands[pId] = [...cards];
    });
    return {
      ...publicState,
      privateHands,
      privateDeck: [...this.drawPile],
      privateDiscardPile: [...this.discardPile],
    };
  }

  public getStateForPlayer(playerId: string): UnoGameState {
    const publicState = this.buildPublicState();
    const myHand = this.hands.get(playerId) || [];
    const playableCardIds = this.getPlayableCardIds(playerId);
    return {
      ...publicState,
      myHand: [...myHand],
      playableCardIds,
    };
  }

  public getResults(): GameResultData {
    const winnerRanking = this.rankings[0] || null;
    return {
      gameId: 'uno',
      gameMode: this.settings.gameMode,
      winner: winnerRanking,
      rankings: this.rankings,
      endedAt: Date.now(),
    };
  }

  public cleanup(): void {
    this.botActionPending = false;
  }

  /**
   * Serverless helper: check whether human turn timed out or bot turn is due.
   */
  public checkTimeouts(now: number = Date.now()): boolean {
    if (this.finished || this.playerOrder.length === 0) return false;
    const currentPlayerId = this.playerOrder[this.currentTurnIndex];
    const currentPlayer = this.players.get(currentPlayerId);
    if (!currentPlayer) return false;

    const elapsedSeconds = (now - this.turnStartedAt) / 1000;
    if (currentPlayer.isBot) {
      // Bots act cleanly after 0.65s
      if (elapsedSeconds >= 0.65) {
        this.executeBotTurn(currentPlayer);
        return true;
      }
      return false;
    }

    if (elapsedSeconds >= this.turnDurationSeconds) {
      this.handleTurnTimeout(currentPlayer);
      return true;
    }

    return false;
  }

  public restoreState(state: UnoGameState): void {
    if (!state || state.gameId !== 'uno') return;
    this.players.clear();
    Object.entries(state.players || {}).forEach(([id, p]) => {
      this.players.set(id, { ...p });
    });
    this.playerOrder = Array.isArray(state.playerOrder) ? [...state.playerOrder] : [];
    const curIdx = this.playerOrder.indexOf(state.currentTurnPlayerId);
    this.currentTurnIndex = curIdx >= 0 ? curIdx : 0;
    this.direction = state.direction === -1 ? -1 : 1;
    this.activeColor = state.activeColor || 'red';
    this.pendingDrawCount = state.pendingDrawCount || 0;
    this.pendingDrawType = state.pendingDrawType || null;
    this.drawnPlayableCardId = state.drawnPlayableCardId || null;
    this.turnDurationSeconds = state.turnDurationSeconds || UNO_PLAYER_LIMITS.turnDurationSeconds;
    this.turnStartedAt = state.turnStartedAt || Date.now();
    this.startedAt = state.startedAt || Date.now();
    const elapsed = (Date.now() - this.turnStartedAt) / 1000;
    this.turnTimeRemaining = Math.max(0, this.turnDurationSeconds - elapsed);
    this.turnCount = state.turnCount || 0;
    this.stateVersion = state.stateVersion || 1;
    this.lastFx = state.lastFx || null;
    this.fxSeq = state.lastFx?.seq || 1;
    this.lastMoveNotice = state.lastMoveNotice || '';
    this.winnerId = state.winnerId || null;
    this.rankings = state.rankings || [];
    this.finished = state.status === 'finished' || Boolean(state.winnerId);

    this.hands.clear();
    if (state.privateHands) {
      Object.entries(state.privateHands).forEach(([id, cards]) => {
        this.hands.set(id, [...cards]);
      });
    }
    this.drawPile = Array.isArray(state.privateDeck) ? [...state.privateDeck] : [];
    this.discardPile = Array.isArray(state.privateDiscardPile)
      ? [...state.privateDiscardPile]
      : state.topCard
      ? [state.topCard]
      : [];
  }

  public static sanitizeStateForPlayer(state: any, playerId?: string | null): any {
    if (!state || state.gameId !== 'uno') return state;
    const { privateHands, privateDeck, privateDiscardPile, ...publicPart } = state;
    if (!playerId || !privateHands) {
      return publicPart;
    }

    const myHand: UnoCard[] = Array.isArray(privateHands[playerId]) ? privateHands[playerId] : [];
    let playableCardIds: string[] = [];

    if (publicPart.status !== 'finished' && publicPart.currentTurnPlayerId === playerId) {
      if (publicPart.drawnPlayableCardId) {
        playableCardIds = myHand.some((c) => c.id === publicPart.drawnPlayableCardId)
          ? [publicPart.drawnPlayableCardId]
          : [];
      } else if ((publicPart.pendingDrawCount || 0) > 0) {
        playableCardIds = myHand
          .filter((card) =>
            publicPart.pendingDrawType === 'draw2'
              ? card.value === 'draw2' || card.value === 'wild_draw4'
              : card.value === 'wild_draw4'
          )
          .map((c) => c.id);
      } else {
        const topVal = publicPart.topCard?.value;
        playableCardIds = myHand
          .filter(
            (card) =>
              card.color === 'wild' ||
              card.color === publicPart.activeColor ||
              card.value === topVal
          )
          .map((c) => c.id);
      }
    }

    return {
      ...publicPart,
      myHand,
      playableCardIds,
    };
  }

  // =========================================================================
  // INTERNAL GAMEPLAY ACTIONS
  // =========================================================================

  private getTopCard(): UnoCard {
    return this.discardPile[this.discardPile.length - 1] || { id: 'fallback', color: 'red', value: '0' };
  }

  private drawFromPile(count: number): UnoCard[] {
    const drawn: UnoCard[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        this.replenishDrawPile();
      }
      const card = this.drawPile.pop();
      if (card) drawn.push(card);
    }
    return drawn;
  }

  private replenishDrawPile(): void {
    if (this.discardPile.length > 1) {
      const top = this.discardPile.pop()!;
      this.drawPile = shuffleCards(this.discardPile);
      this.discardPile = [top];
      return;
    }
    // Emergency fresh deck if 10 players somehow hold all cards in hand
    this.drawPile = createUnoDeck(1, this.deckGenerationSalt++);
  }

  private advanceTurnIndex(steps: number = 1): void {
    const len = this.playerOrder.length;
    if (len === 0) return;
    this.currentTurnIndex = (((this.currentTurnIndex + steps * this.direction) % len) + len) % len;
  }

  private peekPlayerAtOffset(steps: number): UnoPlayerPublic | undefined {
    const len = this.playerOrder.length;
    if (len === 0) return undefined;
    const idx = (((this.currentTurnIndex + steps * this.direction) % len) + len) % len;
    return this.players.get(this.playerOrder[idx]);
  }

  private handlePlayCard(
    player: UnoPlayerPublic,
    cardId: string,
    chosenColor?: UnoColor,
    targetPlayerId?: string
  ): void {
    const playableIds = this.getPlayableCardIds(player.playerId);
    if (!playableIds.includes(cardId)) return;

    const hand = this.hands.get(player.playerId) || [];
    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx < 0) return;

    const [playedCard] = hand.splice(cardIdx, 1);
    this.discardPile.push(playedCard);
    this.drawnPlayableCardId = null;
    this.turnCount++;
    this.stateVersion++;

    player.cardCount = hand.length;
    if (hand.length === 1) {
      if (player.unoPreArmed) {
        player.calledUno = true;
        player.unoPreArmed = false;
      } else {
        player.calledUno = false;
      }
    } else {
      player.calledUno = false;
      player.unoPreArmed = false;
    }

    // Immediate victory if hand reaches 0
    if (hand.length === 0) {
      this.activeColor =
        playedCard.color === 'wild'
          ? UNO_COLORS.includes(chosenColor as UnoColor)
            ? (chosenColor as UnoColor)
            : this.activeColor
          : playedCard.color;
      this.emitFx('win', player.playerId, undefined, playedCard, this.activeColor, undefined, `🏆 ${player.nickname} menghabiskan semua kartunya dan MENANG UNO!`);
      this.finishGame(player.playerId, `🏆 ${player.nickname} MENANG UNO!`);
      return;
    }

    const isStackMode =
      this.settings.gameMode === 'uno-stack' || this.settings.gameMode === 'uno-chaos';
    const isChaosMode = this.settings.gameMode === 'uno-chaos';

    // Update active color
    if (playedCard.color === 'wild') {
      this.activeColor = UNO_COLORS.includes(chosenColor as UnoColor)
        ? (chosenColor as UnoColor)
        : this.pickMajorityColor(hand);
    } else {
      this.activeColor = playedCard.color;
    }

    // Apply card effect
    if (playedCard.value === 'skip') {
      const skipped = this.peekPlayerAtOffset(1);
      if (skipped) skipped.lastAction = 'SKIPPED! 🚫';
      player.lastAction = 'Skip 🚫';
      this.advanceTurnIndex(2);
      this.emitFx(
        'skip',
        player.playerId,
        skipped?.playerId,
        playedCard,
        this.activeColor,
        undefined,
        `🚫 ${player.nickname} melewati giliran ${skipped?.nickname || 'lawan'}!`
      );
    } else if (playedCard.value === 'reverse') {
      this.direction = this.direction === 1 ? -1 : 1;
      player.lastAction = 'Reverse ⇄';
      const steps = this.playerOrder.length === 2 ? 2 : 1;
      this.advanceTurnIndex(steps);
      this.emitFx(
        'reverse',
        player.playerId,
        undefined,
        playedCard,
        this.activeColor,
        undefined,
        `⇄ ${player.nickname} membalik arah permainan!`
      );
    } else if (playedCard.value === 'draw2') {
      if (isStackMode) {
        this.pendingDrawCount += 2;
        this.pendingDrawType = 'draw2';
        const nextP = this.peekPlayerAtOffset(1);
        player.lastAction = `Stack +2 (Total +${this.pendingDrawCount})`;
        this.advanceTurnIndex(1);
        this.emitFx(
          'draw2',
          player.playerId,
          nextP?.playerId,
          playedCard,
          this.activeColor,
          this.pendingDrawCount,
          `⚡ ${player.nickname} menumpuk +2! Total serangan: +${this.pendingDrawCount} ke ${nextP?.nickname || 'berikutnya'}!`
        );
      } else {
        const victim = this.peekPlayerAtOffset(1);
        if (victim) {
          this.applyForcedDraw(victim, 2);
          victim.lastAction = '+2 Kartu!';
        }
        player.lastAction = 'Bom +2!';
        this.advanceTurnIndex(2);
        this.emitFx(
          'draw2',
          player.playerId,
          victim?.playerId,
          playedCard,
          this.activeColor,
          2,
          `💥 ${player.nickname} memberi +2 kartu ke ${victim?.nickname || 'lawan'}!`
        );
      }
    } else if (playedCard.value === 'wild_draw4') {
      if (isStackMode) {
        this.pendingDrawCount += 4;
        this.pendingDrawType = 'wild_draw4';
        const nextP = this.peekPlayerAtOffset(1);
        player.lastAction = `Wild +4 (Total +${this.pendingDrawCount})`;
        this.advanceTurnIndex(1);
        this.emitFx(
          'wild_draw4',
          player.playerId,
          nextP?.playerId,
          playedCard,
          this.activeColor,
          this.pendingDrawCount,
          `🔥 ${player.nickname} melempar WILD +4 (${this.activeColor.toUpperCase()})! Total +${this.pendingDrawCount}!`
        );
      } else {
        const victim = this.peekPlayerAtOffset(1);
        if (victim) {
          this.applyForcedDraw(victim, 4);
          victim.lastAction = '+4 Kartu!';
        }
        player.lastAction = 'Wild +4!';
        this.advanceTurnIndex(2);
        this.emitFx(
          'wild_draw4',
          player.playerId,
          victim?.playerId,
          playedCard,
          this.activeColor,
          4,
          `🔥 ${player.nickname} melempar WILD +4 ke ${victim?.nickname || 'lawan'} & pilih warna ${this.activeColor.toUpperCase()}!`
        );
      }
    } else if (playedCard.value === 'wild') {
      player.lastAction = `Wild (${this.activeColor})`;
      this.advanceTurnIndex(1);
      this.emitFx(
        'wild',
        player.playerId,
        undefined,
        playedCard,
        this.activeColor,
        undefined,
        `🌈 ${player.nickname} mengubah warna meja menjadi ${this.activeColor.toUpperCase()}!`
      );
    } else if (isChaosMode && playedCard.value === '7') {
      const validTarget =
        targetPlayerId &&
        targetPlayerId !== player.playerId &&
        this.players.has(targetPlayerId)
          ? this.players.get(targetPlayerId)!
          : this.pickLowestCardOpponent(player.playerId);

      if (validTarget) {
        const myHand = this.hands.get(player.playerId) || [];
        const targetHand = this.hands.get(validTarget.playerId) || [];
        this.hands.set(player.playerId, [...targetHand]);
        this.hands.set(validTarget.playerId, [...myHand]);
        player.cardCount = targetHand.length;
        validTarget.cardCount = myHand.length;
        player.calledUno = false;
        validTarget.calledUno = false;
        player.unoPreArmed = false;
        validTarget.unoPreArmed = false;
        player.lastAction = `Swap ↔ ${validTarget.nickname}`;
        validTarget.lastAction = `Tukar Kartu!`;
        this.advanceTurnIndex(1);
        this.emitFx(
          'swap',
          player.playerId,
          validTarget.playerId,
          playedCard,
          this.activeColor,
          undefined,
          `🌀 CHAOS 7! ${player.nickname} menukar seluruh kartunya dengan ${validTarget.nickname}!`
        );
      } else {
        player.lastAction = `Main ${playedCard.value}`;
        this.advanceTurnIndex(1);
        this.emitFx('play', player.playerId, undefined, playedCard, this.activeColor, undefined, `${player.nickname} memainkan kartu 7.`);
      }
    } else if (isChaosMode && playedCard.value === '0') {
      this.rotateAllHands();
      player.lastAction = 'Chaos 0! Putar!';
      this.advanceTurnIndex(1);
      this.emitFx(
        'rotate',
        player.playerId,
        undefined,
        playedCard,
        this.activeColor,
        undefined,
        `🌪️ CHAOS 0! Semua tangan kartu berputar mengikuti arah meja!`
      );
    } else {
      player.lastAction = `Main ${playedCard.value}`;
      this.advanceTurnIndex(1);
      this.emitFx(
        'play',
        player.playerId,
        undefined,
        playedCard,
        this.activeColor,
        undefined,
        `${player.nickname} memainkan ${playedCard.color.toUpperCase()} ${playedCard.value.toUpperCase()}.`
      );
    }

    this.resetTurnTimer();
    this.scheduleBotIfNeeded();
    this.broadcastState();
  }

  private handleDrawCard(player: UnoPlayerPublic): void {
    if (this.drawnPlayableCardId) return; // Already drew 1 card this turn

    const hand = this.hands.get(player.playerId) || [];
    this.stateVersion++;
    this.turnCount++;

    // Case 1: Absorbing pending +2 / +4 penalty stack
    if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      this.pendingDrawType = null;
      this.applyForcedDraw(player, count);
      player.lastAction = `Tarik +${count} 💥`;
      this.advanceTurnIndex(1);
      this.emitFx(
        'draw',
        player.playerId,
        player.playerId,
        undefined,
        this.activeColor,
        count,
        `💥 ${player.nickname} mengambil hukuman +${count} kartu!`
      );
      this.resetTurnTimer();
      this.scheduleBotIfNeeded();
      this.broadcastState();
      return;
    }

    // Case 2: Normal single-card draw
    const [drawnCard] = this.drawFromPile(1);
    if (!drawnCard) return;

    hand.push(drawnCard);
    player.cardCount = hand.length;
    player.calledUno = false;
    player.unoPreArmed = false;

    const topCard = this.getTopCard();
    const isDrawnPlayable =
      drawnCard.color === 'wild' ||
      drawnCard.color === this.activeColor ||
      drawnCard.value === topCard.value;

    if (isDrawnPlayable && !player.isBot) {
      this.drawnPlayableCardId = drawnCard.id;
      player.lastAction = 'Tarik 1 (Bisa Main!)';
      this.turnTimeRemaining = Math.max(this.turnTimeRemaining, 10);
      this.turnStartedAt = Date.now() - (this.turnDurationSeconds - this.turnTimeRemaining) * 1000;
      this.emitFx(
        'draw',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        1,
        `🃏 ${player.nickname} menarik 1 kartu — bisa langsung dimainkan!`
      );
      this.broadcastState();
      return;
    }

    player.lastAction = 'Tarik 1 Kartu';
    this.advanceTurnIndex(1);
    this.emitFx(
      'draw',
      player.playerId,
      undefined,
      undefined,
      this.activeColor,
      1,
      `🃏 ${player.nickname} menarik 1 kartu dan lanjut ke pemain berikutnya.`
    );
    this.resetTurnTimer();
    this.scheduleBotIfNeeded();
    this.broadcastState();
  }

  private handlePassTurn(player: UnoPlayerPublic): void {
    if (!this.drawnPlayableCardId) return;
    this.drawnPlayableCardId = null;
    this.stateVersion++;
    player.lastAction = 'Lewati';
    this.advanceTurnIndex(1);
    this.emitFx(
      'draw',
      player.playerId,
      undefined,
      undefined,
      this.activeColor,
      0,
      `${player.nickname} menyimpan kartu barunya dan melewati giliran.`
    );
    this.resetTurnTimer();
    this.scheduleBotIfNeeded();
    this.broadcastState();
  }

  private handleCallUno(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    const hand = this.hands.get(playerId) || [];

    if (hand.length === 2 && playerId === this.playerOrder[this.currentTurnIndex]) {
      if (player.unoPreArmed) return;
      player.unoPreArmed = true;
      player.lastAction = 'SIAP UNO! 🔥';
      this.unoShoutCounts.set(playerId, (this.unoShoutCounts.get(playerId) || 0) + 1);
      this.stateVersion++;
      this.emitFx(
        'uno',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        undefined,
        `🔥 ${player.nickname} bersiap meneriakkan UNO!!`
      );
      this.broadcastState();
      return;
    }

    if (hand.length === 1 && !player.calledUno) {
      player.calledUno = true;
      player.unoPreArmed = false;
      player.lastAction = 'UNO!! 🔥';
      this.unoShoutCounts.set(playerId, (this.unoShoutCounts.get(playerId) || 0) + 1);
      this.stateVersion++;
      this.emitFx(
        'uno',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        undefined,
        `🔥 UNO!! ${player.nickname} tinggal 1 kartu!`
      );
      this.broadcastState();
    }
  }

  private handleCatchUno(catcherId: string, targetPlayerId: string): void {
    if (catcherId === targetPlayerId) return;
    const catcher = this.players.get(catcherId);
    const target = this.players.get(targetPlayerId);
    if (!catcher || !target) return;

    const targetHand = this.hands.get(targetPlayerId) || [];
    if (targetHand.length !== 1 || target.calledUno) return;

    this.applyForcedDraw(target, 2);
    catcher.score += 25;
    target.lastAction = 'TERTANGKAP +2! 😱';
    catcher.lastAction = 'Tangkap UNO! +25';
    this.stateVersion++;
    this.emitFx(
      'catch',
      catcher.playerId,
      target.playerId,
      undefined,
      this.activeColor,
      2,
      `🚨 TERTANGKAP! ${catcher.nickname} menangkap ${target.nickname} yang lupa teriak UNO (+2 kartu)!`
    );
    this.broadcastState();
  }

  private handleTurnTimeout(player: UnoPlayerPublic): void {
    this.stateVersion++;
    if (this.drawnPlayableCardId) {
      this.drawnPlayableCardId = null;
      player.lastAction = 'Auto Lewati ⏱️';
      this.advanceTurnIndex(1);
      this.emitFx(
        'timeout',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        0,
        `⏱️ Waktu ${player.nickname} habis — giliran berpindah.`
      );
    } else if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      this.pendingDrawType = null;
      this.applyForcedDraw(player, count);
      player.lastAction = `Auto +${count} ⏱️`;
      this.advanceTurnIndex(1);
      this.emitFx(
        'timeout',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        count,
        `⏱️ Waktu habis! ${player.nickname} otomatis mengambil +${count} kartu.`
      );
    } else {
      this.applyForcedDraw(player, 1);
      player.lastAction = 'Auto Tarik ⏱️';
      this.advanceTurnIndex(1);
      this.emitFx(
        'timeout',
        player.playerId,
        undefined,
        undefined,
        this.activeColor,
        1,
        `⏱️ Waktu ${player.nickname} habis — otomatis tarik 1 kartu.`
      );
    }

    this.resetTurnTimer();
    this.scheduleBotIfNeeded();
    this.broadcastState();
  }

  private applyForcedDraw(player: UnoPlayerPublic, count: number): void {
    const hand = this.hands.get(player.playerId) || [];
    const cards = this.drawFromPile(count);
    hand.push(...cards);
    player.cardCount = hand.length;
    player.calledUno = false;
    player.unoPreArmed = false;
  }

  private rotateAllHands(): void {
    const len = this.playerOrder.length;
    if (len <= 1) return;
    const oldHands = this.playerOrder.map((id) => [...(this.hands.get(id) || [])]);

    for (let i = 0; i < len; i++) {
      const sourceIdx = (((i - this.direction) % len) + len) % len;
      const targetId = this.playerOrder[i];
      const nextHand = oldHands[sourceIdx];
      this.hands.set(targetId, nextHand);
      const p = this.players.get(targetId);
      if (p) {
        p.cardCount = nextHand.length;
        p.calledUno = nextHand.length === 1;
        p.unoPreArmed = false;
      }
    }
  }

  // =========================================================================
  // SMART AI BOT LOGIC
  // =========================================================================

  private scheduleBotIfNeeded(): void {
    const curId = this.playerOrder[this.currentTurnIndex];
    const cur = this.players.get(curId);
    if (cur?.isBot && !this.finished) {
      this.botActionPending = true;
      this.botTimer = 0.72;
    } else {
      this.botActionPending = false;
      this.botTimer = 0;
    }
  }

  private executeBotTurn(bot: UnoPlayerPublic): void {
    if (this.finished) return;

    // Opportunistic catch if another player has 1 card and forgot UNO!
    for (const otherId of this.playerOrder) {
      if (otherId === bot.playerId) continue;
      const other = this.players.get(otherId);
      if (other && other.cardCount === 1 && !other.calledUno && Math.random() < 0.4) {
        this.handleCatchUno(bot.playerId, otherId);
      }
    }

    const playableIds = this.getPlayableCardIds(bot.playerId);
    const hand = this.hands.get(bot.playerId) || [];

    if (playableIds.length === 0) {
      this.handleDrawCard(bot);
      return;
    }

    const playableCards = hand.filter((c) => playableIds.includes(c.id));
    const nextPlayer = this.peekPlayerAtOffset(1);
    const nextDanger = (nextPlayer?.cardCount || 99) <= 2;

    // Score each candidate card strategically
    playableCards.sort((a, b) => {
      const scoreCard = (c: UnoCard): number => {
        let s = getCardPoints(c);
        // Save Wild +4 unless needed or next player is close to winning
        if (c.value === 'wild_draw4') s += nextDanger ? 60 : -35;
        if (c.value === 'wild') s -= 15;
        if (nextDanger && (c.value === 'draw2' || c.value === 'skip' || c.value === 'reverse')) {
          s += 45;
        }
        return s;
      };
      return scoreCard(b) - scoreCard(a);
    });

    const chosen = playableCards[0];

    // If going down to 1 card, 80% chance to shout UNO! (20% fun catch window!)
    if (hand.length === 2 && Math.random() < 0.8) {
      bot.unoPreArmed = true;
      this.unoShoutCounts.set(bot.playerId, (this.unoShoutCounts.get(bot.playerId) || 0) + 1);
    }

    const chosenColor = chosen.color === 'wild' ? this.pickMajorityColor(hand.filter((c) => c.id !== chosen.id)) : undefined;
    const swapTarget =
      this.settings.gameMode === 'uno-chaos' && chosen.value === '7'
        ? this.pickLowestCardOpponent(bot.playerId)?.playerId
        : undefined;

    this.handlePlayCard(bot, chosen.id, chosenColor, swapTarget);
  }

  private pickMajorityColor(cards: UnoCard[]): UnoColor {
    const counts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    cards.forEach((c) => {
      if (c.color !== 'wild') counts[c.color]++;
    });
    let best: UnoColor = 'red';
    let max = -1;
    UNO_COLORS.forEach((col) => {
      if (counts[col] > max) {
        max = counts[col];
        best = col;
      }
    });
    return best;
  }

  private pickLowestCardOpponent(excludeId: string): UnoPlayerPublic | undefined {
    let best: UnoPlayerPublic | undefined;
    for (const id of this.playerOrder) {
      if (id === excludeId) continue;
      const p = this.players.get(id);
      if (!p) continue;
      if (!best || p.cardCount < best.cardCount) {
        best = p;
      }
    }
    return best;
  }

  // =========================================================================
  // FINISH, SCORING & BROADCAST
  // =========================================================================

  private finishGame(winnerId: string | null, notice: string): void {
    this.finished = true;
    this.winnerId = winnerId;
    this.lastMoveNotice = notice;
    this.botActionPending = false;
    this.pendingDrawCount = 0;
    this.pendingDrawType = null;
    this.stateVersion++;

    // Calculate UNO points from opponents' remaining cards
    let opponentPointPool = 0;
    const entries: Array<{ player: UnoPlayerPublic; cardsLeft: number; handPoints: number }> = [];

    this.playerOrder.forEach((pId) => {
      const p = this.players.get(pId);
      if (!p) return;
      const hand = this.hands.get(pId) || [];
      const handPoints = hand.reduce((acc, c) => acc + getCardPoints(c), 0);
      if (pId !== winnerId) {
        opponentPointPool += handPoints;
      }
      entries.push({ player: p, cardsLeft: hand.length, handPoints });
    });

    entries.sort((a, b) => {
      if (a.player.playerId === winnerId) return -1;
      if (b.player.playerId === winnerId) return 1;
      if (a.cardsLeft !== b.cardsLeft) return a.cardsLeft - b.cardsLeft;
      return a.handPoints - b.handPoints;
    });

    this.rankings = entries.map((entry, idx) => {
      const rank = idx + 1;
      const isWinner = entry.player.playerId === winnerId;
      const matchPoints = isWinner ? 100 + opponentPointPool : Math.max(10, 60 - rank * 8);
      entry.player.rank = rank;
      entry.player.score += matchPoints;
      return {
        playerId: entry.player.playerId,
        nickname: entry.player.nickname,
        avatar: entry.player.avatar,
        rank,
        finalHeight: entry.cardsLeft, // Remaining cards at match end
        fallCount: entry.handPoints, // Remaining card point penalty
        skillsUsedCount: this.unoShoutCounts.get(entry.player.playerId) || 0, // UNO shouts
        score: entry.player.score,
      };
    });

    this.broadcastState();
    this.io.to(this.roomId).emit('game:finished', this.getResults());
  }

  private emitFx(
    type: UnoFxType,
    actorId: string,
    targetId?: string,
    card?: UnoCard,
    chosenColor?: UnoColor,
    drawCount?: number,
    message: string = ''
  ): void {
    const actor = this.players.get(actorId);
    const target = targetId ? this.players.get(targetId) : undefined;
    this.lastMoveNotice = message;
    this.lastFx = {
      seq: ++this.fxSeq,
      type,
      actorId,
      actorNickname: actor?.nickname,
      targetId,
      targetNickname: target?.nickname,
      card,
      chosenColor,
      drawCount,
      direction: this.direction,
      message,
      timestamp: Date.now(),
    };
  }

  private resetTurnTimer(): void {
    this.turnTimeRemaining = this.turnDurationSeconds;
    this.turnStartedAt = Date.now();
    this.tickAccumulator = 0;
  }

  private buildPublicState(): UnoGameState {
    const playersRecord: Record<string, UnoPlayerPublic> = {};
    this.players.forEach((p, id) => {
      playersRecord[id] = { ...p };
    });

    const recentDiscards = this.discardPile.slice(-4);
    const currentTurnPlayerId = this.playerOrder[this.currentTurnIndex] || '';

    return {
      gameId: 'uno',
      gameMode: this.settings.gameMode,
      stateVersion: this.stateVersion,
      status: this.finished ? 'finished' : 'in-game',
      playerOrder: [...this.playerOrder],
      players: playersRecord,
      currentTurnPlayerId,
      direction: this.direction,
      activeColor: this.activeColor,
      topCard: this.getTopCard(),
      recentDiscards,
      drawPileCount: this.drawPile.length,
      pendingDrawCount: this.pendingDrawCount,
      pendingDrawType: this.pendingDrawType,
      drawnPlayableCardId: this.drawnPlayableCardId,
      turnTimeRemaining: Math.ceil(this.turnTimeRemaining),
      turnStartedAt: this.turnStartedAt,
      turnDurationSeconds: this.turnDurationSeconds,
      turnCount: this.turnCount,
      startedAt: this.startedAt,
      lastFx: this.lastFx,
      lastMoveNotice: this.lastMoveNotice,
      winnerId: this.winnerId,
      rankings: this.rankings,
    };
  }

  private broadcastStateToPlayer(playerId: string): void {
    const socketId = this.socketIds.get(playerId);
    if (!socketId || !this.io) return;
    const personalized = this.getStateForPlayer(playerId);
    this.io.to(socketId).emit('game:uno_state', personalized);
    this.io.to(socketId).emit('game:state', personalized);
  }

  private broadcastState(): void {
    if (!this.io) return;
    for (const playerId of this.playerOrder) {
      const p = this.players.get(playerId);
      if (p?.isBot) continue;
      this.broadcastStateToPlayer(playerId);
    }
  }
}
