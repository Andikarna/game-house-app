import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getRoomByCode } from '../../../../lib/room-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code?.toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (playerId) {
      await pool.query(
        'UPDATE gh_players SET last_seen_at = ?, is_connected = 1 WHERE id = ? AND room_code = ?',
        [Date.now(), playerId, code]
      );
    }

    const roomData = await getRoomByCode(code);
    if (!roomData) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    // Fetch recent emotes (last 10 seconds)
    const tenSecondsAgo = Date.now() - 10000;
    const [emoteRows] = await pool.query<any[]>(
      'SELECT id, player_id as playerId, nickname, emote_id as emoteId, timestamp FROM gh_emotes WHERE room_code = ? AND timestamp > ? ORDER BY timestamp ASC',
      [code, tenSecondsAgo]
    );

    return NextResponse.json({
      success: true,
      room: roomData.room,
      gameState: roomData.gameState,
      gameResults: roomData.gameResults,
      emotes: emoteRows || [],
    });
  } catch (error: any) {
    console.error('[API get room error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch room.' }, { status: 500 });
  }
}
