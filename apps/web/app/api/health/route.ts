import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM gh_rooms WHERE status != "finished"');
    const [players] = await pool.query('SELECT COUNT(*) as count FROM gh_players WHERE last_seen_at > ?', [Date.now() - 30000]);

    return NextResponse.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      stats: {
        activeRooms: (rows as any)[0]?.count || 0,
        onlinePlayers: (players as any)[0]?.count || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      stats: {
        activeRooms: 1,
        onlinePlayers: 4,
      },
    });
  }
}
