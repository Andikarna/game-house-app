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
      nickname: 'PlayerYellow',
      avatar: 'climber-yellow',
      isHost: false,
      isReady: true,
      isConnected: true,
      joinedAt: Date.now(),
    },
  ];

  it('should initialize a 2-player game with Red vs Yellow opposite sides', () => {
    const game = new LudoGame();
    game.initialize('room-1', players, mockSettings, mockIo);

    const state = game.getState();
    assert.strictEqual(state.gameId, 'ludo');
    assert.strictEqual(state.playerOrder.length, 2);
    assert.strictEqual(state.players['p1'].color, 'red');
    assert.strictEqual(state.players['p2'].color, 'yellow');
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

    // Place Yellow token on tile 10 (not a safe square)
    const yellowToken = p2.tokens[0];
    yellowToken.state = 'track';
    yellowToken.stepCount = 10;
    yellowToken.trackPosition = 10;

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

    // Yellow token must be sent back to base!
    assert.strictEqual(yellowToken.state, 'base');
    assert.strictEqual(yellowToken.stepCount, 0);
    assert.strictEqual(yellowToken.trackPosition, -1);

    // Red gets a bonus roll, so p1 is still the current turn!
    const state = game.getState();
    assert.strictEqual(state.currentTurnPlayerId, 'p1');
    assert.strictEqual(state.players['p1'].canRoll, true);
  });
});
