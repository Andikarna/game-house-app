import { withConnection, ensureTables } from './db';
import { fetchUnoRoomFromSupabase } from './uno-supabase';
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
  emotes?: any[];
  dbUpdatedAt?: number;
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
  chatMessages?: ChatMessage[],
  dbUpdatedAt?: number
): void {
  const cleanCode = (room.code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const existing = memoryRooms.get(cleanCode);
  const entry: RoomEntry = {
    room,
    gameState,
    gameResults,
    activeVoteKick: activeVoteKick !== undefined ? activeVoteKick : (existing?.activeVoteKick || null),
    chatMessages: chatMessages !== undefined ? chatMessages : (existing?.chatMessages || []),
    dbUpdatedAt: dbUpdatedAt !== undefined ? dbUpdatedAt : existing?.dbUpdatedAt,
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
    const isSixPlayerGame =
      room.settings.gameId === 'impostor-desa' ||
      room.settings.gameId === 'hidden-team';
    const maxCapacity = isSixPlayerGame
      ? 6
      : room.settings.gameId === 'uno'
      ? Math.min(10, Math.max(4, room.settings.maxPlayers || 6))
      : (room.settings.maxPlayers || 6);

    if (room.players.length >= maxCapacity) {
      const botIndex = room.players.findIndex((p) => p.isBot);
      if (botIndex >= 0) {
        room.players.splice(botIndex, 1);
      }
    }

    room.players.push(player);
  }

  saveMemoryRoom(room, entry.gameState, entry.gameResults, entry.activeVoteKick, entry.chatMessages, entry.dbUpdatedAt);
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

  saveMemoryRoom(entry.room, entry.gameState, entry.gameResults, entry.activeVoteKick, entry.chatMessages, entry.dbUpdatedAt);
  return entry.room;
}

export async function getRoomByCode(
  code: string,
  options?: { includeAux?: boolean; throwOnDbError?: boolean }
): Promise<RoomEntry | null> {
  if (!code) return null;

  const raw = code.trim().toUpperCase();
  const cleanCode = raw.replace(/[^A-Za-z0-9]/g, '');
  const includeAux = options?.includeAux !== false;

  const memoryEntry = getMemoryRoom(cleanCode) || getMemoryRoom(raw);

  // 0. Fast-path for UNO rooms backed by Supabase (never touch slow MySQL)
  const supabaseEntry = await fetchUnoRoomFromSupabase(cleanCode);
  if (supabaseEntry && supabaseEntry.room.players.length > 0) {
    saveMemoryRoom(
      supabaseEntry.room,
      supabaseEntry.gameState,
      supabaseEntry.gameResults,
      supabaseEntry.activeVoteKick,
      supabaseEntry.chatMessages,
      supabaseEntry.dbUpdatedAt
    );
    return supabaseEntry;
  }
  if (memoryEntry && memoryEntry.room.settings.gameId === 'uno') {
    return memoryEntry;
  }

  // 1. Query MySQL using strictly ONE pooled connection and standard single statements
  try {
    await ensureTables();

    const dbResult = await withConnection(async (conn) => {
      const [roomRows] = await conn.query<any[]>(
        'SELECT * FROM gh_rooms WHERE code = ? LIMIT 1',
        [cleanCode]
      );
      if (!Array.isArray(roomRows) || roomRows.length === 0) {
        return null;
      }

      const [playerRows] = await conn.query<any[]>(
        'SELECT * FROM gh_players WHERE room_code = ? ORDER BY joined_at ASC',
        [cleanCode]
      );

      let chatRows: any[] = [];
      let voteRows: any[] = [];
      let emoteRows: any[] = [];

      if (includeAux) {
        const now = Date.now();
        try {
          const [cRows] = await conn.query<any[]>(
            'SELECT id, player_id as playerId, nickname, color, avatar, message, timestamp FROM gh_chats WHERE room_code = ? AND timestamp > ? ORDER BY timestamp ASC',
            [cleanCode, now - 15000]
          );
          if (Array.isArray(cRows)) chatRows = cRows;
        } catch {}

        try {
          const [vRows] = await conn.query<any[]>(
            'SELECT data_json FROM gh_vote_kicks WHERE room_code = ? LIMIT 1',
            [cleanCode]
          );
          if (Array.isArray(vRows)) voteRows = vRows;
        } catch {}

        try {
          const [eRows] = await conn.query<any[]>(
            'SELECT id, player_id as playerId, nickname, emote_id as emoteId, timestamp FROM gh_emotes WHERE room_code = ? AND timestamp > ? ORDER BY timestamp ASC',
            [cleanCode, now - 10000]
          );
          if (Array.isArray(eRows)) emoteRows = eRows;
        } catch {}
      }

      return { roomRows, playerRows: Array.isArray(playerRows) ? playerRows : [], chatRows, voteRows, emoteRows };
    });

    if (dbResult && dbResult.roomRows.length > 0) {
      const r = dbResult.roomRows[0];

      const players: Player[] = dbResult.playerRows.map((p) => ({
        id: p.id,
        socketId: p.id,
        nickname: p.nickname,
        avatar: p.avatar as AvatarId,
        isHost: Boolean(p.is_host),
        isReady: Boolean(p.is_ready),
        isConnected: Boolean(p.is_connected),
        joinedAt: Number(p.joined_at),
        isBot: Boolean(p.is_bot) || String(p.id).startsWith('bot_'),
      }));

      // Guard: Never treat a transient empty-players race during room creation as 0 players if memory still holds players
      if (players.length === 0 && memoryEntry && memoryEntry.room.players.length > 0) {
        return memoryEntry;
      }

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
      if (room.status !== 'lobby' && r.game_state_json) {
        try {
          gameState = JSON.parse(r.game_state_json);
        } catch {
          gameState = null;
        }
      }

      let gameResults = null;
      if (room.status !== 'lobby' && r.game_results_json) {
        try {
          gameResults = JSON.parse(r.game_results_json);
        } catch {
          gameResults = null;
        }
      }

      let activeVoteKick: VoteKickState | null = memoryEntry?.activeVoteKick || null;
      let chatMessages: ChatMessage[] = memoryEntry?.chatMessages || [];
      const emotes: any[] = dbResult.emoteRows;

      if (includeAux) {
        activeVoteKick = null;
        if (dbResult.voteRows.length > 0 && dbResult.voteRows[0]?.data_json) {
          try {
            const parsed = JSON.parse(dbResult.voteRows[0].data_json) as VoteKickState;
            if (parsed && Date.now() <= parsed.expiresAt) {
              activeVoteKick = parsed;
            }
          } catch {
            activeVoteKick = null;
          }
        }

        chatMessages = dbResult.chatRows.map((c) => ({
          id: c.id,
          playerId: c.playerId,
          nickname: c.nickname,
          color: c.color || undefined,
          avatar: c.avatar as AvatarId,
          message: c.message,
          timestamp: Number(c.timestamp),
        }));
      }

      const dbUpdatedAt = Number(r.updated_at) || 0;
      const entry: RoomEntry = {
        room,
        gameState,
        gameResults,
        activeVoteKick,
        chatMessages,
        emotes,
        dbUpdatedAt,
      };
      saveMemoryRoom(room, gameState, gameResults, activeVoteKick, chatMessages, dbUpdatedAt);
      return entry;
    }
  } catch (err) {
    console.error('[getRoomByCode] DB query failed:', (err as any)?.code || (err as any)?.message || err);
    if (options?.throwOnDbError) {
      throw err;
    }
  }

  // 2. Second priority: Check standalone game-server ONLY if configured explicitly
  const configuredGameServerUrl =
    process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL;

  if (configuredGameServerUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const resp = await fetch(`${configuredGameServerUrl}/api/rooms/${cleanCode}`, {
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
            activeVoteKick: memoryEntry?.activeVoteKick || null,
            chatMessages: memoryEntry?.chatMessages || [],
          };
          saveMemoryRoom(data.room, entry.gameState, entry.gameResults);
          return entry;
        }
      }
    } catch {
      // Standalone server not reachable
    }
  }

  // 3. Fallback: Check in-memory store (e.g. offline dev without MySQL)
  if (memoryEntry) {
    return memoryEntry;
  }

  return null;
}
