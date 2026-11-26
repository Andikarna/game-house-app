import mysql from 'mysql2/promise';

function buildPoolConfig(): mysql.PoolOptions {
  const baseOptions: mysql.PoolOptions = {
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
        ...baseOptions,
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ''),
      };
    } catch {
      // Fall through to discrete env vars
    }
  }

  return {
    ...baseOptions,
    host: process.env.MYSQL_HOST || '103.147.32.6',
    port: parseInt(process.env.MYSQL_PORT || '12000', 10),
    user: process.env.MYSQL_USER || 'u3290_7ui45c',
    password: process.env.MYSQL_PASSWORD || '6jTluoZGocWweREyR6VGQUM2',
    database: process.env.MYSQL_DATABASE || 'u3290_7ui45c',
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __gh_mysql_pool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var __gh_tables_ready: boolean | undefined;
}

const pool: mysql.Pool =
  globalThis.__gh_mysql_pool || (globalThis.__gh_mysql_pool = mysql.createPool(buildPoolConfig()));

let tablesPromise: Promise<void> | null = null;

export async function withConnection<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}

export async function ensureTables(): Promise<void> {
  if (globalThis.__gh_tables_ready) return;
  if (tablesPromise) return tablesPromise;

  tablesPromise = (async () => {
    try {
      await withConnection(async (conn) => {
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS gh_chats (
            id VARCHAR(64) PRIMARY KEY,
            room_code VARCHAR(16) NOT NULL,
            player_id VARCHAR(64) NOT NULL,
            nickname VARCHAR(64) NOT NULL,
            color VARCHAR(16),
            avatar VARCHAR(32) NOT NULL,
            message VARCHAR(128) NOT NULL,
            timestamp BIGINT NOT NULL,
            INDEX idx_room_chats (room_code, timestamp)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS gh_vote_kicks (
            room_code VARCHAR(16) PRIMARY KEY,
            data_json TEXT,
            updated_at BIGINT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      });
      globalThis.__gh_tables_ready = true;
    } catch (err) {
      console.warn('[MySQL] ensureTables warning:', (err as any)?.code || (err as any)?.message || err);
    } finally {
      tablesPromise = null;
    }
  })();

  return tablesPromise;
}

export const ensureAuxTables = ensureTables;

export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function dbQuery<T = any>(sql: string, params?: any[]): Promise<[T, any]> {
  return (await pool.query(sql, params)) as any;
}

export async function safeDbQuery<T = any>(sql: string, params?: any[]): Promise<[T, any]> {
  try {
    return (await pool.query(sql, params)) as any;
  } catch (err: any) {
    console.error('[MySQL safeDbQuery error]:', err?.code || err?.message || err);
    return [[] as any, []];
  }
}

export default pool;
