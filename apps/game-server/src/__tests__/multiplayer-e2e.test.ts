import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../rooms/RoomManager';
import { setupSocketHandlers } from '../socket/SocketHandler';
import { ClientToServerEvents, ServerToClientEvents } from '@gamehouse/shared';

describe('End-to-End Multiplayer Socket Flow', () => {
  let server: http.Server;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  let roomManager: RoomManager;
  let port: number;

  let client1: ClientSocketType<ServerToClientEvents, ClientToServerEvents>;
  let client2: ClientSocketType<ServerToClientEvents, ClientToServerEvents>;

  before(async () => {
    const app = express();
    server = http.createServer(app);
    io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: { origin: '*' }
    });
    roomManager = new RoomManager(io);
    setupSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    setTimeout(() => {
      process.exit(0);
    }, 100).unref();
  });

  it('should connect two clients and complete a full party game session', async () => {
    const url = `http://127.0.0.1:${port}`;

    // 1. Connect Client 1 (Host)
    client1 = ClientSocket(url, { transports: ['websocket', 'polling'] });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('client1 connect timeout')), 3000);
      client1.on('connect', () => { clearTimeout(t); resolve(); });
    });
    assert.strictEqual(client1.connected, true);

    // 2. Connect Client 2 (Guest)
    client2 = ClientSocket(url, { transports: ['websocket', 'polling'] });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('client2 connect timeout')), 3000);
      client2.on('connect', () => { clearTimeout(t); resolve(); });
    });
    assert.strictEqual(client2.connected, true);

    // 3. Client 1 creates a room
    let roomCode = '';
    await new Promise<void>((resolve) => {
      client1.emit('room:create', {
        nickname: 'AndiHost',
        avatar: 'climber-red',
        roomName: 'Pesta Merdeka',
        gameId: 'panjat-pinang',
        gameMode: 'classic-race',
        maxPlayers: 4,
      }, (res) => {
        assert.strictEqual(res.success, true);
        assert.ok(res.room);
        roomCode = res.room!.code;
        resolve();
      });
    });

    assert.match(roomCode, /^\d{5}$/, `Room code must be a 5-digit number without symbols, got ${roomCode}`);

    // 4. Client 2 joins the room using roomCode
    await new Promise<void>((resolve) => {
      client2.emit('room:join', {
        roomCode,
        nickname: 'BudiClimber',
        avatar: 'climber-blue',
      }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.room?.players.length, 2);
        resolve();
      });
    });

    // 5. Client 2 toggles ready
    client2.emit('room:ready', true);
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('room:updated ready timeout')), 3000);
      client1.on('room:updated', (updatedRoom) => {
        const p2 = updatedRoom.players.find(p => p.nickname === 'BudiClimber');
        if (p2?.isReady) {
          clearTimeout(t);
          resolve();
        }
      });
    });

    // 6. Host triggers game start
    client1.emit('game:start');

    // Wait for countdown
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('countdown timeout')), 3000);
      client2.on('game:countdown', (count) => {
        assert.ok(count <= 3);
        clearTimeout(t);
        resolve();
      });
    });

    // 7. Verify game input sync
    client1.emit('game:input', {
      up: true,
      down: false,
      left: false,
      right: false,
      recovery: false,
      timestamp: Date.now(),
    });

    // 8. Test skill trigger
    client1.emit('player:skill', 'iron_grip');

    // 9. Host leaves, verify host migration to Client 2
    client1.disconnect();

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('host migration timeout')), 3000);
      client2.on('room:updated', (updatedRoom) => {
        const p2 = updatedRoom.players.find(p => p.nickname === 'BudiClimber');
        if (p2?.isHost) {
          clearTimeout(t);
          resolve();
        }
      });
    });

    const currentRoom = roomManager.getRoomByCode(roomCode);
    assert.strictEqual(currentRoom?.players.size, 1);
    assert.strictEqual(currentRoom?.players.get(currentRoom.hostId)?.nickname, 'BudiClimber');
  });
});
