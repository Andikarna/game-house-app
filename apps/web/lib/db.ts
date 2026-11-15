import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '103.147.32.6',
  port: parseInt(process.env.MYSQL_PORT || '12000', 10),
  user: process.env.MYSQL_USER || 'u3290_7ui45c',
  password: process.env.MYSQL_PASSWORD || '6jTluoZGocWweREyR6VGQUM2',
  database: process.env.MYSQL_DATABASE || 'u3290_7ui45c',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

export default pool;
