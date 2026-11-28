import mysql from 'mysql2/promise';
import { GameMode, PlayerGameResult, UnoLeaderboardEntry } from '@gamehouse/shared';

function buildPoolConfig(): mysql.PoolOptions {
  const base: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: 3,
    maxIdle: 1,
    idleTimeout: 5000,
    queueLimit: 0,
    connectTimeout: 8000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 5000,
  };

  const urlStr = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (urlStr) {
    try {
      const parsed = new URL(urlStr);
      return {
        ...base,
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ''),
      };
    } catch {}
  }

  return {
    ...base,
    host: process.env.MYSQL_HOST || '103.147.32.6',
    port: parseInt(process.env.MYSQL_PORT || '12000', 10),
    user: process.env.MYSQL_USER || 'u3290_7ui45c',
    password: process.env.MYSQL_PASSWORD || '6jTluoZGocWweREyR6VGQUM2',
    database: process.env.MYSQL_DATABASE || 'u3290_7ui45c',
  };
}

let pool: mysql.Pool | null = null;
let tablesReady = false;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(buildPoolConfig());
  }
  return pool;
}

async function ensureUnoTables(): Promise<void> {
  if (tablesReady) return;
  try {
    const conn = await getPool().getConnection();
    try {
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
      tablesReady = true;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.warn('[MySQL UNO] ensureUnoTables warning:', err?.code || err?.message || err);
  }
}

export async function recordUnoMatchToMySQL(params: {
  roomCode: string;
  gameMode: GameMode;
  rankings: PlayerGameResult[];
  totalTurns: number;
  durationMs: number;
}): Promise<void> {
  if (params.rankings.length === 0) return;

  try {
    await ensureUnoTables();
    const p = getPool();
    const winner = params.rankings[0];
    const matchId = `uno_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    await p.query(
      `INSERT INTO uno_match_history
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

    // Upsert leaderboard for each human player
    await Promise.all(
      params.rankings.map(async (r) => {
        const cleanNick = (r.nickname || '').trim();
        if (!cleanNick) return;

        const [rows] = await p.query<any[]>(
          'SELECT wins, matches_played, total_score, uno_shouts FROM uno_leaderboard WHERE nickname = ? LIMIT 1',
          [cleanNick]
        );

        const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const wins = (existing?.wins || 0) + (r.rank === 1 ? 1 : 0);
        const matchesPlayed = (existing?.matches_played || 0) + 1;
        const totalScore = (existing?.total_score || 0) + (r.score || 0);
        const unoShouts = (existing?.uno_shouts || 0) + (r.skillsUsedCount || 0);

        await p.query(
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
    console.warn('[MySQL UNO] recordUnoMatchToMySQL non-blocking error:', err?.message || err);
  }
}
