import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '103.147.32.6',
  port: parseInt(process.env.MYSQL_PORT || '12000', 10),
  user: process.env.MYSQL_USER || 'u3290_7ui45c',
  password: process.env.MYSQL_PASSWORD || '6jTluoZGocWweREyR6VGQUM2',
  database: process.env.MYSQL_DATABASE || 'u3290_7ui45c',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 30000,
  queueLimit: 0,
  connectTimeout: 2000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
});

let isDbAlive: boolean | null = null;
let lastCheckTime = 0;

export async function isDatabaseConnected(): Promise<boolean> {
  const now = Date.now();
  if (isDbAlive !== null && now - lastCheckTime < 30000) {
    return isDbAlive;
  }
  lastCheckTime = now;
  try {
    const conn = await pool.getConnection();
    conn.release();
    isDbAlive = true;
    return true;
  } catch {
    isDbAlive = false;
    return false;
  }
}

export async function safeDbQuery<T = any>(sql: string, params?: any[]): Promise<[T, any]> {
  try {
    const alive = await isDatabaseConnected();
    if (!alive) {
      return [[] as any, []];
    }
    return (await pool.query(sql, params)) as any;
  } catch {
    isDbAlive = false;
    return [[] as any, []];
  }
}

export default pool;
