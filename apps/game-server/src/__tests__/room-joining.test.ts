import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { RoomManager } from '../rooms/RoomManager';

describe('Room Lifecycle & Joining Verification', () => {
  const server = http.createServer();
  const io = new SocketIOServer(server);
  const roomManager = new RoomManager(io);

  it('creates room and allows joining by exact 5-digit code', () => {
    const room = roomManager.createRoom(
      'socket_host_1',
      { nickname: 'HostPlayer', avatar: 'budi' },
      {
        name: 'Test Room',
        gameId: 'ludo',
        gameMode: 'classic',
        maxPlayers: 4,
        durationSeconds: 180,
        isPrivate: false,
      }
    );

    assert.ok(room.code, 'Room code should exist');
    assert.strictEqual(room.code.length, 5, 'Room code should be 5 digits');

    // Join by exact code
    const joinResult = roomManager.joinRoom(
      'socket_p2',
      room.code,
      { nickname: 'PlayerTwo', avatar: 'siti' }
    );

    assert.strictEqual(joinResult.success, true, 'Player 2 should join successfully');
    assert.strictEqual(room.players.size, 2, 'Room should now have 2 players');
  });

  it('allows joining room with whitespace or lowercase input', () => {
    const room = roomManager.createRoom(
      'socket_host_2',
      { nickname: 'HostTwo', avatar: 'rara' },
      {
        name: 'Test Space Room',
        gameId: 'hidden-team',
        gameMode: 'hidden-team-standard',
        maxPlayers: 6,
        durationSeconds: 600,
        isPrivate: false,
      }
    );

    // Join with spaces e.g. " 12345 "
    const joinWithSpace = roomManager.joinRoom(
      'socket_p3',
      `  ${room.code}  `,
      { nickname: 'PlayerThree', avatar: 'agus' }
    );
    assert.strictEqual(joinWithSpace.success, true, 'Should join with whitespace trimmed');

    // Join with prefix e.g. "GH12345"
    const joinWithPrefix = roomManager.joinRoom(
      'socket_p4',
      `GH${room.code}`,
      { nickname: 'PlayerFour', avatar: 'dewi' }
    );
    assert.strictEqual(joinWithPrefix.success, true, 'Should join with GH prefix stripped');
  });

  it('returns clean error when room code does not exist', () => {
    const fakeCode = '99999';
    const result = roomManager.joinRoom(
      'socket_fake',
      fakeCode,
      { nickname: 'Nobody', avatar: 'budi' }
    );

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('not found'), 'Error should state room not found');
  });

  it('handles rejoining if player already exists in room', () => {
    const room = roomManager.createRoom(
      'socket_host_3',
      { nickname: 'HostThree', avatar: 'budi', playerId: 'p_fixed_host' },
      {
        name: 'Test Rejoin',
        gameId: 'ludo',
        gameMode: 'classic',
        maxPlayers: 4,
        durationSeconds: 180,
        isPrivate: false,
      }
    );

    // Rejoin with same playerId
    const rejoin = roomManager.joinRoom(
      'socket_new_connection',
      room.code,
      { nickname: 'HostThree', avatar: 'budi', playerId: 'p_fixed_host' }
    );

    assert.strictEqual(rejoin.success, true);
    assert.strictEqual(rejoin.player?.id, 'p_fixed_host');
    assert.strictEqual(room.players.size, 1, 'Player count should remain 1 on rejoin');
  });
});
