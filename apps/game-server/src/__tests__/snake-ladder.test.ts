import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SnakeLadderGame } from '../games/snake-ladder/SnakeLadderGame';
import {
  Player,
  RoomSettings,
  SNAKE_LADDER_LADDERS,
  SNAKE_LADDER_SNAKES,
} from '@gamehouse/shared';

function makePlayer(id: string, idx: number, isBot = false): Player {
  return {
    id,
    socketId: `s-${id}`,
    nickname: isBot ? `Bot${idx}` : `Player${idx}`,
    avatar: 'budi',
    isHost: idx === 1,
    isReady: true,
    isConnected: true,
    joinedAt: Date.now(),
    isBot,
  };
}

describe('Ular Tangga 2.5D (Snakes & Ladders) Game Engine', () => {
  const mockIo: any = {
    to: () => ({
      emit: () => {},
    }),
  };

  const baseSettings: RoomSettings = {
    name: 'Ular Tangga Test Room',
    gameId: 'snake-ladder',
    gameMode: 'snake-classic',
    maxPlayers: 6,
    durationSeconds: 600,
    isPrivate: false,
  };

  it('should have valid non-overlapping snake and ladder endpoints', () => {
    const endpoints = new Set<number>();

    SNAKE_LADDER_LADDERS.forEach((l) => {
      assert.ok(l.from >= 2 && l.from < l.to && l.to <= 99, `Invalid ladder ${l.id}`);
      assert.strictEqual(endpoints.has(l.from), false, `Duplicate endpoint ${l.from}`);
      assert.strictEqual(endpoints.has(l.to), false, `Duplicate endpoint ${l.to}`);
      endpoints.add(l.from);
      endpoints.add(l.to);
    });

    SNAKE_LADDER_SNAKES.forEach((s) => {
      assert.ok(s.to >= 1 && s.to < s.from && s.from <= 99, `Invalid snake ${s.id}`);
      assert.strictEqual(endpoints.has(s.from), false, `Duplicate endpoint ${s.from}`);
      assert.strictEqual(endpoints.has(s.to), false, `Duplicate endpoint ${s.to}`);
      endpoints.add(s.from);
      endpoints.add(s.to);
    });
  });

  it('should initialize 2 to 6 players with unique colors at position 0', () => {
    const players = [1, 2, 3, 4, 5, 6].map((i) => makePlayer(`p${i}`, i));
    const game = new SnakeLadderGame();
    game.initialize('room-snake-6', players, baseSettings, mockIo);

    const state = game.getState();
    assert.strictEqual(state.gameId, 'snake-ladder');
    assert.strictEqual(state.playerOrder.length, 6);
    assert.strictEqual(state.currentTurnPlayerId, 'p1');
    assert.strictEqual(state.players['p1'].canRoll, true);
    assert.strictEqual(state.players['p2'].canRoll, false);

    const colors = new Set(Object.values(state.players).map((p) => p.color));
    assert.strictEqual(colors.size, 6);
    Object.values(state.players).forEach((p) => {
      assert.strictEqual(p.position, 0);
    });
  });

  it('should climb ladder when landing on ladder bottom and record trigger', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2)];
    const game = new SnakeLadderGame();
    game.initialize('room-ladder', players, baseSettings, mockIo);

    // Tile 4 has ladder 4 -> 25
    game.executeRollForTest('p1', 4);
    const state = game.getState();

    assert.strictEqual(state.players['p1'].position, 25);
    assert.strictEqual(state.players['p1'].laddersClimbed, 1);
    assert.strictEqual(state.lastMove?.trigger?.type, 'ladder');
    assert.strictEqual(state.lastMove?.trigger?.from, 4);
    assert.strictEqual(state.lastMove?.trigger?.to, 25);
    assert.deepStrictEqual(state.lastMove?.walkPath, [1, 2, 3, 4]);
    assert.strictEqual(state.currentTurnPlayerId, 'p2');
  });

  it('should slide down snake when landing on snake head and record trigger', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2)];
    const game = new SnakeLadderGame();
    game.initialize('room-snake', players, baseSettings, mockIo);

    // Place p1 at 24 and roll 3 -> lands on 27 (snake 27 -> 5)
    (game as any).players.get('p1').position = 24;
    game.executeRollForTest('p1', 3);
    const state = game.getState();

    assert.strictEqual(state.players['p1'].position, 5);
    assert.strictEqual(state.players['p1'].snakesBitten, 1);
    assert.strictEqual(state.lastMove?.trigger?.type, 'snake');
    assert.strictEqual(state.lastMove?.trigger?.from, 27);
    assert.strictEqual(state.lastMove?.trigger?.to, 5);
  });

  it('should grant bonus roll on 6 and forfeit turn on 3 consecutive 6s', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2)];
    const game = new SnakeLadderGame();
    game.initialize('room-sixes', players, baseSettings, mockIo);

    game.executeRollForTest('p1', 6);
    let state = game.getState();
    assert.strictEqual(state.players['p1'].position, 6);
    assert.strictEqual(state.currentTurnPlayerId, 'p1');
    assert.strictEqual(state.players['p1'].canRoll, true);
    assert.strictEqual(state.lastMove?.bonusRoll, true);

    game.executeRollForTest('p1', 6);
    state = game.getState();
    assert.strictEqual(state.players['p1'].position, 12);
    assert.strictEqual(state.currentTurnPlayerId, 'p1');

    // Third 6 forfeits turn and keeps position at 12
    game.executeRollForTest('p1', 6);
    state = game.getState();
    assert.strictEqual(state.players['p1'].position, 12);
    assert.strictEqual(state.lastMove?.forfeitedThreeSixes, true);
    assert.strictEqual(state.currentTurnPlayerId, 'p2');
  });

  it('should bounce back from tile 100 in classic mode and trigger snake if landed on 99', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2)];
    const game = new SnakeLadderGame();
    game.initialize('room-bounce', players, baseSettings, mockIo);

    // 98 + 5 -> 99, 100, 99, 98, 97 (no snake at 97)
    (game as any).players.get('p1').position = 98;
    game.executeRollForTest('p1', 5);
    let state = game.getState();
    assert.strictEqual(state.players['p1'].position, 97);
    assert.strictEqual(state.lastMove?.bouncedAt100, true);
    assert.deepStrictEqual(state.lastMove?.walkPath, [99, 100, 99, 98, 97]);
    assert.strictEqual(game.isFinished(), false);

    // 98 + 3 -> 99, 100, 99 -> lands on snake 99 -> 61!
    (game as any).players.get('p2').position = 98;
    game.executeRollForTest('p2', 3);
    state = game.getState();
    assert.strictEqual(state.lastMove?.bouncedAt100, true);
    assert.strictEqual(state.lastMove?.trigger?.type, 'snake');
    assert.strictEqual(state.lastMove?.trigger?.from, 99);
    assert.strictEqual(state.players['p2'].position, 61);
  });

  it('should finish immediately when reaching or exceeding 100 in snake-quick mode', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2)];
    const game = new SnakeLadderGame();
    game.initialize(
      'room-quick',
      players,
      { ...baseSettings, gameMode: 'snake-quick' },
      mockIo
    );

    (game as any).players.get('p1').position = 97;
    game.executeRollForTest('p1', 5);
    const state = game.getState();

    assert.strictEqual(game.isFinished(), true);
    assert.strictEqual(state.winnerId, 'p1');
    assert.strictEqual(state.players['p1'].position, 100);
    assert.strictEqual(state.rankings[0].rank, 1);
    assert.strictEqual(state.rankings[0].playerId, 'p1');
  });

  it('should complete a full 6-bot automated simulation cleanly', () => {
    const players = [1, 2, 3, 4, 5, 6].map((i) => makePlayer(`b${i}`, i, true));
    const game = new SnakeLadderGame();
    game.initialize('room-sim', players, baseSettings, mockIo);
    game.start();

    let ticks = 0;
    while (!game.isFinished() && ticks < 5000) {
      game.update(0.5);
      ticks++;
    }

    assert.strictEqual(game.isFinished(), true);
    const results = game.getResults();
    assert.ok(results.winner !== null);
    assert.strictEqual(results.rankings.length, 6);
    assert.strictEqual(results.rankings[0].finalHeight, 100);
  });

  it('should handle removePlayer cleanly during active match', () => {
    const players = [makePlayer('p1', 1), makePlayer('p2', 2), makePlayer('p3', 3)];
    const game = new SnakeLadderGame();
    game.initialize('room-kick', players, baseSettings, mockIo);

    game.removePlayer('p1');
    const state = game.getState();
    assert.strictEqual(state.playerOrder.length, 2);
    assert.strictEqual(state.currentTurnPlayerId, 'p2');
    assert.strictEqual(state.players['p2'].canRoll, true);
  });
});
