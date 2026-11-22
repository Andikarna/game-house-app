import { safeDbQuery } from './db';
import {
  RoomInfo,
  Player,
  RoomSettings,
  RoomStatus,
  GameId,
  GameMode,
  AvatarId,
  ChatMessage,
  VoteKickState,
} from '../shared';

export interface RoomEntry {
  room: RoomInfo;
  gameState: any;
  gameResults: any;
  activeVoteKick?: VoteKickState | null;
  chatMessages?: ChatMessage[];
}

// In-memory room store using globalThis so it persists across Next.js API reloads
declare global {
  // eslint-disable-next-line no-var
  var __gh_memory_rooms: Map<string, RoomEntry> | undefined;
}

const memoryRooms: Map<string, RoomEntry> =
  globalThis.__gh_memory_rooms || (globalThis.__gh_memory_rooms = new Map());

export function generateRoomCode(): string {
  let code = '';
  let attempts = 0;
  do {
    code = Math.floor(10000 + Math.random() * 90000).toString();
    attempts++;
  } while (memoryRooms.has(code) && attempts < 100);

  return code;
}

export function saveMemoryRoom(
  room: RoomInfo,
  gameState: any = null,
  gameResults: any = null,
  activeVoteKick?: VoteKickState | null,
  chatMessages?: ChatMessage[]
): void {
  const cleanCode = (room.code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const existing = memoryRooms.get(cleanCode);
  const entry: RoomEntry = { 
    room, 
    gameState, 
    gameResults,
    activeVoteKick: activeVoteKick !== undefined ? activeVoteKick : (existing?.activeVoteKick || null),
    chatMessages: chatMessages !== undefined ? chatMessages : (existing?.chatMessages || [])
  };
  memoryRooms.set(cleanCode, entry);
  if (room.id) {
    memoryRooms.set(room.id, entry);
  }
}

export function getMemoryRoom(codeOrId: string): RoomEntry | null {
  const raw = (codeOrId || '').trim().toUpperCase();
  const cleanNumeric = raw.replace(/[^A-Za-z0-9]/g, '');
  const cleanWithoutPrefix = cleanNumeric.replace(/^GH/, '');

  return (
    memoryRooms.get(cleanNumeric) ||
    memoryRooms.get(cleanWithoutPrefix) ||
    memoryRooms.get(raw) ||
    memoryRooms.get(codeOrId) ||
    null
  );
}

export function addPlayerToMemoryRoom(codeOrId: string, player: Player): RoomInfo | null {
  const entry = getMemoryRoom(codeOrId);
  if (!entry) return null;

  const room = entry.room;
  const existingIndex = room.players.findIndex((p) => p.id === player.id);

  if (existingIndex >= 0) {
    room.players[existingIndex] = { ...room.players[existingIndex], ...player };
  } else {
    // If full, check if there is a bot that can be replaced
    const isSixPlayerGame =
      room.settings.gameId === 'impostor-desa' ||
      room.settings.gameId === 'hidden-team';
    const maxCapacity = isSixPlayerGame ? 6 : room.settings.maxPlayers;

    if (room.players.length >= maxCapacity) {
      const botIndex = room.players.findIndex((p) => p.isBot);
      if (botIndex >= 0) {
        room.players.splice(botIndex, 1);
      }
    }

    room.players.push(player);
  }

  saveMemoryRoom(room, entry.gameState, entry.gameResults);
  return room;
}

export function updateMemoryRoom(
  codeOrId: string,
  updates: Partial<RoomInfo>,
  gameState?: any,
  gameResults?: any
): RoomInfo | null {
  const entry = getMemoryRoom(codeOrId);
  if (!entry) return null;

  entry.room = { ...entry.room, ...updates };
  if (gameState !== undefined) entry.gameState = gameState;
  if (gameResults !== undefined) entry.gameResults = gameResults;

  saveMemoryRoom(entry.room, entry.gameState, entry.gameResults);
  return entry.room;
}

export async function getRoomByCode(
  code: string
): Promise<RoomEntry | null> {
  if (!code) return null;

  const raw = code.trim().toUpperCase();
  const cleanCode = raw.replace(/[^A-Za-z0-9]/g, '');

  // 1. First priority: Check in-memory store
  const memoryEntry = getMemoryRoom(cleanCode) || getMemoryRoom(raw);
  if (memoryEntry) {
    return memoryEntry;
  }

  // 2. Second priority: Check standalone game-server (port 4000)
  try {
    const gameServerUrl =
      process.env.GAME_SERVER_URL ||
      process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
      'http://localhost:4000';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const resp = await fetch(`${gameServerUrl}/api/rooms/${cleanCode}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.room) {
        const entry: RoomEntry = {
          room: data.room,
          gameState: data.gameState || null,
          gameResults: data.gameResults || null,
        };
        saveMemoryRoom(data.room, entry.gameState, entry.gameResults);
        return entry;
      }
    }
  } catch {
    // Standalone server not reachable or timed out
  }

  // 3. Third priority: Query MySQL database (safe, won't crash if offline)
  try {
    const [[roomRows], [playerRows]] = await Promise.all([
      safeDbQuery<any[]>('SELECT * FROM gh_rooms WHERE code = ? LIMIT 1', [cleanCode]),
      safeDbQuery<any[]>(
        'SELECT * FROM gh_players WHERE room_code = ? ORDER BY joined_at ASC',
        [cleanCode]
      ),
    ]);

    if (!roomRows || roomRows.length === 0) {
      return null;
    }

    const r = roomRows[0];

    const players: Player[] = (playerRows || []).map((p) => ({
      id: p.id,
      socketId: p.id,
      nickname: p.nickname,
      avatar: p.avatar as AvatarId,
      isHost: Boolean(p.is_host),
      isReady: Boolean(p.is_ready),
      isConnected: Boolean(p.is_connected),
      joinedAt: Number(p.joined_at),
    }));

    const settings: RoomSettings = {
      name: r.name,
      gameId: r.game_id as GameId,
      gameMode: r.game_mode as GameMode,
      maxPlayers: Number(r.max_players),
      durationSeconds: Number(r.duration_seconds),
      isPrivate: Boolean(r.is_private),
    };

    const room: RoomInfo = {
      id: r.id,
      code: r.code,
      settings,
      status: r.status as RoomStatus,
      hostId: r.host_id,
      players,
      createdAt: Number(r.created_at),
    };

    let gameState = null;
    if (r.game_state_json) {
      try {
        gameState = JSON.parse(r.game_state_json);
      } catch {
        gameState = null;
      }
    }

    let gameResults = null;
    if (r.game_results_json) {
      try {
        gameResults = JSON.parse(r.game_results_json);
      } catch {
        gameResults = null;
      }
    }

    const entry: RoomEntry = { room, gameState, gameResults };
    saveMemoryRoom(room, gameState, gameResults);
    return entry;
  } catch {
    return null;
  }
}
