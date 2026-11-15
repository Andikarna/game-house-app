import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RoomManager } from '../rooms/RoomManager';
import { PanjatPinangGame } from '../games/panjat-pinang/PanjatPinangGame';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { Player, RoomSettings } from '@gamehouse/shared';

describe('GameHouse Server Tests', () => {
  let mockIo: SocketIOServer;
  let roomManager: RoomManager;

  beforeEach(() => {
    const server = http.createServer();
    mockIo = new SocketIOServer(server);
    roomManager = new RoomManager(mockIo);
  });

  describe('Room Management & Host System', () => {
    const settings: RoomSettings = {
      name: 'Test Room',
      gameId: 'panjat-pinang',
      gameMode: 'classic-race',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    it('should create room with valid code and host', () => {
      const room = roomManager.createRoom('socket-host', { nickname: 'HostPlayer', avatar: 'climber-red' }, settings);
      assert.ok(room.id, 'Room must have an ID');
      assert.match(room.code, /^\d{5}$/, 'Room code must be a 5-digit number without symbols');
      assert.strictEqual(room.players.size, 1);
      
      const host = room.players.get(room.hostId);
      assert.ok(host, 'Host player should exist');
      assert.strictEqual(host?.nickname, 'HostPlayer');
      assert.strictEqual(host?.isHost, true);
      assert.strictEqual(host?.isReady, true);
    });

    it('should allow players to join and respect room capacity', () => {
      const room = roomManager.createRoom('socket-host', { nickname: 'HostPlayer', avatar: 'climber-red' }, {
        ...settings,
        maxPlayers: 2
      });

      // Join player 2
      const join1 = roomManager.joinRoom('socket-p2', room.code, { nickname: 'Player2', avatar: 'climber-blue' });
      assert.strictEqual(join1.success, true);
      assert.strictEqual(room.players.size, 2);

      // Join player 3 (should fail due to maxPlayers=2)
      const join2 = roomManager.joinRoom('socket-p3', room.code, { nickname: 'Player3', avatar: 'climber-green' });
      assert.strictEqual(join2.success, false);
      assert.strictEqual(join2.error, 'Room is full.');
      assert.strictEqual(room.players.size, 2);
    });

    it('should handle player ready status and start validation', () => {
      const room = roomManager.createRoom('socket-host', { nickname: 'Host', avatar: 'climber-red' }, settings);
      const hostId = room.hostId;

      // Cannot start with only 1 player
      const check1 = room.canStartGame(hostId);
      assert.strictEqual(check1.canStart, false);
      assert.strictEqual(check1.reason, 'At least 2 players are required to start.');

      // Add player 2
      const join = roomManager.joinRoom('socket-p2', room.code, { nickname: 'P2', avatar: 'climber-blue' });
      const p2 = join.player!;

      // P2 not ready yet
      const check2 = room.canStartGame(hostId);
      assert.strictEqual(check2.canStart, false);

      // P2 sets ready
      room.setPlayerReady(p2.id, true);
      const check3 = room.canStartGame(hostId);
      assert.strictEqual(check3.canStart, true);

      // Non-host cannot start
      const check4 = room.canStartGame(p2.id);
      assert.strictEqual(check4.canStart, false);
    });

    it('should perform host migration when host leaves', () => {
      const room = roomManager.createRoom('socket-host', { nickname: 'OldHost', avatar: 'climber-red' }, settings);
      const hostId = room.hostId;

      const join = roomManager.joinRoom('socket-p2', room.code, { nickname: 'NewHostCandidate', avatar: 'climber-blue' });
      const p2 = join.player!;

      // Remove host
      const removal = room.removePlayer(hostId);
      assert.strictEqual(removal.wasHost, true);
      assert.strictEqual(removal.newHostId, p2.id);
      assert.strictEqual(room.hostId, p2.id);
      assert.strictEqual(p2.isHost, true);
      assert.strictEqual(p2.isReady, true);
    });
  });

  describe('Panjat Pinang Game Engine & Physics', () => {
    let game: PanjatPinangGame;
    const players: Player[] = [
      { id: 'p1', socketId: 's1', nickname: 'Climber1', avatar: 'climber-red', isHost: true, isReady: true, isConnected: true, joinedAt: Date.now() },
      { id: 'p2', socketId: 's2', nickname: 'Climber2', avatar: 'climber-blue', isHost: false, isReady: true, isConnected: true, joinedAt: Date.now() }
    ];

    const settings: RoomSettings = {
      name: 'Game 1',
      gameId: 'panjat-pinang',
      gameMode: 'classic-race',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    beforeEach(() => {
      game = new PanjatPinangGame();
      game.initialize('room-1', players, settings, mockIo);
    });

    it('should initialize climbers with 100 stamina and 0 height', () => {
      const state = game.getState();
      assert.strictEqual(state.status, 'in-game');
      assert.strictEqual(Object.keys(state.climbers).length, 2);

      const c1 = state.climbers['p1'];
      assert.strictEqual(c1.height, 0);
      assert.strictEqual(c1.stamina, 100);
      assert.strictEqual(c1.balance, 0);
      assert.strictEqual(c1.isStunned, false);
      assert.strictEqual(c1.fallCount, 0);
    });

    it('should increase height and deplete stamina when climbing up', () => {
      game.handleInput('p1', {
        up: true,
        down: false,
        left: false,
        right: false,
        recovery: false,
        timestamp: Date.now()
      });

      // Advance by 1 second (10 ticks of 0.1s)
      for (let i = 0; i < 10; i++) {
        game.update(0.1);
      }

      const state = game.getState();
      const c1 = state.climbers['p1'];
      assert.ok(c1.height > 0, `Height should be > 0, was ${c1.height}`);
      assert.ok(c1.stamina < 100, `Stamina should be < 100, was ${c1.stamina}`);
      assert.strictEqual(c1.isClimbing, true);
    });

    it('should regenerate stamina when resting idle', () => {
      const c1 = game.getState().climbers['p1'];
      c1.stamina = 50;

      game.handleInput('p1', {
        up: false,
        down: false,
        left: false,
        right: false,
        recovery: false,
        timestamp: Date.now()
      });

      game.update(1.0); // 1 second idle

      assert.ok(c1.stamina > 50, `Stamina should have regenerated, was ${c1.stamina}`);
    });

    it('should trigger fall and stun when balance threshold is breached', () => {
      const c1 = game.getState().climbers['p1'];
      c1.height = 30;
      c1.balance = 85; // Beyond slip threshold 75

      game.update(0.1);

      assert.ok(c1.height < 30, 'Climber height should have dropped');
      assert.strictEqual(c1.isStunned, true);
      assert.strictEqual(c1.fallCount, 1);
    });

    it('should execute Quick Recovery skill to restore stamina and cleanse stun', () => {
      const c1 = game.getState().climbers['p1'];
      c1.height = 20;
      c1.stamina = 40;
      c1.isStunned = true;
      c1.stunTimer = 2.0;

      game.handleSkill('p1', 'recovery');

      assert.strictEqual(c1.isStunned, false);
      assert.strictEqual(c1.stamina, 70); // 40 + 30
      assert.ok(c1.skillCooldowns.recovery > 0, 'Recovery skill should be on cooldown');
    });

    it('should execute Super Climb skill with speed boost and cooldown', () => {
      game.handleSkill('p1', 'super_climb');
      const c1 = game.getState().climbers['p1'];

      assert.ok(c1.activeEffects.some(e => e.type === 'super_climb'));
      assert.ok(c1.skillCooldowns.super_climb > 0);
    });

    it('should declare first player reaching 100% height as winner in classic race', () => {
      const c1 = game.getState().climbers['p1'];
      c1.height = 99;

      game.handleInput('p1', {
        up: true,
        down: false,
        left: false,
        right: false,
        recovery: false,
        timestamp: Date.now()
      });

      // Update until 100%
      game.update(0.5);

      assert.strictEqual(game.isFinished(), true);
      const results = game.getResults();
      assert.strictEqual(results.winner?.playerId, 'p1');
      assert.strictEqual(results.rankings[0].rank, 1);
    });
  });
});
