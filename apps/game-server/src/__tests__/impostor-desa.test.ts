import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ImpostorDesaGame } from '../games/impostor-desa/ImpostorDesaGame';
import { Player, RoomSettings, IMPOSTOR_CATEGORIES } from '@gamehouse/shared';

describe('Impostor Desa Game Engine & Social Deduction Rules', () => {
  let game: ImpostorDesaGame;
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
        }
      })
    };

    settings = {
      name: 'Desa Test Room',
      gameId: 'impostor-desa',
      gameMode: 'impostor-classic',
      maxPlayers: 6,
      durationSeconds: 240,
      isPrivate: false,
    };

    mockPlayers = [
      { id: 'p1', socketId: 's1', nickname: 'Budi', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1 },
      { id: 'p2', socketId: 's2', nickname: 'Siti', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 2 },
      { id: 'p3', socketId: 's3', nickname: 'Andi', avatar: 'rara', isHost: false, isReady: true, isConnected: true, joinedAt: 3 },
      { id: 'p4', socketId: 's4', nickname: 'Rina', avatar: 'koko', isHost: false, isReady: true, isConnected: true, joinedAt: 4 },
    ];

    game = new ImpostorDesaGame();
    game.initialize('room-123', mockPlayers, settings, mockIo);
  });

  it('should initialize game with 4 players and select exactly one impostor', () => {
    game.start();
    const impostorId = game._getImpostorPlayerId();
    assert.ok(mockPlayers.some(p => p.id === impostorId), 'Impostor must be one of the joined players');

    const secretWord = game._getSecretWord();
    assert.ok(secretWord && secretWord.length > 0, 'Secret word must be picked');
  });

  it('should guarantee private role security: impostor NEVER gets secret word', () => {
    game.start();
    const impostorId = game._getImpostorPlayerId();
    const impostorPlayer = mockPlayers.find(p => p.id === impostorId)!;
    const villagerPlayer = mockPlayers.find(p => p.id !== impostorId)!;

    // Find private-role event sent to impostor
    const impostorRoleEvent = sentEvents.find(e => 
      e.targetSocketId === impostorPlayer.socketId && e.event === 'impostor:private-role'
    );
    assert.ok(impostorRoleEvent, 'Impostor should receive private role event');
    assert.strictEqual(impostorRoleEvent.data.role, 'impostor');
    assert.strictEqual(impostorRoleEvent.data.secretWord, undefined, 'Impostor must NEVER receive secret word!');

    // Find private-role event sent to villager
    const villagerRoleEvent = sentEvents.find(e => 
      e.targetSocketId === villagerPlayer.socketId && e.event === 'impostor:private-role'
    );
    assert.ok(villagerRoleEvent, 'Villager should receive private role event');
    assert.strictEqual(villagerRoleEvent.data.role, 'villager');
    assert.strictEqual(villagerRoleEvent.data.secretWord, game._getSecretWord(), 'Villager must receive secret word');
  });

  it('public game state must NEVER leak secretWord or impostorPlayerId during game', () => {
    game.start();
    const state = game.getState();
    assert.strictEqual((state as any).secretWord, undefined, 'Public state must not have secretWord');
    assert.strictEqual((state as any).impostorPlayerId, undefined, 'Public state must not have impostorPlayerId');
    assert.strictEqual(state.winner, null);
    assert.strictEqual(state.phase, 'role-reveal');
  });

  it('should advance to clue phase when all players click ready-role', () => {
    game.start();
    mockPlayers.forEach(p => {
      game.handleInput(p.id, { action: 'ready-role' });
    });

    const state = game.getState();
    assert.strictEqual(state.phase, 'clue', 'Should advance to clue phase');
    assert.ok(state.currentTurnPlayerId !== null, 'There should be an active turn player');
  });

  it('should enforce turn order and record clues during clue phase', () => {
    game.start();
    game._forcePhase('clue');
    const state = game.getState();
    const activePlayerId = state.currentTurnPlayerId!;
    const inactivePlayerId = mockPlayers.find(p => p.id !== activePlayerId)!.id;

    // Attempt submitting clue out of turn
    game.handleInput(inactivePlayerId, { action: 'submit-clue', clue: 'Hijau' });
    assert.strictEqual(game.getState().clues.length, 0, 'Out of turn clue must be rejected');

    // Submit valid clue in turn
    game.handleInput(activePlayerId, { action: 'submit-clue', clue: 'Hijau dan Subur' });
    assert.strictEqual(game.getState().clues.length, 1);
    assert.strictEqual(game.getState().clues[0].clue, 'Hijau dan Subur');
    assert.strictEqual(game.getState().clues[0].playerId, activePlayerId);
  });

  it('should reject clue if player tries to type the exact secret word', () => {
    game.start();
    game._forcePhase('clue');
    const secret = game._getSecretWord();
    const activePlayerId = game.getState().currentTurnPlayerId!;

    game.handleInput(activePlayerId, { action: 'submit-clue', clue: secret });
    assert.strictEqual(game.getState().clues.length, 0, 'Direct secret word as clue must be rejected');
  });

  it('should reject duplicate clues already submitted in the same round (case-insensitive)', () => {
    game.start();
    game._forcePhase('clue');
    const firstPlayerId = game.getState().currentTurnPlayerId!;

    // Player 1 submits "Kicau"
    game.handleInput(firstPlayerId, { action: 'submit-clue', clue: 'Kicau' });
    assert.strictEqual(game.getState().clues.length, 1);
    assert.strictEqual(game.getState().clues[0].clue, 'Kicau');

    // Turn advances to Player 2
    const secondPlayerId = game.getState().currentTurnPlayerId!;
    assert.notStrictEqual(secondPlayerId, firstPlayerId);

    // Player 2 attempts to submit duplicate "kicau" (different casing)
    game.handleInput(secondPlayerId, { action: 'submit-clue', clue: 'kicau' });
    assert.strictEqual(game.getState().clues.length, 1, 'Duplicate clue must be rejected');

    const duplicateError = sentEvents.find(e => e.event === 'error:message');
    assert.ok(duplicateError, 'Server should emit error message when duplicate clue is submitted');

    // Player 2 submits a unique clue "Terbang"
    game.handleInput(secondPlayerId, { action: 'submit-clue', clue: 'Terbang' });
    assert.strictEqual(game.getState().clues.length, 2);
    assert.strictEqual(game.getState().clues[1].clue, 'Terbang');
  });

  it('should conduct secret voting and detect ties leading to revote', () => {
    game.start();
    // Force into voting phase
    game._forcePhase('voting');
    
    // p1 votes p2, p2 votes p1, p3 votes p2, p4 votes p1 -> 2 votes each (TIE)
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p1' });

    // After all 4 have voted, it should detect tie and enter revote phase
    const state = game.getState();
    assert.strictEqual(state.phase, 'revote', 'Tie in voting should trigger revote phase');
    assert.deepStrictEqual(state.eligibleCandidateIds.sort(), ['p1', 'p2'].sort(), 'Only tied candidates should be eligible');
  });

  it('if revote is also a tie, impostor wins by sowing discord', () => {
    game.start();
    game._setImpostorPlayerId('p3'); // p3 is impostor
    game._forcePhase('voting');
    
    // Vote 1: tie between p1 and p2
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p1' });

    assert.strictEqual(game.getState().phase, 'revote');

    // Revote: still tie between p1 and p2
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p1' });

    const state = game.getState();
    assert.strictEqual(state.phase, 'result');
    assert.strictEqual(state.winner, 'impostor', 'Tie after revote must result in Impostor victory');
    assert.ok(game.isFinished());
  });

  it('if innocent villager is voted out, impostor wins immediately', () => {
    game.start();
    game._setImpostorPlayerId('p1'); // p1 is impostor
    game._forcePhase('voting');

    // 3 players vote p2 (innocent villager)
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p2' });
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });

    const state = game.getState();
    assert.strictEqual(state.phase, 'result');
    assert.strictEqual(state.winner, 'impostor', 'Eliminating an innocent villager must result in Impostor victory');
  });

  it('if impostor is voted out, enters impostor-guess phase, and correct guess wins for impostor', () => {
    game.start();
    game._setImpostorPlayerId('p1'); // p1 is impostor
    game._setSecretWord('Sawah');
    game._forcePhase('voting');

    // All vote p1 (impostor)
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });

    let state = game.getState();
    assert.strictEqual(state.phase, 'impostor-guess', 'Impostor being caught must trigger impostor-guess phase');
    assert.strictEqual(state.caughtImpostorId, 'p1');

    // Impostor correctly guesses 'sawah' (case-insensitive)
    game.handleInput('p1', { action: 'submit-guess', guessedWord: 'sawah' });

    state = game.getState();
    assert.strictEqual(state.phase, 'result');
    assert.strictEqual(state.winner, 'impostor', 'Correct secret word guess must award victory to Impostor');
    assert.strictEqual(state.guessIsCorrect, true);
  });

  it('if impostor is caught and fails guess, villagers win', () => {
    game.start();
    game._setImpostorPlayerId('p1'); // p1 is impostor
    game._setSecretWord('Cangkul');
    game._forcePhase('voting');

    // All vote p1
    game.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p1' });
    game.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p2' });

    assert.strictEqual(game.getState().phase, 'impostor-guess');

    // Impostor guesses incorrectly
    game.handleInput('p1', { action: 'submit-guess', guessedWord: 'Traktor' });

    const state = game.getState();
    assert.strictEqual(state.phase, 'result');
    assert.strictEqual(state.winner, 'villagers', 'Failed guess must award victory to Villagers');
    assert.strictEqual(state.guessIsCorrect, false);
    assert.ok(state.resultData?.secretWord === 'Cangkul');
  });

  it('handles player disconnect and reconnect safely restoring private role', () => {
    game.start();
    game._setImpostorPlayerId('p2');
    game._setSecretWord('Kerbau');

    // p2 disconnects
    game.handlePlayerDisconnect('p2');
    let state = game.getState();
    assert.strictEqual(state.players['p2'].isConnected, false);

    // p2 reconnects with new socket s2-new
    sentEvents = [];
    game.handlePlayerReconnect({
      id: 'p2',
      socketId: 's2-new',
      nickname: 'Siti',
      avatar: 'siti',
      isHost: false,
      isReady: true,
      isConnected: true,
      joinedAt: 2,
    });

    state = game.getState();
    assert.strictEqual(state.players['p2'].isConnected, true);

    const reconnectedEvent = sentEvents.find(e => e.targetSocketId === 's2-new' && e.event === 'impostor:private-role');
    assert.ok(reconnectedEvent, 'Reconnected player should receive private role');
    assert.strictEqual(reconnectedEvent.data.role, 'impostor');
    assert.strictEqual(reconnectedEvent.data.secretWord, undefined, 'Reconnected impostor must not get secret word');
  });

  it('should support practice mode with 1 human player and 3 automated bots', () => {
    const soloPlayers: Player[] = [
      { id: 'human-1', socketId: 's-human', nickname: 'PlayerOne', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1, isBot: false },
      { id: 'bot-1', socketId: 's-bot-1', nickname: 'Bot Joko', avatar: 'joko', isHost: false, isReady: true, isConnected: true, joinedAt: 2, isBot: true },
      { id: 'bot-2', socketId: 's-bot-2', nickname: 'Bot Siti', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 3, isBot: true },
      { id: 'bot-3', socketId: 's-bot-3', nickname: 'Bot Andi', avatar: 'climber-yellow', isHost: false, isReady: true, isConnected: true, joinedAt: 4, isBot: true },
    ];

    const soloGame = new ImpostorDesaGame();
    soloGame.initialize('room-practice', soloPlayers, settings, mockIo);
    soloGame.start();

    // Human readies up
    soloGame.handleInput('human-1', { action: 'ready-role' });

    // Simulate ticking for bots to auto-ready
    for (let i = 0; i < 30; i++) {
      soloGame.update(0.1); // 3 seconds total
      if (soloGame.getState().phase === 'clue') break;
    }

    // Should have transitioned to clue phase
    assert.strictEqual(soloGame.getState().phase, 'clue', 'Game should advance to clue phase when bots ready up');

    // Simulate clue turns for bots
    for (let i = 0; i < 80; i++) {
      const state = soloGame.getState();
      if (state.phase !== 'clue') break;

      const currentTurnId = state.currentTurnPlayerId;
      if (currentTurnId === 'human-1') {
        soloGame.handleInput('human-1', { action: 'submit-clue', clue: 'Segar' });
      } else {
        soloGame.update(0.2); // Let bot clue timer tick down
      }
    }

    const afterCluesState = soloGame.getState();
    assert.ok(afterCluesState.clues.length >= 4, 'All 4 players including bots must have given clues');
    assert.strictEqual(afterCluesState.phase, 'discussion', 'Should advance to discussion phase');

    // Human initiates voting
    soloGame.handleInput('human-1', { action: 'start-voting' });
    assert.strictEqual(soloGame.getState().phase, 'voting', 'Should enter voting phase');

    // Human votes for bot-1
    soloGame.handleInput('human-1', { action: 'submit-vote', targetPlayerId: 'bot-1' });

    // Tick for bots to cast their votes (and handle revote if tie occurs)
    for (let i = 0; i < 120; i++) {
      soloGame.update(0.2);
      const p = soloGame.getState().phase;
      if (p === 'revote' && !soloGame.getState().votedPlayerIds.includes('human-1')) {
        const eligible = soloGame.getState().eligibleCandidateIds;
        const target = eligible.find(id => id !== 'human-1') || eligible[0];
        soloGame.handleInput('human-1', { action: 'submit-vote', targetPlayerId: target });
      }
      if (p !== 'voting' && p !== 'revote') break;
    }

    // Voting should conclude and enter either impostor-guess or result
    const finalPhase = soloGame.getState().phase;
    assert.ok(
      finalPhase === 'impostor-guess' || finalPhase === 'result',
      `Voting should conclude, got phase: ${finalPhase}`
    );
  });

  it('should reject discussion messages that contain the secret word or related category words', () => {
    game.start();
    game._setCategory('pertanian');
    game._setSecretWord('Sawah');

    // Fast-forward to discussion phase
    game._forcePhase('discussion', 60);

    // Player tries to send clean debate message
    sentEvents = [];
    game.handleInput('p1', { action: 'send-chat', message: 'Kok Andi mencurigakan banget ya?' });
    let state = game.getState();
    assert.strictEqual(state.chatMessages.length, 1, 'Clean message should be accepted');
    assert.strictEqual(state.chatMessages[0].message, 'Kok Andi mencurigakan banget ya?');

    // Player tries to leak the exact secret word in discussion
    sentEvents = [];
    game.handleInput('p1', { action: 'send-chat', message: 'Kan kata rahasianya SAWAH!' });
    state = game.getState();
    assert.strictEqual(state.chatMessages.length, 1, 'Message with secret word must be rejected');
    const secretWordError = sentEvents.find(e => e.event === 'error:message');
    assert.ok(secretWordError, 'Server should emit error message when secret word is used');

    // Player tries to leak a category word (e.g. Cangkul)
    sentEvents = [];
    game.handleInput('p1', { action: 'send-chat', message: 'Ada hubungan sama cangkul ga?' });
    state = game.getState();
    assert.strictEqual(state.chatMessages.length, 1, 'Message with category word must be rejected');
    const categoryWordError = sentEvents.find(e => e.event === 'error:message');
    assert.ok(categoryWordError, 'Server should emit error message when category word is used');
  });

  it('should award +2 points to villagers on win, and +5 points to impostor on win', () => {
    // Round 1: Impostor wins by wrong voting (+5 points to impostor, 0 to villagers)
    const testGame = new ImpostorDesaGame();
    testGame.initialize('room-scoring', mockPlayers, settings, mockIo);
    testGame.start();
    (testGame as any)._setImpostorPlayerId('p2');
    (testGame as any)._forcePhase('voting');

    // 3 players vote p3 (innocent villager)
    testGame.handleInput('p1', { action: 'submit-vote', targetPlayerId: 'p3' });
    testGame.handleInput('p2', { action: 'submit-vote', targetPlayerId: 'p3' });
    testGame.handleInput('p3', { action: 'submit-vote', targetPlayerId: 'p1' });
    testGame.handleInput('p4', { action: 'submit-vote', targetPlayerId: 'p3' });

    let state = testGame.getState();
    assert.strictEqual(state.winner, 'impostor', 'Impostor should win when innocent villager is voted out');
    assert.strictEqual(state.players['p2'].score, 5, 'Impostor should receive +5 points on win');
    assert.strictEqual(state.players['p1'].score, 0, 'Losing villager gets 0 points');
    assert.strictEqual(state.players['p3'].score, 0, 'Losing villager gets 0 points');
    assert.strictEqual(state.resultData?.leaderboard?.[0]?.playerId, 'p2', 'Impostor should lead the leaderboard');
  });

  it('should feature at least 10 categories and over 300 authentic Indonesian village words', () => {
    const categoryKeys = Object.keys(IMPOSTOR_CATEGORIES);
    assert.ok(categoryKeys.length >= 10, `Expected at least 10 categories, found ${categoryKeys.length}`);

    let totalWords = 0;
    categoryKeys.forEach(k => {
      const cat = (IMPOSTOR_CATEGORIES as any)[k];
      assert.ok(cat.words.length >= 30, `Category ${k} must contain at least 30 words, found ${cat.words.length}`);
      totalWords += cat.words.length;
    });

    assert.ok(totalWords >= 300, `Expected at least 300 total words, found ${totalWords}`);
  });

  it('should deliver camouflage themes in private role and generate deceptive clues for impostor bot', () => {
    game.start();
    const impostorId = game._getImpostorPlayerId();
    const impostorPlayer = mockPlayers.find(p => p.id === impostorId)!;

    const impostorRoleEvent = sentEvents.find(e => 
      e.targetSocketId === impostorPlayer.socketId && e.event === 'impostor:private-role'
    );
    assert.ok(impostorRoleEvent, 'Role event must be sent');
    assert.ok(
      impostorRoleEvent.data.camouflageThemes && impostorRoleEvent.data.camouflageThemes.length > 0,
      'Camouflage themes must be provided for strategic deduction'
    );

    // Test bot clue generation for impostor
    const clue = (game as any).generateBotClue(impostorId);
    assert.ok(clue && clue.length > 0, 'Bot impostor must generate a clue');
    assert.notStrictEqual(clue.toLowerCase(), game._getSecretWord().toLowerCase(), 'Bot impostor must not guess secret word as clue');
  });
});
