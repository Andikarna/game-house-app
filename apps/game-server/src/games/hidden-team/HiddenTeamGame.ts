import {
  GameId,
  GameMode,
  RoomSettings,
  Player,
  GameResultData,
  HiddenTeamFaction,
  HiddenTeamRole,
  HiddenTeamPhase,
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPublic,
  HiddenTeamPlayerPrivate,
  HiddenTeamRoundResult,
  HiddenTeamMatchResult,
  HiddenTeamActionPayload,
  HIDDEN_TEAM_PHASE_TIMERS,
  HIDDEN_TEAM_CONFIG,
  VoteCard,
  MainCard,
} from '@gamehouse/shared';
import { Server as SocketIOServer } from 'socket.io';
import { GameModule } from '../../core/GameModule';
import { CardDistributionService } from './services/CardDistributionService';
import { RoleAssignmentService } from './services/RoleAssignmentService';
import { TurnManagementService } from './services/TurnManagementService';
import { MainCardService } from './services/MainCardService';
import { RoleAbilityService } from './services/RoleAbilityService';
import { VotingService } from './services/VotingService';
import { VoteManipulationService } from './services/VoteManipulationService';
import { ScoreCalculationService } from './services/ScoreCalculationService';
import { GameEventService } from './services/GameEventService';

export class HiddenTeamGame implements GameModule {
  public readonly id: GameId = 'hidden-team';
  public readonly name: string = 'Hidden Team: Secret Role';
  public readonly minPlayers: number = 6;
  public readonly maxPlayers: number = 6;
  public readonly availableModes: GameMode[] = [
    'hidden-team-standard',
    'hidden-team-4r',
    'hidden-team-5r',
    'hidden-team-6r',
  ];

  // Services
  private cardDistributionService: CardDistributionService;
  private roleAssignmentService: RoleAssignmentService;
  private turnManagementService: TurnManagementService;
  private mainCardService: MainCardService;
  private roleAbilityService: RoleAbilityService;
  private votingService: VotingService;
  private voteManipulationService: VoteManipulationService;
  private scoreCalculationService: ScoreCalculationService;
  private gameEventService: GameEventService;

  // Runtime State
  private roomId: string = '';
  private io: SocketIOServer | null = null;
  private settings: RoomSettings | null = null;
  private playersMap: Map<string, Player> = new Map();

  private matchId: string = '';
  private roundNumber: number = 1;
  private totalRounds: number = 5;
  private phase: HiddenTeamPhase = 'MATCH_WAITING';
  private phaseTimer: number = 0;
  private phaseTotalTime: number = 0;
  private isMatchOver: boolean = false;

  private currentRoundResult: HiddenTeamRoundResult | null = null;
  private matchResult: HiddenTeamMatchResult | null = null;

  // Bot timer helpers for practice mode
  private botActionCooldown: number = 1.2;
  private botVoteCooldown: number = 1.0;
  private botManipulationCooldown: number = 1.2;

  constructor() {
    this.cardDistributionService = new CardDistributionService();
    this.roleAssignmentService = new RoleAssignmentService();
    this.turnManagementService = new TurnManagementService();
    this.mainCardService = new MainCardService();
    this.roleAbilityService = new RoleAbilityService(
      this.roleAssignmentService,
      this.cardDistributionService
    );
    this.votingService = new VotingService(
      this.cardDistributionService,
      this.roleAbilityService
    );
    this.voteManipulationService = new VoteManipulationService();
    this.scoreCalculationService = new ScoreCalculationService();
    this.gameEventService = new GameEventService();
  }

  public initialize(
    roomId: string,
    players: Player[],
    settings: RoomSettings,
    io: SocketIOServer
  ): void {
    this.roomId = roomId;
    this.settings = settings;
    this.io = io;
    this.playersMap.clear();

    players.forEach((p) => {
      this.playersMap.set(p.id, { ...p });
    });

    // Configure total rounds (4, 5, or 6, default 5)
    if (settings.gameMode === 'hidden-team-4r') {
      this.totalRounds = 4;
    } else if (settings.gameMode === 'hidden-team-6r') {
      this.totalRounds = 6;
    } else {
      this.totalRounds = 5;
    }

    this.matchId = `ht_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.roundNumber = 1;
    this.isMatchOver = false;
    this.currentRoundResult = null;
    this.matchResult = null;
    this.scoreCalculationService.resetMatch();
    this.gameEventService.clear();

    // Initialize 6 players into fixed turn slots 1-6, assign 3 teams and 6 roles
    const playerIds = Array.from(this.playersMap.keys());
    this.roleAssignmentService.initializeMatch(playerIds);
    this.turnManagementService.initialize(this.roleAssignmentService.getTurnSlots());

    this.gameEventService.logPublic(
      0,
      'MATCH_INITIALIZING',
      'SETUP',
      `Match ${this.matchId} initialized with 6 players across 3 hidden teams.`
    );
  }

  public start(): void {
    this.phase = 'MATCH_INITIALIZING';
    this.phaseTotalTime = 2;
    this.phaseTimer = this.phaseTotalTime;

    // Send private state immediately to all players
    this.broadcastPrivateStates();
    this.broadcastPublicState();

    // Transition to round 1 initialization
    this.startRound(1);
  }

  private startRound(roundNum: number): void {
    this.roundNumber = roundNum;
    this.phase = 'ROUND_INITIALIZING';
    this.currentRoundResult = null;

    const playerIds = this.roleAssignmentService.getTurnSlots();

    // 1. Reset round services
    this.turnManagementService.resetRound();
    this.roleAbilityService.resetRound();
    this.votingService.resetRound();
    this.voteManipulationService.resetRound();

    // 2. Distribute 3 fresh Vote Cards per player
    this.cardDistributionService.distributeRoundCards(playerIds);

    // 3. Generate 2 Main Cards for Role 5 selection
    this.mainCardService.generateRoundCandidates();

    // 4. Pre-roll Role 2 eligibility privately
    const role2PlayerId = this.roleAssignmentService.getPlayerWithRole('ROLE_2_ROLLER');
    if (role2PlayerId) {
      this.roleAbilityService.rollRole2Eligibility(role2PlayerId);
    }

    this.gameEventService.logPublic(
      this.roundNumber,
      'ROUND_INITIALIZING',
      'SETUP',
      `Ronde ${this.roundNumber} dari ${this.totalRounds} dimulai. Kartu mandat dibagikan.`
    );

    // 5. Advance to MAIN_CARD_SELECTION
    this.phase = 'MAIN_CARD_SELECTION';
    this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.mainCardSelection;
    this.phaseTimer = this.phaseTotalTime;

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  public update(deltaTime: number): void {
    if (this.isMatchOver && this.phase === 'MATCH_FINISHED') return;

    this.phaseTimer -= deltaTime;

    // Automated bot actions during relevant phases
    this.handleBotTurn(deltaTime);

    if (this.phaseTimer <= 0) {
      this.handlePhaseTimeout();
    }
  }

  private handlePhaseTimeout(): void {
    switch (this.phase) {
      case 'MAIN_CARD_SELECTION': {
        // Auto-select first card if Role 5 timed out
        this.mainCardService.autoSelectFirstCandidate();
        this.gameEventService.logPublic(
          this.roundNumber,
          'MAIN_CARD_SELECTION',
          'SETUP',
          'Kartu Takdir Ronde telah ditetapkan oleh Pemilih Kartu.'
        );
        this.enterActionPhase();
        break;
      }

      case 'ACTION_PHASE': {
        // Advance current turn slot
        this.advanceActionTurnSlot();
        break;
      }

      case 'VOTING_SUBMISSION': {
        // Auto-submit votes for pending eligible players
        const playerIds = this.roleAssignmentService.getTurnSlots();
        this.votingService.autoSubmitPending(playerIds);
        this.enterVoteManipulationPhase();
        break;
      }

      case 'VOTE_MANIPULATION': {
        // Default Role 4 decision is KEEP
        this.voteManipulationService.autoResolveDecision();
        this.enterRoundResolution();
        break;
      }

      case 'ROUND_RESOLUTION': {
        // Move to next round or match resolution
        if (this.roundNumber < this.totalRounds) {
          this.startRound(this.roundNumber + 1);
        } else {
          this.enterMatchResolution();
        }
        break;
      }

      case 'MATCH_RESOLUTION': {
        this.phase = 'MATCH_FINISHED';
        this.isMatchOver = true;
        this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.matchFinished;
        this.phaseTimer = this.phaseTotalTime;
        this.broadcastPrivateStates();
        this.broadcastPublicState();
        break;
      }

      default:
        break;
    }
  }

  private enterActionPhase(): void {
    this.phase = 'ACTION_PHASE';
    this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.actionPhaseSlot;
    this.phaseTimer = this.phaseTotalTime;

    const currentSlot = this.turnManagementService.getCurrentSlotNumber();
    const currentPlayerId = this.turnManagementService.getCurrentPlayerId();
    const player = this.playersMap.get(currentPlayerId);

    this.gameEventService.logPublic(
      this.roundNumber,
      'ACTION_PHASE',
      'ROLE_ACTION',
      `Fase Aksi Slot ${currentSlot}: Giliran ${player?.nickname || 'Pemain'}.`
    );

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  private advanceActionTurnSlot(): void {
    const prevSlot = this.turnManagementService.getCurrentSlotNumber();
    const result = this.turnManagementService.advanceSlot();

    if (result.isPhaseComplete) {
      this.enterVotingSubmissionPhase();
    } else {
      this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.actionPhaseSlot;
      this.phaseTimer = this.phaseTotalTime;

      const player = this.playersMap.get(result.nextPlayerId);
      this.gameEventService.logPublic(
        this.roundNumber,
        'ACTION_PHASE',
        'ROLE_ACTION',
        `Fase Aksi Slot ${result.nextSlotNumber}: Giliran ${player?.nickname || 'Pemain'}.`
      );

      this.broadcastPrivateStates();
      this.broadcastPublicState();
    }
  }

  private enterVotingSubmissionPhase(): void {
    this.phase = 'VOTING_SUBMISSION';
    this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.votingSubmission;
    this.phaseTimer = this.phaseTotalTime;

    this.gameEventService.logPublic(
      this.roundNumber,
      'VOTING_SUBMISSION',
      'VOTE',
      'Pengumpulan Kartu Mandat dimulai. Setiap pemain berhak menyerahkan kartu mandatnya.'
    );

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  private enterVoteManipulationPhase(): void {
    this.phase = 'VOTE_MANIPULATION';
    this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.voteManipulation;
    this.phaseTimer = this.phaseTotalTime;

    // Pick 1 random submitted card for Role 4 inspection
    const inspected = this.voteManipulationService.prepareRandomInspection(this.votingService);

    const role4PlayerId = this.roleAssignmentService.getPlayerWithRole('ROLE_4_INSPECTOR');
    const role4Player = role4PlayerId ? this.playersMap.get(role4PlayerId) : null;

    if (inspected && role4Player) {
      this.gameEventService.logPublic(
        this.roundNumber,
        'VOTE_MANIPULATION',
        'MANIPULATION',
        `Inspektur Kotak Suara (${role4Player.nickname}) sedang memeriksa 1 kartu acak.`
      );
    } else {
      // If no cards or no Role 4, auto resolve
      this.voteManipulationService.autoResolveDecision();
    }

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  private enterRoundResolution(): void {
    this.phase = 'ROUND_RESOLUTION';
    this.phaseTotalTime = HIDDEN_TEAM_PHASE_TIMERS.roundResolution;
    this.phaseTimer = this.phaseTotalTime;

    const activeMainCard = this.mainCardService.getActiveMainCard();
    if (activeMainCard) {
      this.currentRoundResult = this.scoreCalculationService.resolveRound(
        this.roundNumber,
        activeMainCard,
        this.votingService,
        this.roleAbilityService,
        this.voteManipulationService
      );

      this.gameEventService.logPublic(
        this.roundNumber,
        'ROUND_RESOLUTION',
        'RESOLUTION',
        this.currentRoundResult.reason
      );

      if (this.io) {
        this.io.to(this.roomId).emit('hidden-team:round-result', this.currentRoundResult);
      }
    }

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  private enterMatchResolution(): void {
    this.phase = 'MATCH_RESOLUTION';
    this.phaseTotalTime = 4;
    this.phaseTimer = this.phaseTotalTime;

    this.matchResult = this.scoreCalculationService.resolveMatch(
      this.totalRounds,
      this.roleAssignmentService
    );

    // Populate nicknames and avatars for identity reveal
    this.matchResult.playerIdentities.forEach((p) => {
      const player = this.playersMap.get(p.playerId);
      if (player) {
        p.nickname = player.nickname;
        p.avatar = player.avatar;
      }
    });

    const winText =
      this.matchResult.winner === 'DRAW'
        ? 'Pertandingan berakhir SERI (DRAW)!'
        : `Faksi ${this.matchResult.winner} keluar sebagai PEMENANG PERTANDINGAN!`;

    this.gameEventService.logPublic(
      this.roundNumber,
      'MATCH_RESOLUTION',
      'RESOLUTION',
      winText
    );

    if (this.io) {
      this.io.to(this.roomId).emit('hidden-team:match-result', this.matchResult);
    }

    this.broadcastPrivateStates();
    this.broadcastPublicState();
  }

  public handleInput(playerId: string, input: any): void {
    if (!input || typeof input !== 'object') return;
    const player = this.playersMap.get(playerId);
    if (!player) return;

    // 1. Role 5: Select Main Card
    if (input.action === 'role_5_select' && this.phase === 'MAIN_CARD_SELECTION') {
      const currentRole = this.roleAssignmentService.getCurrentRole(playerId);
      if (currentRole !== 'ROLE_5_SELECTOR') return;

      const res = this.mainCardService.selectMainCard(input.selectedCardId);
      if (res.success) {
        this.gameEventService.logPublic(
          this.roundNumber,
          'MAIN_CARD_SELECTION',
          'SETUP',
          `${player.nickname} telah memilih Kartu Utama.`
        );
        this.enterActionPhase();
      }
      return;
    }

    // 2. Action Phase: Player at Current Slot Executes Ability or Passes
    if (this.phase === 'ACTION_PHASE') {
      const currentSlot = this.turnManagementService.getCurrentSlotNumber();
      const currentSlotPlayerId = this.turnManagementService.getCurrentPlayerId();

      if (playerId !== currentSlotPlayerId) {
        // Not this player's fixed slot turn
        if (this.io && player.socketId) {
          this.io.to(player.socketId).emit('error:message', 'Bukan giliran slot Anda saat ini.');
        }
        return;
      }

      if (input.action === 'pass') {
        this.gameEventService.logPublic(
          this.roundNumber,
          'ACTION_PHASE',
          'ROLE_ACTION',
          `${player.nickname} (Slot ${currentSlot}) memilih melewati giliran.`
        );
        this.advanceActionTurnSlot();
        return;
      }

      // Execute role ability
      const actionPayload: HiddenTeamActionPayload = input;
      const res = this.roleAbilityService.executeAction(playerId, actionPayload);
      if (res.success) {
        this.gameEventService.logPublic(
          this.roundNumber,
          'ACTION_PHASE',
          'ROLE_ACTION',
          `${player.nickname} (Slot ${currentSlot}) berhasil mengeksekusi aksinya.`
        );
        this.advanceActionTurnSlot();
      } else if (res.error && this.io && player.socketId) {
        this.io.to(player.socketId).emit('error:message', res.error);
      }
      return;
    }

    // 3. Voting Submission Phase
    if (
      (input.action === 'submit_votes' || input.action === 'submit-votes') &&
      this.phase === 'VOTING_SUBMISSION'
    ) {
      const res = this.votingService.submitVotes(playerId, input.cardIds);
      if (res.success) {
        this.gameEventService.logPublic(
          this.roundNumber,
          'VOTING_SUBMISSION',
          'VOTE',
          `${player.nickname} telah mengunci kartu mandatnya.`
        );

        // Check if all eligible players have submitted
        const playerIds = this.roleAssignmentService.getTurnSlots();
        if (this.votingService.haveAllEligibleSubmitted(playerIds)) {
          this.enterVoteManipulationPhase();
        } else {
          this.broadcastPrivateStates();
          this.broadcastPublicState();
        }
      } else if (res.error && this.io && player.socketId) {
        this.io.to(player.socketId).emit('error:message', res.error);
      }
      return;
    }

    // 4. Vote Manipulation Phase: Role 4 Decision
    if (
      (input.action === 'role_4_inspect' || input.action === 'inspect-decision') &&
      this.phase === 'VOTE_MANIPULATION'
    ) {
      const currentRole = this.roleAssignmentService.getCurrentRole(playerId);
      if (currentRole !== 'ROLE_4_INSPECTOR') return;

      const decision: 'KEEP' | 'DISCARD' = input.decision === 'DISCARD' ? 'DISCARD' : 'KEEP';
      const res = this.voteManipulationService.submitDecision(decision);
      if (res.success) {
        this.gameEventService.logPublic(
          this.roundNumber,
          'VOTE_MANIPULATION',
          'MANIPULATION',
          `Inspektur Kotak Suara telah memutuskan untuk ${decision}.`
        );
        this.enterRoundResolution();
      }
      return;
    }
  }

  public handleSkill(_playerId: string, _skill: any): void {
    // Hidden Team relies on handleInput
  }

  public handlePlayerDisconnect(playerId: string): void {
    const player = this.playersMap.get(playerId);
    if (player) {
      player.isConnected = false;
    }
    this.broadcastPublicState();
  }

  public handlePlayerReconnect(player: Player): void {
    const existing = this.playersMap.get(player.id);
    if (existing) {
      existing.socketId = player.socketId;
      existing.isConnected = true;
    } else {
      this.playersMap.set(player.id, { ...player, isConnected: true });
    }

    // Immediately send private state to this reconnected player
    this.sendPrivateStateToPlayer(player.id);
    this.broadcastPublicState();
  }

  public isFinished(): boolean {
    return this.isMatchOver;
  }

  public getState(): HiddenTeamPublicGameState {
    return this.buildPublicGameState();
  }

  public getResults(): GameResultData {
    const winnerFaction = this.matchResult?.winner;
    const rankings = this.roleAssignmentService.getAllPlayerData().map((p) => {
      const isWinner = winnerFaction && winnerFaction !== 'DRAW' && p.team === winnerFaction;
      const player = this.playersMap.get(p.playerId);
      return {
        playerId: p.playerId,
        nickname: player?.nickname || p.playerId,
        avatar: player?.avatar || 'budi',
        rank: isWinner ? 1 : 2,
        finalHeight: isWinner ? 100 : 0,
        fallCount: 0,
        skillsUsedCount: 0,
        score: this.scoreCalculationService.getRoundWins()[p.team] || 0,
      };
    });

    return {
      gameId: 'hidden-team',
      gameMode: (this.settings?.gameMode as GameMode) || 'hidden-team-standard',
      winner: rankings.find((r) => r.rank === 1) || null,
      rankings,
      endedAt: Date.now(),
    };
  }

  public cleanup(): void {
    this.playersMap.clear();
  }

  // ==========================================
  // BOT AUTOMATION (For Practice Mode & E2E)
  // ==========================================
  private handleBotTurn(deltaTime: number): void {
    // 1. Bot Role 5 in Main Card Selection
    if (this.phase === 'MAIN_CARD_SELECTION') {
      const role5PlayerId = this.roleAssignmentService.getPlayerWithRole('ROLE_5_SELECTOR');
      const player = role5PlayerId ? this.playersMap.get(role5PlayerId) : null;
      if (player && player.isBot) {
        this.botActionCooldown -= deltaTime;
        if (this.botActionCooldown <= 0) {
          this.botActionCooldown = 1.2;
          this.mainCardService.autoSelectFirstCandidate();
          this.enterActionPhase();
        }
      }
    }

    // 2. Bot at Current Slot in Action Phase
    if (this.phase === 'ACTION_PHASE') {
      const currentPlayerId = this.turnManagementService.getCurrentPlayerId();
      const player = this.playersMap.get(currentPlayerId);
      if (player && player.isBot) {
        this.botActionCooldown -= deltaTime;
        if (this.botActionCooldown <= 0) {
          this.botActionCooldown = 1.2;
          this.executeBotSlotAction(currentPlayerId);
        }
      }
    }

    // 3. Bot in Voting Submission Phase
    if (this.phase === 'VOTING_SUBMISSION') {
      this.botVoteCooldown -= deltaTime;
      if (this.botVoteCooldown <= 0) {
        this.botVoteCooldown = 1.0;
        const playerIds = this.roleAssignmentService.getTurnSlots();
        const unsubmittedBotId = playerIds.find((id) => {
          const p = this.playersMap.get(id);
          return (
            p &&
            p.isBot &&
            this.roleAbilityService.isPlayerEligibleToVote(id) &&
            !this.votingService.hasPlayerSubmitted(id)
          );
        });

        if (unsubmittedBotId) {
          this.votingService.submitVotes(unsubmittedBotId);
          const allEligibleDone = this.votingService.haveAllEligibleSubmitted(playerIds);
          if (allEligibleDone) {
            this.enterVoteManipulationPhase();
          } else {
            this.broadcastPrivateStates();
            this.broadcastPublicState();
          }
        }
      }
    }

    // 4. Bot in Vote Manipulation Phase
    if (this.phase === 'VOTE_MANIPULATION') {
      const role4PlayerId = this.roleAssignmentService.getPlayerWithRole('ROLE_4_INSPECTOR');
      const player = role4PlayerId ? this.playersMap.get(role4PlayerId) : null;
      if (player && player.isBot) {
        this.botManipulationCooldown -= deltaTime;
        if (this.botManipulationCooldown <= 0) {
          this.botManipulationCooldown = 1.2;
          // Random KEEP or DISCARD for bot
          const decision: 'KEEP' | 'DISCARD' = Math.random() < 0.5 ? 'KEEP' : 'DISCARD';
          this.voteManipulationService.submitDecision(decision);
          this.enterRoundResolution();
        }
      }
    }
  }

  private executeBotSlotAction(botPlayerId: string): void {
    const currentRole = this.roleAssignmentService.getCurrentRole(botPlayerId);
    const otherPlayers = this.roleAssignmentService
      .getTurnSlots()
      .filter((id) => id !== botPlayerId);

    switch (currentRole) {
      case 'ROLE_1_SWAPPER': {
        const targetA = otherPlayers[0];
        const targetB = otherPlayers[1];
        if (targetA && targetB) {
          this.roleAbilityService.executeAction(botPlayerId, {
            action: 'role_1_swap',
            targetPlayerIdA: targetA,
            targetPlayerIdB: targetB,
          });
        }
        break;
      }

      case 'ROLE_2_ROLLER': {
        this.roleAbilityService.executeAction(botPlayerId, { action: 'role_2_roll' });
        break;
      }

      case 'ROLE_3_MULTIPLIER': {
        const target = otherPlayers[0] || botPlayerId;
        this.roleAbilityService.executeAction(botPlayerId, {
          action: 'role_3_multiply',
          targetPlayerId: target,
        });
        break;
      }

      case 'ROLE_6_CARD_SWAPPER': {
        const targetA = botPlayerId;
        const targetB = otherPlayers[0];
        if (targetA && targetB) {
          this.roleAbilityService.executeAction(botPlayerId, {
            action: 'role_6_swap_cards',
            targetPlayerIdA: targetA,
            targetPlayerIdB: targetB,
          });
        }
        break;
      }

      default:
        // Pass
        break;
    }

    this.advanceActionTurnSlot();
  }

  // ==========================================
  // STATE BUILDERS & BROADCASTS
  // ==========================================
  private buildPublicGameState(): HiddenTeamPublicGameState {
    const playersPublic: Record<string, HiddenTeamPlayerPublic> = {};
    const slots = this.roleAssignmentService.getTurnSlots();

    slots.forEach((playerId, index) => {
      const p = this.playersMap.get(playerId);
      const isCurrentSlotTurn =
        this.phase === 'ACTION_PHASE' &&
        this.turnManagementService.getCurrentSlotNumber() === index + 1;

      playersPublic[playerId] = {
        id: playerId,
        nickname: p?.nickname || `Player ${index + 1}`,
        avatar: p?.avatar || 'budi',
        slotNumber: index + 1,
        isConnected: p?.isConnected ?? true,
        isBot: p?.isBot ?? false,
        hasActedThisSlot: isCurrentSlotTurn
          ? this.turnManagementService.hasCurrentSlotActed()
          : false,
        hasSubmittedVotes: this.votingService.hasPlayerSubmitted(playerId),
      };
    });

    const activeMainCard =
      this.phase === 'ROUND_RESOLUTION' || this.phase === 'MATCH_FINISHED'
        ? this.mainCardService.getActiveMainCard()
        : this.mainCardService.getPublicActiveMainCard();

    return {
      gameId: 'hidden-team',
      matchId: this.matchId,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      phase: this.phase,
      phaseTimer: Math.max(0, Math.ceil(this.phaseTimer)),
      phaseTotalTime: this.phaseTotalTime,
      currentTurnSlot: this.turnManagementService.getCurrentSlotNumber(),
      activeMainCard,
      players: playersPublic,
      playerSlots: slots,
      roundWins: this.scoreCalculationService.getRoundWins(),
      currentRoundResult: this.currentRoundResult,
      matchResult: this.matchResult,
      recentLogs: this.gameEventService.getRecentPublicLogs(),
    };
  }

  private buildPrivatePlayerState(playerId: string): HiddenTeamPlayerPrivate | null {
    const roleData = this.roleAssignmentService.getPlayerRoleData(playerId);
    if (!roleData) return null;

    const cards = this.cardDistributionService.getPlayerCards(playerId);
    const role2Roll = this.roleAbilityService.getRole2Eligibility(playerId);
    const isRole4 = roleData.currentRole === 'ROLE_4_INSPECTOR';
    const isRole5 = roleData.currentRole === 'ROLE_5_SELECTOR';

    const inspectedCard =
      isRole4 && this.phase === 'VOTE_MANIPULATION'
        ? this.voteManipulationService.getInspectedCard()
        : null;

    const candidateCards =
      isRole5 && this.phase === 'MAIN_CARD_SELECTION'
        ? this.mainCardService.getCandidateCards()
        : null;

    return {
      playerId,
      team: roleData.team,
      slotNumber: roleData.slotNumber,
      currentRole: roleData.currentRole,
      originalRole: roleData.originalRole,
      voteCards: cards,
      role2CanVote: role2Roll ? role2Roll.canVote : null,
      role4InspectedCard: inspectedCard,
      role5CandidateCards: candidateCards,
      hasActed: false,
      hasSubmittedVotes: this.votingService.hasPlayerSubmitted(playerId),
    };
  }

  public broadcastPublicState(): void {
    if (!this.io) return;
    const publicState = this.buildPublicGameState();
    this.io.to(this.roomId).emit('game:state', publicState);
    this.io.to(this.roomId).emit('hidden-team:state', publicState);
  }

  public broadcastPrivateStates(): void {
    if (!this.io) return;
    this.playersMap.forEach((player) => {
      if (player.socketId && !player.isBot) {
        const privateData = this.buildPrivatePlayerState(player.id);
        if (privateData) {
          this.io!.to(player.socketId).emit('hidden-team:private-state', privateData);
        }
      }
    });
  }

  private sendPrivateStateToPlayer(playerId: string): void {
    if (!this.io) return;
    const player = this.playersMap.get(playerId);
    if (player && player.socketId && !player.isBot) {
      const privateData = this.buildPrivatePlayerState(playerId);
      if (privateData) {
        this.io.to(player.socketId).emit('hidden-team:private-state', privateData);
      }
    }
  }

  // ==========================================
  // HELPERS FOR TESTING & INSPECTION
  // ==========================================
  public _getServices() {
    return {
      cardDistributionService: this.cardDistributionService,
      roleAssignmentService: this.roleAssignmentService,
      turnManagementService: this.turnManagementService,
      mainCardService: this.mainCardService,
      roleAbilityService: this.roleAbilityService,
      votingService: this.votingService,
      voteManipulationService: this.voteManipulationService,
      scoreCalculationService: this.scoreCalculationService,
      gameEventService: this.gameEventService,
    };
  }

  public _getPhase(): HiddenTeamPhase {
    return this.phase;
  }

  public _setPhase(phase: HiddenTeamPhase, timer: number = 20): void {
    this.phase = phase;
    this.phaseTimer = timer;
    this.phaseTotalTime = timer;
  }
}
