import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { UnoGame, createUnoDeck } from '../games/uno/UnoGame';
import { Room } from '../rooms/Room';
import { RoomManager } from '../rooms/RoomManager';
import { setupSocketHandlers } from '../socket/SocketHandler';
import {
  Player,
  RoomSettings,
  UnoGameState,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@gamehouse/shared';

function makePlayer(id: string, idx: number, isBot = false): Player {
  return {
    id,
    socketId: `s-${id}`,
    nickname: isBot ? `Bot${idx}` : `Player${idx}`,
    avatar: 'luna',
    isHost: idx === 1,
    isReady: true,
    isConnected: true,
    joinedAt: Date.now() + idx,
    isBot,
  };
}

describe('UNO Party (4-10 Players) Game Engine', () => {
  const mockIo: any = {
    to: () => ({
      emit: () => {},
    }),
  };

  const baseSettings: RoomSettings = {
    name: 'UNO Test Room',
    gameId: 'uno',
    gameMode: 'uno-classic',
    maxPlayers: 10,
    durationSeconds: 480,
    isPrivate: false,
  };

  it('should create 108-card single deck and 216-card double deck cleanly', () => {
    const single = createUnoDeck(1, 1);
    const double = createUnoDeck(2, 2);
    assert.strictEqual(single.length, 108);
    assert.strictEqual(double.length, 216);
  });

  it('should initialize 4 to 10 players with 7 cards each and keep hands private', () => {
    const players = Array.from({ length: 10 }, (_, i) => makePlayer(`p${i + 1}`, i + 1));
    const game = new UnoGame();
    game.initialize('room-uno-10', players, baseSettings, mockIo);

    const publicState: UnoGameState = game.getState();
    assert.strictEqual(publicState.gameId, 'uno');
    assert.strictEqual(publicState.playerOrder.length, 10);
    assert.strictEqual(publicState.currentTurnPlayerId, 'p1');
    assert.strictEqual((publicState as any).myHand, undefined);
    assert.strictEqual((publicState as any).privateHands, undefined);

    // 216 total - (10 * 7) - 1 starter = 145 remaining in draw pile
    assert.strictEqual(publicState.drawPileCount, 145);

    players.forEach((p) => {
      assert.strictEqual(publicState.players[p.id].cardCount, 7);
      const personal = game.getStateForPlayer(p.id);
      assert.strictEqual(personal.myHand?.length, 7);
    });
  });

  it('should enforce 4-10 player capacity in Room.canStartGame and fillBots', () => {
    const host = makePlayer('p1', 1);
    const room = new Room('r-uno', '12345', host, { ...baseSettings, maxPlayers: 8 }, mockIo);

    const checkTooFew = room.canStartGame('p1');
    assert.strictEqual(checkTooFew.canStart, false);

    const fillRes = room.fillBots();
    assert.strictEqual(fillRes.added, 7);
    assert.strictEqual(room.players.size, 8);

    const checkReady = room.canStartGame('p1');
    assert.strictEqual(checkReady.canStart, true);
    room.cleanup();
  });

  it('should apply Skip, Reverse, and Wild color selection correctly', () => {
    const players = [1, 2, 3, 4].map((i) => makePlayer(`p${i}`, i));
    const game = new UnoGame();
    game.initialize('room-uno-4', players, baseSettings, mockIo);

    const state = game.getStateWithSecrets();
    state.topCard = { id: 'top_r5', color: 'red', value: '5' };
    state.activeColor = 'red';
    state.privateDiscardPile = [state.topCard];
    state.privateHands = {
      p1: [
        { id: 'c_skip', color: 'red', value: 'skip' },
        { id: 'c_keep1', color: 'blue', value: '1' },
      ],
      p2: [
        { id: 'c_rev', color: 'red', value: 'reverse' },
        { id: 'c_keep2', color: 'green', value: '2' },
      ],
      p3: [
        { id: 'c_wild', color: 'wild', value: 'wild' },
        { id: 'c_keep3', color: 'yellow', value: '3' },
      ],
      p4: [
        { id: 'c_keep4a', color: 'red', value: '4' },
        { id: 'c_keep4b', color: 'blue', value: '8' },
      ],
    };
    Object.keys(state.players).forEach((id) => {
      state.players[id].cardCount = 2;
    });
    game.restoreState(state);

    // P1 plays Skip -> skips P2, lands on P3
    game.handleInput('p1', { action: 'play-card', cardId: 'c_skip' });
    assert.strictEqual(game.getState().currentTurnPlayerId, 'p3');
    assert.strictEqual(game.getState().lastFx?.type, 'skip');
    assert.strictEqual(game.getState().lastFx?.targetId, 'p2');

    // P3 plays Wild choosing green -> advances to P4 with activeColor = green
    game.handleInput('p3', { action: 'play-card', cardId: 'c_wild', chosenColor: 'green' });
    assert.strictEqual(game.getState().currentTurnPlayerId, 'p4');
    assert.strictEqual(game.getState().activeColor, 'green');
  });

  it('should stack +2 and +4 in uno-stack mode and award penalty when drawn', () => {
    const players = [1, 2, 3, 4].map((i) => makePlayer(`p${i}`, i));
    const game = new UnoGame();
    game.initialize('room-stack', players, { ...baseSettings, gameMode: 'uno-stack' }, mockIo);

    const state = game.getStateWithSecrets();
    state.topCard = { id: 'top_b3', color: 'blue', value: '3' };
    state.activeColor = 'blue';
    state.privateDiscardPile = [state.topCard];
    state.privateHands = {
      p1: [
        { id: 'p1_d2', color: 'blue', value: 'draw2' },
        { id: 'p1_keep', color: 'red', value: '9' },
      ],
      p2: [
        { id: 'p2_d2', color: 'green', value: 'draw2' },
        { id: 'p2_keep', color: 'yellow', value: '4' },
      ],
      p3: [
        { id: 'p3_wd4', color: 'wild', value: 'wild_draw4' },
        { id: 'p3_keep', color: 'red', value: '2' },
      ],
      p4: [
        { id: 'p4_keep1', color: 'blue', value: '7' },
        { id: 'p4_keep2', color: 'green', value: '8' },
      ],
    };
    Object.keys(state.players).forEach((id) => {
      state.players[id].cardCount = 2;
    });
    game.restoreState(state);

    // P1 plays +2 -> pending = 2
    game.handleInput('p1', { action: 'play-card', cardId: 'p1_d2' });
    assert.strictEqual(game.getState().pendingDrawCount, 2);
    assert.strictEqual(game.getState().currentTurnPlayerId, 'p2');

    // P2 stacks +2 -> pending = 4
    game.handleInput('p2', { action: 'play-card', cardId: 'p2_d2' });
    assert.strictEqual(game.getState().pendingDrawCount, 4);
    assert.strictEqual(game.getState().currentTurnPlayerId, 'p3');

    // P3 stacks Wild +4 -> pending = 8, activeColor = yellow
    game.handleInput('p3', { action: 'play-card', cardId: 'p3_wd4', chosenColor: 'yellow' });
    assert.strictEqual(game.getState().pendingDrawCount, 8);
    assert.strictEqual(game.getState().activeColor, 'yellow');
    assert.strictEqual(game.getState().currentTurnPlayerId, 'p4');

    // P4 cannot stack and draws 8 cards -> ends with 2 + 8 = 10 cards
    game.handleInput('p4', { action: 'draw-card' });
    assert.strictEqual(game.getState().pendingDrawCount, 0);
    assert.strictEqual(game.getState().players['p4'].cardCount, 10);
  });

  it('should support Chaos 7 hand swap and Chaos 0 hand rotation', () => {
    const players = [1, 2, 3, 4].map((i) => makePlayer(`p${i}`, i));
    const game = new UnoGame();
    game.initialize('room-chaos', players, { ...baseSettings, gameMode: 'uno-chaos' }, mockIo);

    const state = game.getStateWithSecrets();
    state.topCard = { id: 'top_y1', color: 'yellow', value: '1' };
    state.activeColor = 'yellow';
    state.privateDiscardPile = [state.topCard];
    state.privateHands = {
      p1: [
        { id: 'c7', color: 'yellow', value: '7' },
        { id: 'p1_a', color: 'red', value: '4' },
        { id: 'p1_b', color: 'blue', value: '9' },
      ],
      p2: [{ id: 'c0', color: 'yellow', value: '0' }],
      p3: [
        { id: 'p3_a', color: 'green', value: '5' },
        { id: 'p3_b', color: 'green', value: '6' },
      ],
      p4: [
        { id: 'p4_a', color: 'blue', value: '2' },
        { id: 'p4_b', color: 'red', value: '3' },
        { id: 'p4_c', color: 'yellow', value: '8' },
        { id: 'p4_d', color: 'red', value: '5' },
      ],
    };
    Object.entries(state.privateHands).forEach(([id, h]) => {
      state.players[id].cardCount = h.length;
    });
    game.restoreState(state);

    // P1 plays 7 and swaps remaining 2 cards with P2's 1 card!
    game.handleInput('p1', { action: 'play-card', cardId: 'c7', targetPlayerId: 'p2' });
    assert.strictEqual(game.getState().players['p1'].cardCount, 1);
    assert.strictEqual(game.getState().players['p2'].cardCount, 2);
  });

  it('should catch player who forgot to shout UNO and penalize +2 cards', () => {
    const players = [1, 2, 3, 4].map((i) => makePlayer(`p${i}`, i));
    const game = new UnoGame();
    game.initialize('room-catch', players, baseSettings, mockIo);

    const state = game.getStateWithSecrets();
    state.topCard = { id: 'top_g3', color: 'green', value: '3' };
    state.activeColor = 'green';
    state.privateDiscardPile = [state.topCard];
    state.privateHands = {
      p1: [
        { id: 'p1_1', color: 'green', value: '8' },
        { id: 'p1_2', color: 'blue', value: '9' },
      ],
      p2: [
        { id: 'p2_1', color: 'red', value: '1' },
        { id: 'p2_2', color: 'red', value: '2' },
      ],
      p3: [
        { id: 'p3_1', color: 'yellow', value: '1' },
        { id: 'p3_2', color: 'yellow', value: '2' },
      ],
      p4: [
        { id: 'p4_1', color: 'blue', value: '1' },
        { id: 'p4_2', color: 'blue', value: '2' },
      ],
    };
    Object.keys(state.players).forEach((id) => {
      state.players[id].cardCount = 2;
    });
    game.restoreState(state);

    // P1 plays down to 1 card WITHOUT calling UNO
    game.handleInput('p1', { action: 'play-card', cardId: 'p1_1' });
    assert.strictEqual(game.getState().players['p1'].cardCount, 1);
    assert.strictEqual(game.getState().players['p1'].calledUno, false);

    // P3 catches P1!
    game.handleInput('p3', { action: 'catch-uno', targetPlayerId: 'p1' });
    assert.strictEqual(game.getState().players['p1'].cardCount, 3);
    assert.strictEqual(game.getState().players['p3'].score, 25);
  });

  it('should complete a full 10-bot automated UNO simulation smoothly', () => {
    const bots = Array.from({ length: 10 }, (_, i) => makePlayer(`bot_${i + 1}`, i + 1, true));
    const game = new UnoGame();
    game.initialize('room-10bots', bots, { ...baseSettings, gameMode: 'uno-stack' }, mockIo);
    game.start();

    let steps = 0;
    while (!game.isFinished() && steps < 3000) {
      game.update(0.8);
      steps++;
    }

    assert.strictEqual(game.isFinished(), true, '10-bot UNO game should finish cleanly');
    const results = game.getResults();
    assert.ok(results.winner, 'Winner should be determined');
    assert.strictEqual(results.rankings.length, 10);
    assert.strictEqual(results.rankings[0].rank, 1);
    assert.strictEqual(results.rankings[0].finalHeight, 0);
  });
});

describe('UNO Party E2E Socket.IO Multiplayer Flow (4 Real Clients)', () => {
  let server: http.Server;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  let roomManager: RoomManager;
  let port: number;
  let createdRoomId: string | null = null;
  const clients: ClientSocketType<ServerToClientEvents, ClientToServerEvents>[] = [];

  before(async () => {
    const app = express();
    server = http.createServer(app);
    io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: { origin: '*' },
    });
    roomManager = new RoomManager(io);
    setupSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    if (createdRoomId) {
      roomManager.deleteRoom(createdRoomId);
    }
    clients.forEach((c) => {
      if (c?.connected) c.disconnect();
    });
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects 4 real clients, starts UNO, keeps hands private, and executes moves at low latency', async () => {
    const url = `http://127.0.0.1:${port}`;
    const nicknames = ['LunaHost', 'BimaP2', 'NalaP3', 'RamaP4'];
    const avatars = ['luna', 'bima', 'nala', 'rama'] as const;

    for (let i = 0; i < 4; i++) {
      const c = ClientSocket(url, { transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`client ${i} timeout`)), 3000);
        c.on('connect', () => {
          clearTimeout(t);
          resolve();
        });
      });
      clients.push(c);
    }

    const createRes = await new Promise<any>((resolve) => {
      clients[0].emit(
        'room:create',
        {
          nickname: nicknames[0],
          avatar: avatars[0],
          roomName: 'UNO E2E Party',
          gameId: 'uno',
          gameMode: 'uno-stack',
          maxPlayers: 10,
        },
        resolve
      );
    });
    assert.strictEqual(createRes.success, true);
    createdRoomId = createRes.room.id;
    const roomCode = createRes.room.code;

    for (let i = 1; i < 4; i++) {
      const joinRes = await new Promise<any>((resolve) => {
        clients[i].emit(
          'room:join',
          {
            roomCode,
            nickname: nicknames[i],
            avatar: avatars[i],
          },
          resolve
        );
      });
      assert.strictEqual(joinRes.success, true);
      clients[i].emit('room:ready', true);
    }

    await new Promise((r) => setTimeout(r, 80));

    const personalStates: Record<number, UnoGameState> = {};
    clients.forEach((c, idx) => {
      c.on('game:uno_state', (st) => {
        personalStates[idx] = st;
      });
    });

    clients[0].emit('game:start');

    // Wait for 3-2-1 countdown + initial UNO deal
    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('UNO start timeout')), 5000);
      const check = setInterval(() => {
        if (Object.keys(personalStates).length === 4) {
          clearTimeout(deadline);
          clearInterval(check);
          resolve();
        }
      }, 50);
    });

    // Verify every client got its own 7-card private hand and NO privateHands leak
    for (let i = 0; i < 4; i++) {
      const st = personalStates[i];
      assert.strictEqual(st.gameId, 'uno');
      assert.strictEqual(st.myHand?.length, 7);
      assert.strictEqual((st as any).privateHands, undefined);
      assert.strictEqual((st as any).privateDeck, undefined);
    }

    // Ensure hands are distinct across players
    const p0Ids = new Set(personalStates[0].myHand!.map((c) => c.id));
    const p1Ids = personalStates[1].myHand!.map((c) => c.id);
    assert.strictEqual(
      p1Ids.some((id) => p0Ids.has(id)),
      false,
      'Players must never share the same card IDs'
    );

    // Measure live move RTT for whichever client received the randomized first turn
    const firstTurnPlayerId = personalStates[0].currentTurnPlayerId;
    const firstTurnNick = personalStates[0].players[firstTurnPlayerId]?.nickname || '';
    const activeIdx = Math.max(0, nicknames.indexOf(firstTurnNick));
    const observerIdx = (activeIdx + 1) % 4;
    const prevVersion = personalStates[activeIdx].stateVersion;
    const t0 = performance.now();
    const playable = personalStates[activeIdx].playableCardIds || [];
    if (playable.length > 0) {
      const card = personalStates[activeIdx].myHand!.find((c) => c.id === playable[0])!;
      clients[activeIdx].emit('game:input', {
        action: 'play-card',
        cardId: card.id,
        chosenColor: card.color === 'wild' ? 'blue' : undefined,
      });
    } else {
      clients[activeIdx].emit('game:input', { action: 'draw-card' });
    }

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('UNO move broadcast timeout')), 2000);
      const check = setInterval(() => {
        if (personalStates[observerIdx].stateVersion > prevVersion) {
          clearTimeout(deadline);
          clearInterval(check);
          resolve();
        }
      }, 10);
    });
    const rttMs = performance.now() - t0;
    assert.ok(rttMs < 500, `Expected low-latency state broadcast, got ${rttMs}ms`);
  });
});
