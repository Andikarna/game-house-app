import pool from './db';

export async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS gh_rooms (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(16) UNIQUE NOT NULL,
        name VARCHAR(128) NOT NULL,
        game_id VARCHAR(32) NOT NULL,
        game_mode VARCHAR(32) NOT NULL,
        max_players INT NOT NULL DEFAULT 4,
        duration_seconds INT NOT NULL DEFAULT 120,
        is_private BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(32) NOT NULL DEFAULT 'lobby',
        host_id VARCHAR(64) NOT NULL,
        game_state_json LONGTEXT,
        game_results_json LONGTEXT,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS gh_players (
        id VARCHAR(64) PRIMARY KEY,
        room_code VARCHAR(16) NOT NULL,
        nickname VARCHAR(64) NOT NULL,
        avatar VARCHAR(32) NOT NULL,
        is_host BOOLEAN NOT NULL DEFAULT FALSE,
        is_ready BOOLEAN NOT NULL DEFAULT FALSE,
        is_connected BOOLEAN NOT NULL DEFAULT TRUE,
        last_seen_at BIGINT NOT NULL,
        joined_at BIGINT NOT NULL,
        INDEX idx_room_code (room_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS gh_emotes (
        id VARCHAR(64) PRIMARY KEY,
        room_code VARCHAR(16) NOT NULL,
        player_id VARCHAR(64) NOT NULL,
        nickname VARCHAR(64) NOT NULL,
        emote_id VARCHAR(32) NOT NULL,
        timestamp BIGINT NOT NULL,
        INDEX idx_room_emotes (room_code, timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[MySQL] GameHouse tables initialized successfully!');
  } finally {
    conn.release();
  }
}
