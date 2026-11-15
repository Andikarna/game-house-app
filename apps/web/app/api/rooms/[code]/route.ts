import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getRoomByCode } from '../../../../lib/room-service';
import { checkLudoTimeout } from '../../../../lib/game-runner';

export const dynamic = 'force-dynamic';

// In-memory throttling map to prevent hammering MySQL on every 800ms poll
const lastHeartbeatMap = new Map<string, number>();

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
    const now = Date.now();

    // Throttle heartbeat updates to at most once every 15 seconds per player
    if (playerId) {
      const lastSeen = lastHeartbeatMap.get(playerId) || 0;
      if (now - lastSeen > 15000) {
        lastHeartbeatMap.set(playerId, now);
        // Non-blocking background heartbeat update
        pool.query(
          'UPDATE gh_players SET last_seen_at = ?, is_connected = 1 WHERE id = ? AND room_code = ?',
          [now, playerId, code]
        ).catch((err) => {
          console.error('[Heartbeat error]:', err);
        });
      }
    }

    // Parallel fetch: Room data + Emotes
    const tenSecondsAgo = now - 10000;
    const [roomData, [emoteRows]] = await Promise.all([
      getRoomByCode(code),
      pool.query<any[]>(
        'SELECT id, player_id as playerId, nickname, emote_id as emoteId, timestamp FROM gh_emotes WHERE room_code = ? AND timestamp > ? ORDER BY timestamp ASC',
        [code, tenSecondsAgo]
      ),
    ]);

    if (!roomData) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    // Check if Ludo turn timed out or passAt expired
    if (
      roomData.room.status === 'in-game' &&
      roomData.room.settings.gameId === 'ludo' &&
      roomData.gameState
    ) {
      const { changed, gameState: updatedState, results } = checkLudoTimeout(
        roomData.room,
        roomData.gameState
      );
      if (changed) {
        roomData.gameState = updatedState;
        if (results) {
          roomData.gameResults = results;
          roomData.room.status = 'finished';
        }
        const newStatus = results ? 'finished' : 'in-game';
        pool.query(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [
            JSON.stringify(updatedState),
            results ? JSON.stringify(results) : null,
            newStatus,
            now,
            code,
          ]
        ).catch((err) => console.error('[Ludo auto-timeout update error]:', err));
      }
    }

    return NextResponse.json(
      {
        success: true,
        room: roomData.room,
        gameState: roomData.gameState,
        gameResults: roomData.gameResults,
        emotes: emoteRows || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[API get room error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch room.' }, { status: 500 });
  }
}
