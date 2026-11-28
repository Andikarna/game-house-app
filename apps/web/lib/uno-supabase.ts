import { getSupabaseClient } from './supabase';
import {
  RoomInfo,
  GameMode,
  PlayerGameResult,
  UnoLeaderboardEntry,
  ChatMessage,
  VoteKickState,
} from '../shared';
import type { RoomEntry } from './room-service';

let schemaMissingUntil = 0;

function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    String(error.message || '').includes('schema cache') ||
    String(error.message || '').includes('does not exist')
  );
}

export function isUnoSupabaseAvailable(): boolean {
  return Date.now() >= schemaMissingUntil;
}

function markSchemaMissing() {
  schemaMissingUntil = Date.now() + 30_000;
}

function rowToRoomEntry(row: any): RoomEntry {
  const players = Array.isArray(row.players_json) ? row.players_json : [];
  const room: RoomInfo = {
    id: row.room_id,
    code: row.code,
    settings: {
      name: row.name,
      gameId: 'uno',
      gameMode: (row.game_mode || 'uno-classic') as GameMode,
      maxPlayers: Number(row.max_players || 6),
      durationSeconds: Number(row.duration_seconds || 480),
      isPrivate: false,
    },
    status: row.status || 'lobby',
    hostId: row.host_id,
    players,
    createdAt: Number(row.created_at || Date.now()),
  };

  return {
    room,
    gameState: row.game_state_json || null,
    gameResults: row.game_results_json || null,
    activeVoteKick: (row.vote_kick_json as VoteKickState) || null,
    chatMessages: Array.isArray(row.chats_json) ? (row.chats_json as ChatMessage[]) : [],
    emotes: Array.isArray(row.emotes_json) ? row.emotes_json : [],
    dbUpdatedAt: Number(row.updated_at || Date.now()),
  };
}

export async function fetchUnoRoomFromSupabase(code: string): Promise<RoomEntry | null> {
  if (!isUnoSupabaseAvailable()) return null;
  const cleanCode = (code || '').trim().toUpperCase().replace(/[^A-Za-z0-9]/g, '');
  if (!cleanCode) return null;

  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('uno_rooms')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error) {
      if (isSchemaMissingError(error)) markSchemaMissing();
      return null;
    }
    if (!data) return null;
    return rowToRoomEntry(data);
  } catch {
    return null;
  }
}

export async function upsertUnoRoomToSupabase(entry: RoomEntry): Promise<boolean> {
  if (!isUnoSupabaseAvailable()) return false;
  try {
    const sb = getSupabaseClient();
    const now = entry.dbUpdatedAt || Date.now();
    const { error } = await sb.from('uno_rooms').upsert(
      {
        code: entry.room.code,
        room_id: entry.room.id,
        name: entry.room.settings.name,
        game_mode: entry.room.settings.gameMode,
        max_players: entry.room.settings.maxPlayers,
        duration_seconds: entry.room.settings.durationSeconds,
        status: entry.room.status,
        host_id: entry.room.hostId,
        players_json: entry.room.players,
        game_state_json: entry.gameState || null,
        game_results_json: entry.gameResults || null,
        chats_json: entry.chatMessages || [],
        emotes_json: entry.emotes || [],
        vote_kick_json: entry.activeVoteKick || null,
        state_version: entry.gameState?.stateVersion || 0,
        updated_at: now,
        created_at: entry.room.createdAt || now,
      },
      { onConflict: 'code' }
    );

    if (error) {
      if (isSchemaMissingError(error)) markSchemaMissing();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function updateUnoRoomCAS(
  code: string,
  expectedUpdatedAt: number,
  entry: RoomEntry
): Promise<{ ok: boolean; wonRace: boolean; fresh?: RoomEntry | null }> {
  if (!isUnoSupabaseAvailable()) {
    return { ok: false, wonRace: true };
  }

  try {
    const sb = getSupabaseClient();
    const nextUpdatedAt = entry.dbUpdatedAt || Math.max(Date.now(), expectedUpdatedAt + 1);
    const payload = {
      status: entry.room.status,
      host_id: entry.room.hostId,
      game_mode: entry.room.settings.gameMode,
      max_players: entry.room.settings.maxPlayers,
      players_json: entry.room.players,
      game_state_json: entry.gameState || null,
      game_results_json: entry.gameResults || null,
      chats_json: entry.chatMessages || [],
      emotes_json: entry.emotes || [],
      vote_kick_json: entry.activeVoteKick || null,
      state_version: entry.gameState?.stateVersion || 0,
      updated_at: nextUpdatedAt,
    };

    let query = sb.from('uno_rooms').update(payload).eq('code', code);
    if (expectedUpdatedAt > 0) {
      query = query.eq('updated_at', expectedUpdatedAt);
    }

    const { data, error } = await query.select('code');
    if (error) {
      if (isSchemaMissingError(error)) markSchemaMissing();
      return { ok: false, wonRace: true };
    }

    if (expectedUpdatedAt > 0 && (!data || data.length === 0)) {
      const fresh = await fetchUnoRoomFromSupabase(code);
      return { ok: true, wonRace: false, fresh };
    }

    return { ok: true, wonRace: true };
  } catch {
    return { ok: false, wonRace: true };
  }
}

export async function deleteUnoRoomFromSupabase(code: string): Promise<void> {
  if (!isUnoSupabaseAvailable()) return;
  try {
    const sb = getSupabaseClient();
    await sb.from('uno_rooms').delete().eq('code', code);
  } catch {}
}

export async function recordUnoMatchResult(params: {
  roomCode: string;
  gameMode: GameMode;
  rankings: PlayerGameResult[];
  totalTurns: number;
  durationMs: number;
}): Promise<void> {
  if (!isUnoSupabaseAvailable() || params.rankings.length === 0) return;

  try {
    const sb = getSupabaseClient();
    const winner = params.rankings[0];
    const matchId = `uno_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const { error } = await sb.from('uno_match_history').insert({
      id: matchId,
      room_code: params.roomCode,
      game_mode: params.gameMode,
      player_count: params.rankings.length,
      winner_id: winner?.playerId || null,
      winner_nickname: winner?.nickname || null,
      winner_avatar: winner?.avatar || null,
      rankings_json: params.rankings,
      total_turns: params.totalTurns,
      duration_ms: params.durationMs,
    });

    if (error) {
      if (isSchemaMissingError(error)) markSchemaMissing();
      return;
    }

    await Promise.all(
      params.rankings.map(async (r) => {
        const cleanNick = r.nickname.trim();
        if (!cleanNick) return;
        const { data: existing } = await sb
          .from('uno_leaderboard')
          .select('nickname, wins, matches_played, total_score, uno_shouts')
          .eq('nickname', cleanNick)
          .maybeSingle();

        const nextEntry: UnoLeaderboardEntry = {
          nickname: cleanNick,
          avatar: r.avatar,
          wins: (existing?.wins || 0) + (r.rank === 1 ? 1 : 0),
          matches_played: (existing?.matches_played || 0) + 1,
          total_score: (existing?.total_score || 0) + (r.score || 0),
          uno_shouts: (existing?.uno_shouts || 0) + (r.skillsUsedCount || 0),
          updated_at: new Date().toISOString(),
        };

        await sb.from('uno_leaderboard').upsert(nextEntry, { onConflict: 'nickname' });
      })
    );
  } catch {}
}

export async function fetchUnoLeaderboardData(limit: number = 15): Promise<{
  schemaReady: boolean;
  leaderboard: UnoLeaderboardEntry[];
  recentMatches: any[];
}> {
  try {
    const sb = getSupabaseClient();
    const [lbRes, histRes] = await Promise.all([
      sb
        .from('uno_leaderboard')
        .select('*')
        .order('wins', { ascending: false })
        .order('total_score', { ascending: false })
        .limit(limit),
      sb
        .from('uno_match_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    if (lbRes.error && isSchemaMissingError(lbRes.error)) {
      markSchemaMissing();
      return { schemaReady: false, leaderboard: [], recentMatches: [] };
    }

    return {
      schemaReady: !lbRes.error,
      leaderboard: (lbRes.data || []) as UnoLeaderboardEntry[],
      recentMatches: histRes.data || [],
    };
  } catch {
    return { schemaReady: false, leaderboard: [], recentMatches: [] };
  }
}
