import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../rooms/Room';
import { Player, RoomSettings } from '@gamehouse/shared';

const dummyIo: any = {
  to: () => ({
    emit: (event: string, payload: any) => {
      // Mock emit collector
      if (!dummyIo._emits[event]) dummyIo._emits[event] = [];
      dummyIo._emits[event].push(payload);
    },
  }),
  _emits: {} as Record<string, any[]>,
  _clear: () => {
    dummyIo._emits = {};
  },
};

const createMockPlayer = (id: string, nickname: string, isHost = false): Player => ({
  id,
  nickname,
  avatar: 'budi',
  isHost,
  isReady: true,
  isConnected: true,
  score: 0,
});

describe('Vote Kick and Chat Features', () => {
  it('should broadcast chat message with sender info and color', () => {
    dummyIo._clear();
    const host = createMockPlayer('p1', 'Player 1', true);
    const settings: RoomSettings = {
      name: 'Test Room',
      gameId: 'ludo',
      gameMode: 'classic',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    const room = new Room('room_1', '12345', host, settings, dummyIo);
    const p2 = createMockPlayer('p2', 'Player 2');
    room.addPlayer(p2);

    const chatRes = room.handleChat('p2', 'Halo semuanya! GGWP');
    assert.equal(chatRes.success, true);
    assert.equal(dummyIo._emits['game:chat-message']?.length, 1);
    const emitted = dummyIo._emits['game:chat-message'][0];
    assert.equal(emitted.playerId, 'p2');
    assert.equal(emitted.nickname, 'Player 2');
    assert.equal(emitted.message, 'Halo semuanya! GGWP');

    room.cleanup();
  });

  it('should only allow vote kick when game is in-game and players > 2', () => {
    dummyIo._clear();
    const host = createMockPlayer('p1', 'Player 1', true);
    const settings: RoomSettings = {
      name: 'Test Room',
      gameId: 'ludo',
      gameMode: 'classic',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    const room = new Room('room_1', '12345', host, settings, dummyIo);
    const p2 = createMockPlayer('p2', 'Player 2');
    room.addPlayer(p2);

    // 1. Lobby status -> blocked
    const failLobby = room.startVoteKick('p1', 'p2');
    assert.equal(failLobby.success, false);

    // Start game
    room.startGame();

    // 2. Only 2 players in game -> blocked (requires > 2)
    const failTwoPlayers = room.startVoteKick('p1', 'p2');
    assert.equal(failTwoPlayers.success, false);
    assert.match(failTwoPlayers.error || '', /lebih dari 2 orang/);

    room.cleanup();
  });

  it('should successfully pass vote kick when majority votes yes with 3 players', () => {
    dummyIo._clear();
    const host = createMockPlayer('p1', 'Host', true);
    const settings: RoomSettings = {
      name: 'Test Room',
      gameId: 'ludo',
      gameMode: 'classic',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    const room = new Room('room_1', '12345', host, settings, dummyIo);
    const p2 = createMockPlayer('p2', 'AFK_Player');
    const p3 = createMockPlayer('p3', 'Player 3');
    room.addPlayer(p2);
    room.addPlayer(p3);

    room.startGame();
    assert.equal(room.players.size, 3);

    // p1 initiates vote kick against p2 (eligible voters: p1, p3 => 2 voters, required = 2)
    const kickStart = room.startVoteKick('p1', 'p2');
    assert.equal(kickStart.success, true);
    assert.equal(dummyIo._emits['game:vote-kick-started']?.length, 1);
    assert.equal(dummyIo._emits['game:vote-kick-started'][0].targetPlayerId, 'p2');
    assert.equal(dummyIo._emits['game:vote-kick-started'][0].requiredVotes, 2);

    // p3 votes yes
    const voteRes = room.voteVoteKick('p3', 'yes');
    assert.equal(voteRes.success, true);

    // Vote kick passes! Target p2 is kicked from room
    assert.equal(dummyIo._emits['game:vote-kick-ended']?.length, 1);
    assert.equal(dummyIo._emits['game:vote-kick-ended'][0].kicked, true);
    assert.equal(room.players.has('p2'), false);
    assert.equal(room.players.size, 2);

    room.cleanup();
  });

  it('should reject vote kick when majority rejects', () => {
    dummyIo._clear();
    const host = createMockPlayer('p1', 'Host', true);
    const settings: RoomSettings = {
      name: 'Test Room',
      gameId: 'ludo',
      gameMode: 'classic',
      maxPlayers: 4,
      durationSeconds: 180,
      isPrivate: false,
    };

    const room = new Room('room_1', '12345', host, settings, dummyIo);
    const p2 = createMockPlayer('p2', 'Player 2');
    const p3 = createMockPlayer('p3', 'Player 3');
    const p4 = createMockPlayer('p4', 'Player 4');
    room.addPlayer(p2);
    room.addPlayer(p3);
    room.addPlayer(p4);

    room.startGame();
    assert.equal(room.players.size, 4);

    // p1 starts vote kick against p2 (eligible: p1, p3, p4 -> 3 voters, required: 2)
    room.startVoteKick('p1', 'p2');

    // p3 votes no, p4 votes no
    room.voteVoteKick('p3', 'no');
    room.voteVoteKick('p4', 'no');

    // Vote kick rejected! Target p2 remains in room
    assert.equal(dummyIo._emits['game:vote-kick-ended']?.length, 1);
    assert.equal(dummyIo._emits['game:vote-kick-ended'][0].kicked, false);
    assert.equal(room.players.has('p2'), true);

    room.cleanup();
  });
});
