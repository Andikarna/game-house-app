import { NextResponse } from 'next/server';
import { safeDbQuery } from '../../../../lib/db';
import { getRoomByCode, saveMemoryRoom } from '../../../../lib/room-service';
import { checkLudoTimeout } from '../../../../lib/game-runner';

export const dynamic = 'force-dynamic';

// In-memory throttling map to prevent hammering MySQL on every 800ms poll
const lastHeartbeatMap = new Map<string, number>();

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const rawCode = params.code?.toUpperCase() || '';
    const code = rawCode.replace(/[^A-Za-z0-9]/g, '');
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
        safeDbQuery(
          'UPDATE gh_players SET last_seen_at = ?, is_connected = 1 WHERE id = ? AND room_code = ?',
          [now, playerId, code]
        ).catch(() => {});
      }
    }

    // Parallel fetch: Room data + Emotes
    const tenSecondsAgo = now - 10000;
    const [roomData, [emoteRows]] = await Promise.all([
      getRoomByCode(code),
      safeDbQuery<any[]>(
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
        const resultsJson = results ? JSON.stringify(results) : null;

        saveMemoryRoom(roomData.room, updatedState, results);

        await safeDbQuery(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [JSON.stringify(updatedState), resultsJson, newStatus, now, code]
        ).catch(() => {});
      }
    }

    if (roomData.activeVoteKick && Date.now() > roomData.activeVoteKick.expiresAt) {
      roomData.activeVoteKick = null;
      saveMemoryRoom(roomData.room, roomData.gameState, roomData.gameResults, null);
    }

    const recentChats = (roomData.chatMessages || []).filter((c) => now - c.timestamp < 15000);

    return NextResponse.json({
      success: true,
      room: roomData.room,
      gameState: roomData.gameState,
      gameResults: roomData.gameResults,
      emotes: emoteRows || [],
      voteKick: roomData.activeVoteKick || null,
      chats: recentChats,
    });
  } catch (error: any) {
    console.error('[API /api/rooms/[code] error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
