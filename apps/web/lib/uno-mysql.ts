/**
 * uno-mysql.ts
 * Replaces uno-supabase.ts — all UNO room & leaderboard persistence goes through MySQL.
 */
import { withConnection, ensureTables, safeDbQuery, dbQuery } from './db';
import {
  RoomInfo,
  GameMode,
  Player,
  PlayerGameResult,
  UnoLeaderboardEntry,
  ChatMessage,
  VoteKickState,
  AvatarId,
  RoomStatus,
  RoomSettings,
  GameId,
} from '../shared';
import type { RoomEntry } from './room-service';

// ─────────────────────────────────────────────────────────────────
// Leaderboard & match-history tables (auto-created on first use)
// ─────────────────────────────────────────────────────────────────

let unoTablesReady = false;

async function ensureUnoTables(): Promise<void> {
  if (unoTablesReady) return;
  try {
    await withConnection(async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS uno_match_history (
          id VARCHAR(64) PRIMARY KEY,
          room_code VARCHAR(16) NOT NULL,
          game_mode VARCHAR(32) NOT NULL,
          player_count INT NOT NULL DEFAULT 0,
          winner_id VARCHAR(64),
          winner_nickname VARCHAR(64),
          winner_avatar VARCHAR(32),
          rankings_json LONGTEXT,
          total_turns INT NOT NULL DEFAULT 0,
          duration_ms BIGINT NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL,
          INDEX idx_uno_matches_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS uno_leaderboard (
          nickname VARCHAR(64) PRIMARY KEY,
          avatar VARCHAR(32),
          wins INT NOT NULL DEFAULT 0,
          matches_played INT NOT NULL DEFAULT 0,
          total_score BIGINT NOT NULL DEFAULT 0,
          uno_shouts INT NOT NULL DEFAULT 0,
          updated_at BIGINT NOT NULL,
          INDEX idx_uno_lb_wins (wins, total_score)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    });
    unoTablesReady = true;
  } catch (err: any) {
    console.warn('[MySQL UNO] ensureUnoTables warning:', err?.code || err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Match recording
// ─────────────────────────────────────────────────────────────────

export async function recordUnoMatchResult(params: {
  roomCode: string;
  gameMode: GameMode;
  rankings: PlayerGameResult[];
  totalTurns: number;
  durationMs: number;
}): Promise<void> {
  if (params.rankings.length === 0) return;
  try {
    await ensureUnoTables();
    const winner = params.rankings[0];
    const matchId = `uno_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    await safeDbQuery(
      `INSERT IGNORE INTO uno_match_history
        (id, room_code, game_mode, player_count, winner_id, winner_nickname, winner_avatar, rankings_json, total_turns, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        params.roomCode,
        params.gameMode,
        params.rankings.length,
        winner?.playerId || null,
        winner?.nickname || null,
        winner?.avatar || null,
        JSON.stringify(params.rankings),
        params.totalTurns,
        params.durationMs,
        now,
      ]
    );

    await Promise.all(
      params.rankings.map(async (r) => {
        const cleanNick = (r.nickname || '').trim();
        if (!cleanNick) return;

        const [rows] = await safeDbQuery<any[]>(
          'SELECT wins, matches_played, total_score, uno_shouts FROM uno_leaderboard WHERE nickname = ? LIMIT 1',
          [cleanNick]
        );

        const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const wins = (existing?.wins || 0) + (r.rank === 1 ? 1 : 0);
        const matchesPlayed = (existing?.matches_played || 0) + 1;
        const totalScore = (existing?.total_score || 0) + (r.score || 0);
        const unoShouts = (existing?.uno_shouts || 0) + (r.skillsUsedCount || 0);

        await safeDbQuery(
          `INSERT INTO uno_leaderboard (nickname, avatar, wins, matches_played, total_score, uno_shouts, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             avatar = VALUES(avatar),
             wins = VALUES(wins),
             matches_played = VALUES(matches_played),
             total_score = VALUES(total_score),
             uno_shouts = VALUES(uno_shouts),
             updated_at = VALUES(updated_at)`,
          [cleanNick, r.avatar, wins, matchesPlayed, totalScore, unoShouts, now]
        );
      })
    );
  } catch (err: any) {
    console.warn('[MySQL UNO] recordUnoMatchResult non-blocking error:', err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Leaderboard fetch
// ─────────────────────────────────────────────────────────────────

export async function fetchUnoLeaderboardData(limit: number = 20): Promise<{
  schemaReady: boolean;
  leaderboard: UnoLeaderboardEntry[];
  recentMatches: any[];
}> {
  try {
    await ensureUnoTables();

    const [lbRows] = await safeDbQuery<any[]>(
      `SELECT nickname, avatar, wins, matches_played, total_score, uno_shouts, updated_at
       FROM uno_leaderboard
       ORDER BY wins DESC, total_score DESC
       LIMIT ?`,
      [limit]
    );

    const [histRows] = await safeDbQuery<any[]>(
      `SELECT id, room_code, game_mode, player_count, winner_nickname, winner_avatar, total_turns, duration_ms, created_at
       FROM uno_match_history
       ORDER BY created_at DESC
       LIMIT 8`
    );

    const leaderboard: UnoLeaderboardEntry[] = (Array.isArray(lbRows) ? lbRows : []).map((r) => ({
      nickname: r.nickname,
      avatar: r.avatar as AvatarId,
      wins: Number(r.wins || 0),
      matches_played: Number(r.matches_played || 0),
      total_score: Number(r.total_score || 0),
      uno_shouts: Number(r.uno_shouts || 0),
      updated_at: new Date(Number(r.updated_at || Date.now())).toISOString(),
    }));

    return {
      schemaReady: true,
      leaderboard,
      recentMatches: Array.isArray(histRows) ? histRows : [],
    };
  } catch (err: any) {
    console.warn('[MySQL UNO] fetchUnoLeaderboardData error:', err?.message || err);
    return { schemaReady: false, leaderboard: [], recentMatches: [] };
  }
}

// ─────────────────────────────────────────────────────────────────
// Room helpers (unchanged MySQL ops, stripped Supabase calls)
// ─────────────────────────────────────────────────────────────────

export function isUnoMySQLAvailable(): boolean {
  return true; // MySQL is always the primary store
}
