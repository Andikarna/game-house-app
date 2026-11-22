import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HiddenTeamGame } from '../games/hidden-team/HiddenTeamGame';
import { Room } from '../rooms/Room';
import {
  Player,
  RoomSettings,
  VoteCard,
  MainCard,
  HiddenTeamFaction,
  HiddenTeamRole,
} from '@gamehouse/shared';

describe('Hidden Team: Secret Role Game Engine & Rules', () => {
  let game: HiddenTeamGame;
  let mockPlayers: Player[];
  let settings: RoomSettings;
  let sentEvents: Array<{ targetSocketId: string; event: string; data: any }>;
  let mockIo: any;

  beforeEach(() => {
    sentEvents = [];
    mockIo = {
      to: (target: string) => ({
        emit: (event: string, data: any) => {
          sentEvents.push({ targetSocketId: target, event, data });
        },
      }),
    };

    settings = {
      name: 'Hidden Team Council',
      gameId: 'hidden-team',
      gameMode: 'hidden-team-5r',
      maxPlayers: 6,
      durationSeconds: 600,
      isPrivate: false,
    };

    mockPlayers = [
      { id: 'p1', socketId: 's1', nickname: 'Alice', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1 },
      { id: 'p2', socketId: 's2', nickname: 'Bob', avatar: 'ujang', isHost: false, isReady: true, isConnected: true, joinedAt: 2 },
      { id: 'p3', socketId: 's3', nickname: 'Charlie', avatar: 'rara', isHost: false, isReady: true, isConnected: true, joinedAt: 3 },
      { id: 'p4', socketId: 's4', nickname: 'Diana', avatar: 'koko', isHost: false, isReady: true, isConnected: true, joinedAt: 4 },
      { id: 'p5', socketId: 's5', nickname: 'Evan', avatar: 'jaya', isHost: false, isReady: true, isConnected: true, joinedAt: 5 },
      { id: 'p6', socketId: 's6', nickname: 'Fiona', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 6 },
    ];

    game = new HiddenTeamGame();
    game.initialize('room-ht-101', mockPlayers, settings, mockIo);
  });

  // ==========================================
  // MATCH INITIALIZATION TESTS
  // ==========================================
  describe('Match Initialization & Core Invariants', () => {
    it('requires exactly 6 players to initialize match', () => {
      const g = new HiddenTeamGame();
      assert.throws(() => {
        g.initialize('room-err', mockPlayers.slice(0, 5), settings, mockIo);
      }, /requires exactly 6 players/);
    });

    it('assigns 3 independent teams (2 RED, 2 BLUE, 2 NEUTRAL)', () => {
      game.start();
      const services = game._getServices();
      const allData = services.roleAssignmentService.getAllPlayerData();

      assert.strictEqual(allData.length, 6);
      const teamCounts: Record<HiddenTeamFaction, number> = { RED: 0, BLUE: 0, NEUTRAL: 0 };
      allData.forEach((p) => {
        teamCounts[p.team]++;
      });

      assert.strictEqual(teamCounts.RED, 2, 'Must have exactly 2 RED players');
      assert.strictEqual(teamCounts.BLUE, 2, 'Must have exactly 2 BLUE players');
      assert.strictEqual(teamCounts.NEUTRAL, 2, 'Must have exactly 2 NEUTRAL players');
    });

    it('assigns 6 unique role abilities with fixed turn slots 1-6', () => {
      game.start();
      const services = game._getServices();
      const allData = services.roleAssignmentService.getAllPlayerData();

      const roles = new Set<HiddenTeamRole>();
      const slots = new Set<number>();

      allData.forEach((p) => {
        roles.add(p.currentRole);
        slots.add(p.slotNumber);
      });

      assert.strictEqual(roles.size, 6, 'Must have exactly 6 unique roles');
      assert.strictEqual(slots.size, 6, 'Must have slots 1 to 6');
      for (let s = 1; s <= 6; s++) {
        assert.ok(slots.has(s), `Slot ${s} must be present`);
      }
    });

    it('distributes 3 Vote Cards to each player every round', () => {
      game.start();
      const services = game._getServices();
      mockPlayers.forEach((p) => {
        const cards = services.cardDistributionService.getPlayerCards(p.id);
        assert.strictEqual(cards.length, 3, 'Each player must receive exactly 3 cards');
      });
    });
  });

  // ==========================================
  // ROLE 1: ROLE ABILITY SWAPPER
  // ==========================================
  describe('ROLE 1 — Role Ability Swapper', () => {
    it('swaps abilities between two players while preserving their fixed turn slots', () => {
      const services = game._getServices();
      services.roleAssignmentService.overrideAssignments([
        { playerId: 'p1', slotNumber: 1, team: 'RED', role: 'ROLE_1_SWAPPER' },
        { playerId: 'p2', slotNumber: 2, team: 'RED', role: 'ROLE_2_ROLLER' },
        { playerId: 'p3', slotNumber: 3, team: 'BLUE', role: 'ROLE_3_MULTIPLIER' },
        { playerId: 'p4', slotNumber: 4, team: 'BLUE', role: 'ROLE_4_INSPECTOR' },
        { playerId: 'p5', slotNumber: 5, team: 'NEUTRAL', role: 'ROLE_5_SELECTOR' },
        { playerId: 'p6', slotNumber: 6, team: 'NEUTRAL', role: 'ROLE_6_CARD_SWAPPER' },
      ]);

      const slot1Before = services.roleAssignmentService.getPlayerRoleData('p1')!;
      const slot3Before = services.roleAssignmentService.getPlayerRoleData('p3')!;
      assert.strictEqual(slot1Before.currentRole, 'ROLE_1_SWAPPER');
      assert.strictEqual(slot3Before.currentRole, 'ROLE_3_MULTIPLIER');

      // P1 executes Role 1 ability swapping P1 and P3
      const res = services.roleAbilityService.executeAction('p1', {
        action: 'role_1_swap',
        targetPlayerIdA: 'p1',
        targetPlayerIdB: 'p3',
      });
      assert.strictEqual(res.success, true);

      const slot1After = services.roleAssignmentService.getPlayerRoleData('p1')!;
      const slot3After = services.roleAssignmentService.getPlayerRoleData('p3')!;

      // Abilities exchanged
      assert.strictEqual(slot1After.currentRole, 'ROLE_3_MULTIPLIER');
      assert.strictEqual(slot3After.currentRole, 'ROLE_1_SWAPPER');

      // Fixed turn slots remain completely unchanged!
      assert.strictEqual(slot1After.slotNumber, 1);
      assert.strictEqual(slot3After.slotNumber, 3);
    });

    it('subsequent turn slots use the updated ability ownership after swap', () => {
      const services = game._getServices();
      services.roleAssignmentService.overrideAssignments([
        { playerId: 'p1', slotNumber: 1, team: 'RED', role: 'ROLE_1_SWAPPER' },
        { playerId: 'p2', slotNumber: 2, team: 'RED', role: 'ROLE_6_CARD_SWAPPER' },
        { playerId: 'p3', slotNumber: 3, team: 'BLUE', role: 'ROLE_3_MULTIPLIER' },
        { playerId: 'p4', slotNumber: 4, team: 'BLUE', role: 'ROLE_4_INSPECTOR' },
        { playerId: 'p5', slotNumber: 5, team: 'NEUTRAL', role: 'ROLE_5_SELECTOR' },
        { playerId: 'p6', slotNumber: 6, team: 'NEUTRAL', role: 'ROLE_2_ROLLER' },
      ]);

      // Slot 1 swaps P2 (Role 6) and P3 (Role 3)
      services.roleAbilityService.executeAction('p1', {
        action: 'role_1_swap',
        targetPlayerIdA: 'p2',
        targetPlayerIdB: 'p3',
      });

      // Now P2 has ROLE_3_MULTIPLIER and P3 has ROLE_6_CARD_SWAPPER
      assert.strictEqual(services.roleAssignmentService.getCurrentRole('p2'), 'ROLE_3_MULTIPLIER');
      assert.strictEqual(services.roleAssignmentService.getCurrentRole('p3'), 'ROLE_6_CARD_SWAPPER');

      // At Slot 2, P2 can now execute Role 3 ability!
      const p2ActionRes = services.roleAbilityService.executeAction('p2', {
        action: 'role_3_multiply',
        targetPlayerId: 'p4',
      });
      assert.strictEqual(p2ActionRes.success, true);
      assert.strictEqual(services.roleAbilityService.getRole3Bonus()?.targetPlayerId, 'p4');

      // P2 cannot execute Role 6 anymore
      const p2OldAction = services.roleAbilityService.executeAction('p2', {
        action: 'role_6_swap_cards',
        targetPlayerIdA: 'p1',
        targetPlayerIdB: 'p2',
      });
      assert.strictEqual(p2OldAction.success, false);
    });

    it('prevents swapping a player with themselves', () => {
      const services = game._getServices();
      services.roleAssignmentService.overrideAssignments([
        { playerId: 'p1', slotNumber: 1, team: 'RED', role: 'ROLE_1_SWAPPER' },
        { playerId: 'p2', slotNumber: 2, team: 'RED', role: 'ROLE_2_ROLLER' },
        { playerId: 'p3', slotNumber: 3, team: 'BLUE', role: 'ROLE_3_MULTIPLIER' },
        { playerId: 'p4', slotNumber: 4, team: 'BLUE', role: 'ROLE_4_INSPECTOR' },
        { playerId: 'p5', slotNumber: 5, team: 'NEUTRAL', role: 'ROLE_5_SELECTOR' },
        { playerId: 'p6', slotNumber: 6, team: 'NEUTRAL', role: 'ROLE_6_CARD_SWAPPER' },
      ]);

      const res = services.roleAbilityService.executeAction('p1', {
        action: 'role_1_swap',
        targetPlayerIdA: 'p2',
        targetPlayerIdB: 'p2',
      });
      assert.strictEqual(res.success, false);
      assert.match(res.error!, /distinct/);
    });
  });

  // ==========================================
  // ROLE 2: VOTING ELIGIBILITY ROLLER
  // ==========================================
  describe('ROLE 2 — Voting Eligibility Roller', () => {
    it('determines voting eligibility privately and resets next round', () => {
      const services = game._getServices();
      services.roleAssignmentService.overrideAssignments([
        { playerId: 'p1', slotNumber: 1, team: 'RED', role: 'ROLE_2_ROLLER' },
        { playerId: 'p2', slotNumber: 2, team: 'RED', role: 'ROLE_1_SWAPPER' },
        { playerId: 'p3', slotNumber: 3, team: 'BLUE', role: 'ROLE_3_MULTIPLIER' },
        { playerId: 'p4', slotNumber: 4, team: 'BLUE', role: 'ROLE_4_INSPECTOR' },
        { playerId: 'p5', slotNumber: 5, team: 'NEUTRAL', role: 'ROLE_5_SELECTOR' },
        { playerId: 'p6', slotNumber: 6, team: 'NEUTRAL', role: 'ROLE_6_CARD_SWAPPER' },
      ]);

      services.cardDistributionService.distributeRoundCards(mockPlayers.map((p) => p.id));

      // Force Role 2 canVote = false
      services.roleAbilityService.overrideRole2Eligibility('p1', false);
      assert.strictEqual(services.roleAbilityService.isPlayerEligibleToVote('p1'), false);

      // Ineligible player cannot submit vote cards
      const submitRes = services.votingService.submitVotes('p1');
      assert.strictEqual(submitRes.success, false);
      assert.match(submitRes.error!, /not eligible/);

      // Other players remain eligible
      assert.strictEqual(services.roleAbilityService.isPlayerEligibleToVote('p2'), true);

      // Reset round clears eligibility
      services.roleAbilityService.resetRound();
      // When re-rolled, eligibility can change
      services.roleAbilityService.overrideRole2Eligibility('p1', true);
      assert.strictEqual(services.roleAbilityService.isPlayerEligibleToVote('p1'), true);
      const submitRes2 = services.votingService.submitVotes('p1');
      assert.strictEqual(submitRes2.success, true);
    });
  });

  // ==========================================
  // ROLE 3: VOTE MULTIPLIER
  // ==========================================
  describe('ROLE 3 — Vote Multiplier', () => {
    it('applies bonus weight to target player without modifying original cards', () => {
      const services = game._getServices();
      services.roleAssignmentService.overrideAssignments([
        { playerId: 'p1', slotNumber: 1, team: 'RED', role: 'ROLE_3_MULTIPLIER' },
        { playerId: 'p2', slotNumber: 2, team: 'RED', role: 'ROLE_1_SWAPPER' },
        { playerId: 'p3', slotNumber: 3, team: 'BLUE', role: 'ROLE_2_ROLLER' },
        { playerId: 'p4', slotNumber: 4, team: 'BLUE', role: 'ROLE_4_INSPECTOR' },
        { playerId: 'p5', slotNumber: 5, team: 'NEUTRAL', role: 'ROLE_5_SELECTOR' },
        { playerId: 'p6', slotNumber: 6, team: 'NEUTRAL', role: 'ROLE_6_CARD_SWAPPER' },
      ]);

      services.cardDistributionService.distributeRoundCards(mockPlayers.map((p) => p.id));
      const p2Cards = services.cardDistributionService.getPlayerCards('p2');

      // Role 3 targets P2
      const actionRes = services.roleAbilityService.executeAction('p1', {
        action: 'role_3_multiply',
        targetPlayerId: 'p2',
      });
      assert.strictEqual(actionRes.success, true);

      // Original cards of P2 are not modified
      const p2CardsAfter = services.cardDistributionService.getPlayerCards('p2');
      assert.deepStrictEqual(p2Cards, p2CardsAfter);

      // Stored separately
      const bonus = services.roleAbilityService.getRole3Bonus();
      assert.ok(bonus);
      assert.strictEqual(bonus.targetPlayerId, 'p2');
      assert.strictEqual(bonus.bonusWeightPerCard, 1);
    });
  });

  // ==========================================
  // ROLE 4: VOTE INSPECTOR
  // ==========================================
  describe('ROLE 4 — Vote Inspector', () => {
    it('randomly selects 1 submitted card; KEEP preserves it, DISCARD removes it', () => {
      const services = game._getServices();
      const cardA: VoteCard = { id: 'c1', faction: 'RED', title: 'T1', description: 'D1' };
      const cardB: VoteCard = { id: 'c2', faction: 'BLUE', title: 'T2', description: 'D2' };

      services.votingService.setTestSubmission('p1', [cardA]);
      services.votingService.setTestSubmission('p2', [cardB]);

      // Server prepares random inspection
      const inspected = services.voteManipulationService.prepareRandomInspection(services.votingService);
      assert.ok(inspected);
      assert.ok(['c1', 'c2'].includes(inspected.id));

      // Test KEEP
      services.voteManipulationService.submitDecision('KEEP');
      assert.strictEqual(services.voteManipulationService.getDiscardedCard(), null);

      // Test DISCARD
      services.voteManipulationService.submitDecision('DISCARD');
      const discarded = services.voteManipulationService.getDiscardedCard();
      assert.ok(discarded);
      assert.strictEqual(discarded.id, inspected.id);
    });
  });

  // ==========================================
  // ROLE 5: MAIN CARD SELECTOR
  // ==========================================
  describe('ROLE 5 — Main Card Selector', () => {
    it('generates 2 candidate cards and locks the chosen card with hidden flag', () => {
      const services = game._getServices();
      const candidates = services.mainCardService.generateRoundCandidates();
      assert.strictEqual(candidates.length, 2);

      const chosen = candidates[0];
      const selectRes = services.mainCardService.selectMainCard(chosen.id);
      assert.strictEqual(selectRes.success, true);

      const active = services.mainCardService.getActiveMainCard();
      assert.strictEqual(active?.id, chosen.id);

      // Public card has teamFlag hidden!
      const publicCard = services.mainCardService.getPublicActiveMainCard();
      assert.strictEqual((publicCard as any).teamFlag, undefined, 'Public card must NOT leak team flag before reveal');
    });
  });

  // ==========================================
  // ROLE 6: FULL VOTE CARD SWAPPER
  // ==========================================
  describe('ROLE 6 — Full Vote Card Swapper', () => {
    it('atomically swaps all 3 Vote Cards between two players without card loss or duplicate', () => {
      const services = game._getServices();
      const cardsA: VoteCard[] = [
        { id: 'ca1', faction: 'RED', title: 'A1', description: '' },
        { id: 'ca2', faction: 'RED', title: 'A2', description: '' },
        { id: 'ca3', faction: 'BLUE', title: 'A3', description: '' },
      ];
      const cardsB: VoteCard[] = [
        { id: 'cb1', faction: 'NEUTRAL', title: 'B1', description: '' },
        { id: 'cb2', faction: 'NEUTRAL', title: 'B2', description: '' },
        { id: 'cb3', faction: 'NEUTRAL', title: 'B3', description: '' },
      ];

      services.cardDistributionService.setPlayerCards('p1', cardsA);
      services.cardDistributionService.setPlayerCards('p2', cardsB);

      const swapRes = services.cardDistributionService.swapAllVoteCards('p1', 'p2');
      assert.strictEqual(swapRes.success, true);

      const newCardsA = services.cardDistributionService.getPlayerCards('p1');
      const newCardsB = services.cardDistributionService.getPlayerCards('p2');

      assert.strictEqual(newCardsA.length, 3);
      assert.strictEqual(newCardsB.length, 3);

      assert.deepStrictEqual(newCardsA, cardsB);
      assert.deepStrictEqual(newCardsB, cardsA);
    });
  });

  // ==========================================
  // SCORING & RESOLUTION TESTS
  // ==========================================
  describe('Authoritative Scoring Engine & Win Rules', () => {
    it('awards +1 round win only if matching team has strictly higher vote count', () => {
      const services = game._getServices();
      const mainCard: MainCard = {
        id: 'mc_test',
        title: 'Ujian Mandat Merah',
        scenario: 'Skenario',
        teamFlag: 'RED',
        description: 'Desc',
        illustration: '⚔️',
        roundObjective: 'Win Red',
      };

      // Player 1 submits 2 RED, 1 BLUE
      services.votingService.setTestSubmission('p1', [
        { id: 'c1', faction: 'RED', title: '', description: '' },
        { id: 'c2', faction: 'RED', title: '', description: '' },
        { id: 'c3', faction: 'BLUE', title: '', description: '' },
      ]);
      // Player 2 submits 1 RED, 2 BLUE
      services.votingService.setTestSubmission('p2', [
        { id: 'c4', faction: 'RED', title: '', description: '' },
        { id: 'c5', faction: 'BLUE', title: '', description: '' },
        { id: 'c6', faction: 'BLUE', title: '', description: '' },
      ]);

      // Total RED = 3, BLUE = 3, NEUTRAL = 0 -> Tied! No win
      const resTied = services.scoreCalculationService.resolveRound(
        1,
        mainCard,
        services.votingService,
        services.roleAbilityService,
        services.voteManipulationService
      );
      assert.strictEqual(resTied.winningTeam, null, 'Tied vote cannot award round win');
      assert.strictEqual(services.scoreCalculationService.getRoundWins().RED, 0);

      // Now add Role 3 bonus to P1 (+1 per card from P1 -> +2 RED, +1 BLUE)
      // New totals: RED = 3 + 2 = 5, BLUE = 3 + 1 = 4. RED is strictly higher!
      services.roleAbilityService.overrideRole3Bonus('p1', 1);

      const resWin = services.scoreCalculationService.resolveRound(
        2,
        mainCard,
        services.votingService,
        services.roleAbilityService,
        services.voteManipulationService
      );
      assert.strictEqual(resWin.winningTeam, 'RED');
      assert.strictEqual(services.scoreCalculationService.getRoundWins().RED, 1);
    });

    it('allows Neutral team to win independently under identical rules', () => {
      const services = game._getServices();
      const neutralCard: MainCard = {
        id: 'mc_neu',
        title: 'Mandat Netral',
        scenario: 'Skenario Netral',
        teamFlag: 'NEUTRAL',
        description: 'Desc',
        illustration: '⚖️',
        roundObjective: 'Win Neutral',
      };

      services.votingService.setTestSubmission('p1', [
        { id: 'cn1', faction: 'NEUTRAL', title: '', description: '' },
        { id: 'cn2', faction: 'NEUTRAL', title: '', description: '' },
        { id: 'cn3', faction: 'NEUTRAL', title: '', description: '' },
      ]);

      const res = services.scoreCalculationService.resolveRound(
        1,
        neutralCard,
        services.votingService,
        services.roleAbilityService,
        services.voteManipulationService
      );
      assert.strictEqual(res.winningTeam, 'NEUTRAL');
      assert.strictEqual(services.scoreCalculationService.getRoundWins().NEUTRAL, 1);
    });

    it('resolves match winner by highest round wins, returning DRAW if tied', () => {
      const services = game._getServices();
      // Draw scenario: RED 2, BLUE 2, NEUTRAL 1
      services.scoreCalculationService.overrideRoundWins({ RED: 2, BLUE: 2, NEUTRAL: 1 });
      const drawMatch = services.scoreCalculationService.resolveMatch(5, services.roleAssignmentService);
      assert.strictEqual(drawMatch.winner, 'DRAW');

      // Clear winner: RED 3, BLUE 1, NEUTRAL 1
      services.scoreCalculationService.overrideRoundWins({ RED: 3, BLUE: 1, NEUTRAL: 1 });
      const redWinMatch = services.scoreCalculationService.resolveMatch(5, services.roleAssignmentService);
      assert.strictEqual(redWinMatch.winner, 'RED');
    });
  });

  // ==========================================
  // SECURITY & INFORMATION LEAK TESTS
  // ==========================================
  describe('Private Information Security', () => {
    it('public state never leaks team identities or secret roles during match', () => {
      game.start();
      const publicState = game.getState();

      // Check all players in public state
      Object.values(publicState.players).forEach((p) => {
        assert.strictEqual((p as any).team, undefined, 'Public player state must never expose team');
        assert.strictEqual((p as any).currentRole, undefined, 'Public player state must never expose current role');
        assert.strictEqual((p as any).originalRole, undefined, 'Public player state must never expose original role');
        assert.strictEqual((p as any).voteCards, undefined, 'Public player state must never expose vote cards');
      });
    });

    it('private state delivers only individual player secrets', () => {
      game.start();
      // Inspect private-state events emitted to sockets
      const privateEvents = sentEvents.filter((e) => e.event === 'hidden-team:private-state');
      assert.ok(privateEvents.length >= 6, 'Must emit private states');
      const uniqueTargets = new Set(privateEvents.map((e) => e.targetSocketId));
      assert.strictEqual(uniqueTargets.size, 6, 'All 6 players must receive their private state');

      // The latest event for each player (after round starts) must have 3 cards, secret team, and role
      const latestEvents = new Map<string, any>();
      privateEvents.forEach((evt) => {
        latestEvents.set(evt.targetSocketId, evt.data);
      });

      latestEvents.forEach((data) => {
        assert.ok(['RED', 'BLUE', 'NEUTRAL'].includes(data.team));
        assert.ok(data.currentRole);
        assert.strictEqual(data.voteCards.length, 3, 'Must have 3 vote cards in round');
      });
    });
  });

  // ==========================================
  // FULL SIMULATIONS: 4, 5, 6 ROUNDS
  // ==========================================
  describe('Full Match Simulations (4, 5, and 6 rounds)', () => {
    [4, 5, 6].forEach((roundsCount) => {
      it(`completes a full automated match simulation for ${roundsCount} rounds`, () => {
        const simGame = new HiddenTeamGame();
        const simSettings: RoomSettings = {
          name: `Sim ${roundsCount} Rounds`,
          gameId: 'hidden-team',
          gameMode: roundsCount === 4 ? 'hidden-team-4r' : roundsCount === 6 ? 'hidden-team-6r' : 'hidden-team-5r',
          maxPlayers: 6,
          durationSeconds: 600,
          isPrivate: false,
        };

        // All 6 are bots for automated full simulation
        const simBots: Player[] = mockPlayers.map((p) => ({ ...p, isBot: true }));
        simGame.initialize('room-sim', simBots, simSettings, mockIo);
        simGame.start();

        // Simulate ticks until finished
        const dt = 1.0;
        let iterations = 0;
        const maxIterations = 3000;

        while (!simGame.isFinished() && iterations < maxIterations) {
          simGame.update(dt);
          iterations++;
        }

        assert.strictEqual(simGame.isFinished(), true, `Match should finish within ${maxIterations} ticks`);
        const finalState = simGame.getState();
        assert.strictEqual(finalState.phase, 'MATCH_FINISHED');
        assert.ok(finalState.matchResult);
        assert.strictEqual(finalState.matchResult.totalRounds, roundsCount);
        assert.ok(['RED', 'BLUE', 'NEUTRAL', 'DRAW'].includes(finalState.matchResult.winner));
        assert.strictEqual(finalState.matchResult.playerIdentities.length, 6);
      });
    });
  });

  describe('Solo Play & Bot Automation (1 Human + 5 Bots)', () => {
    it('allows a single human player to fill 5 bots in the lobby and start game', () => {
      const hostPlayer: Player = {
        id: 'p1',
        socketId: 's1',
        nickname: 'SoloCommander',
        avatar: 'budi',
        isHost: true,
        isReady: true,
        isConnected: true,
        joinedAt: Date.now(),
      };
      const room = new Room('room-test', 'TEST1', hostPlayer, settings, mockIo);

      assert.strictEqual(room.players.size, 1);
      // Can't start with only 1 player in hidden team (requires 6)
      const initialCheck = room.canStartGame('p1');
      assert.strictEqual(initialCheck.canStart, false);

      // Fill bots to reach exactly 6 players
      const fillRes = room.fillBots();
      assert.strictEqual(fillRes.added, 5);
      assert.strictEqual(room.players.size, 6);

      // Verify bots are ready
      const allReady = Array.from(room.players.values()).every(
        (p) => p.isHost || p.isReady
      );
      assert.strictEqual(allReady, true);

      // Now host can start game
      const readyCheck = room.canStartGame('p1');
      assert.strictEqual(readyCheck.canStart, true);
    });

    it('runs smoothly with 1 human and 5 bots, bots acting automatically on their turns', () => {
      const soloGame = new HiddenTeamGame();
      const soloPlayers: Player[] = [
        { id: 'human-1', socketId: 's-human', nickname: 'SoloMaster', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1, isBot: false },
        { id: 'bot-1', socketId: 's-b1', nickname: 'Bot Alpha', avatar: 'joko', isHost: false, isReady: true, isConnected: true, joinedAt: 2, isBot: true },
        { id: 'bot-2', socketId: 's-b2', nickname: 'Bot Beta', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 3, isBot: true },
        { id: 'bot-3', socketId: 's-b3', nickname: 'Bot Gamma', avatar: 'wati', isHost: false, isReady: true, isConnected: true, joinedAt: 4, isBot: true },
        { id: 'bot-4', socketId: 's-b4', nickname: 'Bot Delta', avatar: 'agus', isHost: false, isReady: true, isConnected: true, joinedAt: 5, isBot: true },
        { id: 'bot-5', socketId: 's-b5', nickname: 'Bot Epsilon', avatar: 'budi', isHost: false, isReady: true, isConnected: true, joinedAt: 6, isBot: true },
      ];

      soloGame.initialize('room-solo', soloPlayers, settings, mockIo);
      soloGame.start();

      let state = soloGame.getState();
      assert.strictEqual(state.phase, 'MAIN_CARD_SELECTION');

      // If human is Role 5, human selects main card. If bot is Role 5, bot will auto-select on tick.
      const role5Player = soloGame['roleAssignmentService'].getPlayerWithRole('ROLE_5_SELECTOR');
      if (role5Player === 'human-1') {
        const candidates = soloGame['mainCardService'].getCandidateCards();
        soloGame.handleInput('human-1', { action: 'role_5_select', selectedCardId: candidates[0].id });
      } else {
        // Tick until bot auto-selects
        soloGame.update(2.0);
      }

      state = soloGame.getState();
      assert.strictEqual(state.phase, 'ACTION_PHASE');

      // In Action Phase, let ticks process bot slots. If human's slot comes up, human passes or acts.
      for (let step = 0; step < 20; step++) {
        state = soloGame.getState();
        if (state.phase !== 'ACTION_PHASE') break;

        const currentSlotPlayerId = soloGame['turnManagementService'].getCurrentPlayerId();
        if (currentSlotPlayerId === 'human-1') {
          soloGame.handleInput('human-1', { action: 'pass' });
        } else {
          soloGame.update(2.0);
        }
      }

      state = soloGame.getState();
      assert.strictEqual(state.phase, 'VOTING_SUBMISSION');

      // Human submits vote
      if (soloGame['roleAbilityService'].isPlayerEligibleToVote('human-1')) {
        const humanCards = soloGame['cardDistributionService'].getPlayerCards('human-1').map((c) => c.id);
        soloGame.handleInput('human-1', { action: 'submit_votes', cardIds: humanCards });
      }

      // Ticks for bots to submit votes and manipulate
      for (let step = 0; step < 10; step++) {
        state = soloGame.getState();
        if (state.phase !== 'VOTING_SUBMISSION') break;
        soloGame.update(2.0);
      }

      state = soloGame.getState();
      assert.ok(
        ['VOTE_MANIPULATION', 'ROUND_RESOLUTION'].includes(state.phase),
        `Expected state to reach manipulation or resolution, got: ${state.phase}`
      );
    });
  });
});
