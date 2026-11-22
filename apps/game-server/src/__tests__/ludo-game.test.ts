import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LudoGame } from '../games/ludo/LudoGame';
import { Player, RoomSettings } from '@gamehouse/shared';

describe('Ludo Game Engine & Rules', () => {
  const mockIo: any = {
    to: () => ({
      emit: () => {},
    }),
  };

  const mockSettings: RoomSettings = {
    name: "Test Ludo Room",
    gameId: 'ludo',
    gameMode: 'classic',
    maxPlayers: 4,
    durationSeconds: 600,
    isPrivate: false,
  };

  const players: Player[] = [
    {
      id: 'p1',
      socketId: 's1',
      nickname: 'PlayerRed',
      avatar: 'climber-red',
      isHost: true,
      isReady: true,
      isConnected: true,
      joinedAt: Date.now(),
    },
    {
      id: 'p2',
      socketId: 's2',
      nickname: 'PlayerGreen',
      avatar: 'climber-green',
      isHost: false,
      isReady: true,
      isConnected: true,
      joinedAt: Date.now(),
    },
  ];

  it('should initialize a 2-player game with Red vs Green diagonally opposite sides', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    const state = game.getState();
    assert.strictEqual(state.gameId, 'ludo');
    assert.strictEqual(state.playerOrder.length, 2);
    assert.strictEqual(state.players['p1'].color, 'red');
    assert.strictEqual(state.players['p2'].color, 'green');
    assert.strictEqual(state.players['p1'].tokens.length, 4);
    assert.strictEqual(state.players['p1'].tokens[0].state, 'base');
    assert.strictEqual(state.currentTurnPlayerId, 'p1');
    assert.strictEqual(state.players['p1'].canRoll, true);
  });

  it('should require a 6 to bring a token out of the base', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    // Roll dice with a mock or forced value
    const p1 = (game as any).players.get('p1');
    
    // Test with dice value = 4 (cannot move out of base)
    const validWith4 = (game as any).calculateValidMoves(p1, 4);
    assert.strictEqual(validWith4.length, 0);

    // Test with dice value = 6 (all 4 base tokens valid to move out)
    const validWith6 = (game as any).calculateValidMoves(p1, 6);
    assert.strictEqual(validWith6.length, 4);
  });

  it('should move token to starting track tile when 6 is rolled and token is moved', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    const p1 = (game as any).players.get('p1');
    (game as any).diceValue = 6;
    (game as any).hasRolled = true;
    (game as any).validMoves = [0, 1, 2, 3];

    game.handleInput('p1', { action: 'move-token', tokenIndex: 0 });

    const token0 = p1.tokens[0];
    assert.strictEqual(token0.state, 'track');
    assert.strictEqual(token0.stepCount, 1);
    assert.strictEqual(token0.trackPosition, 0); // Red start is global tile 0
  });

  it('should advance token along the track and award extra turn on 6', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    const p1 = (game as any).players.get('p1');
    const token0 = p1.tokens[0];
    token0.state = 'track';
    token0.stepCount = 1;
    token0.trackPosition = 0;

    (game as any).diceValue = 5;
    (game as any).hasRolled = true;
    (game as any).validMoves = [0];

    game.handleInput('p1', { action: 'move-token', tokenIndex: 0 });

    assert.strictEqual(token0.stepCount, 6);
    assert.strictEqual(token0.trackPosition, 5);
    // After moving with non-6 and no capture, turn passes to p2
    const state = game.getState();
    assert.strictEqual(state.currentTurnPlayerId, 'p2');
  });

  it('should capture opponent token on shared non-safe track tile and award bonus turn', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    const p1 = (game as any).players.get('p1');
    const p2 = (game as any).players.get('p2');

    // Place Green token on tile 10 (not a safe square)
    const opponentToken = p2.tokens[0];
    opponentToken.state = 'track';
    opponentToken.stepCount = 10;
    opponentToken.trackPosition = 10;

    // Place Red token at tile 7
    const redToken = p1.tokens[0];
    redToken.state = 'track';
    redToken.stepCount = 8;
    redToken.trackPosition = 7;

    // Red rolls a 3 and moves to tile 10
    (game as any).diceValue = 3;
    (game as any).hasRolled = true;
    (game as any).validMoves = [0];

    game.handleInput('p1', { action: 'move-token', tokenIndex: 0 });

    // Opponent token must be sent back to base!
    assert.strictEqual(opponentToken.state, 'base');
    assert.strictEqual(opponentToken.stepCount, 0);
    assert.strictEqual(opponentToken.trackPosition, -1);

    // Red gets a bonus roll, so p1 is still the current turn!
    const state = game.getState();
    assert.strictEqual(state.currentTurnPlayerId, 'p1');
    assert.strictEqual(state.players['p1'].canRoll, true);
  });

  it('should NOT capture own tokens when landing on the same non-safe track tile, but stack instead', () => {
    const game = new LudoGame();
    game.initialize('room-stack', players, mockSettings, mockIo);

    const p1 = (game as any).players.get('p1');

    // Place Red token 0 on tile 10 (not a safe square)
    const redToken0 = p1.tokens[0];
    redToken0.state = 'track';
    redToken0.stepCount = 11;
    redToken0.trackPosition = 10;

    // Place Red token 1 on tile 7
    const redToken1 = p1.tokens[1];
    redToken1.state = 'track';
    redToken1.stepCount = 8;
    redToken1.trackPosition = 7;

    // Red rolls a 3 and moves token 1 to tile 10 (where token 0 is already sitting)
    (game as any).diceValue = 3;
    (game as any).hasRolled = true;
    (game as any).validMoves = [1];

    game.handleInput('p1', { action: 'move-token', tokenIndex: 1 });

    // BOTH tokens must remain on tile 10, neither should be knocked back to base!
    assert.strictEqual(redToken0.state, 'track');
    assert.strictEqual(redToken0.stepCount, 11);
    assert.strictEqual(redToken0.trackPosition, 10);

    assert.strictEqual(redToken1.state, 'track');
    assert.strictEqual(redToken1.stepCount, 11);
    assert.strictEqual(redToken1.trackPosition, 10);

    // No bonus roll for capturing own token - turn should pass to p2
    const state = game.getState();
    assert.strictEqual(state.currentTurnPlayerId, 'p2');
    assert.ok(!state.lastMoveNotice?.includes('memulangkan bidak'));
  });

  it('should automatically roll dice and advance turn for bot players with realistic timing', () => {
    const mixedPlayers: Player[] = [
      { id: 'h1', socketId: 's1', nickname: 'Human', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1, isBot: false },
      { id: 'b1', socketId: 'sb1', nickname: 'Bot Alpha', avatar: 'joko', isHost: false, isReady: true, isConnected: true, joinedAt: 2, isBot: true },
    ];

    const game = new LudoGame();
    game.initialize('room-bot', mixedPlayers, mockSettings, mockIo);
    game.start();

    // Human rolls a 1 (no valid moves from base)
    (game as any).handleRollDice((game as any).players.get('h1'));
    // Pass turn to bot
    (game as any).passToNextPlayer();

    let state = game.getState();
    assert.strictEqual(state.currentTurnPlayerId, 'b1');
    assert.strictEqual(state.players['b1'].isBot, true);

    // Initial bot state is waiting-roll with ~1s timer
    assert.strictEqual((game as any).botState, 'waiting-roll');

    // Tick deltaTime by 1.1s -> bot should roll dice!
    game.update(1.1);
    assert.strictEqual((game as any).hasRolled, true);
    assert.ok(game.getState().diceValue !== null);

    // If bot rolled a 6, it has valid moves and is in waiting-move state.
    // If bot rolled 1-5, validMoves is 0 and it is in waiting-pass state.
    assert.ok(['waiting-move', 'waiting-pass'].includes((game as any).botState));

    // Tick another 1.8s -> bot completes its move or pass!
    game.update(1.8);
    // Either human gets turn back or bot got a bonus roll (on 6)
    const afterState = game.getState();
    assert.ok(['h1', 'b1'].includes(afterState.currentTurnPlayerId));
  });

  it('should intelligently choose a capture move over non-capturing moves', () => {
    const botGame = new LudoGame();
    botGame.initialize('room-intel', [
      { id: 'b1', socketId: 'sb1', nickname: 'Bot Red', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1, isBot: true },
      { id: 'p2', socketId: 's2', nickname: 'Opponent Green', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 2, isBot: false },
    ], mockSettings, mockIo);

    const bot = (botGame as any).players.get('b1');
    const opp = (botGame as any).players.get('p2');

    // Token 0 of bot is at track tile 5
    bot.tokens[0].state = 'track';
    bot.tokens[0].stepCount = 6;
    bot.tokens[0].trackPosition = 5;

    // Token 1 of bot is at track tile 15
    bot.tokens[1].state = 'track';
    bot.tokens[1].stepCount = 16;
    bot.tokens[1].trackPosition = 15;

    // Opponent token is at track tile 9 (distance of 4 from token 0)
    opp.tokens[0].state = 'track';
    opp.tokens[0].stepCount = 10;
    opp.tokens[0].trackPosition = 9; // Not a safe square

    // Bot rolls a 4. Both token 0 and token 1 can move.
    // Token 0 + 4 steps lands on tile 9 -> CAPTURES opponent!
    const bestMove = (botGame as any).chooseBestBotMove(bot, [0, 1], 4);
    assert.strictEqual(bestMove, 0, 'Bot must choose token 0 to execute the capture');
  });

  it('should run a multi-turn simulation with 1 human and 3 bots smoothly', () => {
    const fullRoomPlayers: Player[] = [
      { id: 'h1', socketId: 's1', nickname: 'Human Commander', avatar: 'budi', isHost: true, isReady: true, isConnected: true, joinedAt: 1, isBot: false },
      { id: 'b1', socketId: 'sb1', nickname: 'Bot 1', avatar: 'joko', isHost: false, isReady: true, isConnected: true, joinedAt: 2, isBot: true },
      { id: 'b2', socketId: 'sb2', nickname: 'Bot 2', avatar: 'siti', isHost: false, isReady: true, isConnected: true, joinedAt: 3, isBot: true },
      { id: 'b3', socketId: 'sb3', nickname: 'Bot 3', avatar: 'agus', isHost: false, isReady: true, isConnected: true, joinedAt: 4, isBot: true },
    ];

    const simGame = new LudoGame();
    simGame.initialize('room-full', fullRoomPlayers, mockSettings, mockIo);
    simGame.start();

    // Human immediately passes
    (simGame as any).passToNextPlayer();

    // Update 50 ticks of 0.5s (25 seconds of simulated time)
    // The 3 bots must take turns, roll, move, and cycle without throwing or stalling
    for (let i = 0; i < 50; i++) {
      simGame.update(0.5);
    }

    const state = simGame.getState();
    assert.ok(state.playerOrder.length === 4);
    assert.ok(['h1', 'b1', 'b2', 'b3'].includes(state.currentTurnPlayerId));
  });
});
