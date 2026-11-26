import mysql from 'mysql2/promise';

function buildPoolConfig(): mysql.PoolOptions {
  const baseOptions: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 15000,
    queueLimit: 0,
    connectTimeout: 6000,
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
  var __gh_aux_tables_ready: boolean | undefined;
}

const pool: mysql.Pool =
  globalThis.__gh_mysql_pool || (globalThis.__gh_mysql_pool = mysql.createPool(buildPoolConfig()));

let auxTablesPromise: Promise<void> | null = null;

export async function ensureAuxTables(): Promise<void> {
  if (globalThis.__gh_aux_tables_ready) return;
  if (auxTablesPromise) return auxTablesPromise;

  auxTablesPromise = (async () => {
    try {
      await Promise.all([
        pool.query(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `),
        pool.query(`
          CREATE TABLE IF NOT EXISTS gh_vote_kicks (
            room_code VARCHAR(16) PRIMARY KEY,
            data_json TEXT,
            updated_at BIGINT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `),
      ]);
      globalThis.__gh_aux_tables_ready = true;
    } catch (err) {
      console.warn('[MySQL] ensureAuxTables warning:', (err as any)?.message || err);
    } finally {
      auxTablesPromise = null;
    }
  })();

  return auxTablesPromise;
}

export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
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
