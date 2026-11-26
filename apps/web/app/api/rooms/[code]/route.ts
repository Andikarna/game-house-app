import { NextResponse } from 'next/server';
import { safeDbQuery } from '../../../../lib/db';
import { getRoomByCode, saveMemoryRoom } from '../../../../lib/room-service';
import { checkLudoTimeout } from '../../../../lib/game-runner';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

// In-memory throttling map to prevent hammering MySQL on every poll
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
        safeDbQuery(
          'UPDATE gh_players SET last_seen_at = ?, is_connected = 1 WHERE id = ? AND room_code = ?',
          [now, playerId, code]
        ).catch(() => {});
      }
    }

    // Parallel fetch: Room data (with players, chats, voteKick) + Emotes
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

    // Check if Ludo turn timed out, bot needs to act, or passAt expired
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
        const newStatus = results ? 'finished' : 'in-game';
        const resultsJson = results ? JSON.stringify(results) : null;
        const expectedUpdatedAt = roomData.dbUpdatedAt || 0;
        const nextUpdatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);

        let wonRace = true;
        if (expectedUpdatedAt > 0) {
          const [updateRes] = await safeDbQuery<any>(
            'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ? AND updated_at = ?',
            [JSON.stringify(updatedState), resultsJson, newStatus, nextUpdatedAt, code, expectedUpdatedAt]
          );
          if (updateRes && typeof updateRes.affectedRows === 'number' && updateRes.affectedRows === 0) {
            wonRace = false;
          }
        } else {
          await safeDbQuery(
            'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
            [JSON.stringify(updatedState), resultsJson, newStatus, nextUpdatedAt, code]
          );
        }

        if (wonRace) {
          roomData.gameState = updatedState;
          roomData.dbUpdatedAt = nextUpdatedAt;
          if (results) {
            roomData.gameResults = results;
            roomData.room.status = 'finished';
          }
          saveMemoryRoom(
            roomData.room,
            updatedState,
            results,
            roomData.activeVoteKick,
            roomData.chatMessages,
            nextUpdatedAt
          );
        } else {
          // Another lambda already updated the room concurrently; return fresh DB state
          const fresh = await getRoomByCode(code);
          if (fresh) {
            roomData.room = fresh.room;
            roomData.gameState = fresh.gameState;
            roomData.gameResults = fresh.gameResults;
            roomData.activeVoteKick = fresh.activeVoteKick;
            roomData.chatMessages = fresh.chatMessages;
          }
        }
      }
    }

    if (roomData.activeVoteKick && Date.now() > roomData.activeVoteKick.expiresAt) {
      roomData.activeVoteKick = null;
      saveMemoryRoom(roomData.room, roomData.gameState, roomData.gameResults, null);
      safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]).catch(() => {});
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
