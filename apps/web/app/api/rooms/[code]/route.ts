import { NextResponse } from 'next/server';
import { safeDbQuery } from '../../../../lib/db';
import { getRoomByCode, saveMemoryRoom, RoomEntry } from '../../../../lib/room-service';
import { checkLudoTimeout, checkSnakeTimeout, checkUnoTimeout, sanitizeUnoForClient } from '../../../../lib/game-runner';
import { recordUnoMatchResult } from '../../../../lib/uno-mysql';

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
    const clientU = Number(searchParams.get('u') || 0);
    const clientV = Number(searchParams.get('v') || 0);
    const clientPc = Number(searchParams.get('pc') || 0);
    const clientCs = Number(searchParams.get('cs') || 0);
    const clientEs = Number(searchParams.get('es') || 0);
    const clientVk = searchParams.get('vk') === '1';
    const now = Date.now();

    let roomData: RoomEntry | null = null;
    try {
      roomData = await getRoomByCode(code, { includeAux: true, throwOnDbError: true });
    } catch {
      // Transient DB error: return 503 so client skips this poll without blanking players
      return NextResponse.json(
        { success: false, retry: true, error: 'Database temporarily busy.' },
        { status: 503 }
      );
    }

    if (!roomData) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

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

    // Never return a transient 0-player room snapshot to polling clients
    if (!roomData.room.players || roomData.room.players.length === 0) {
      return NextResponse.json(
        { success: false, retry: true, error: 'Syncing room players...' },
        { status: 503 }
      );
    }

    let ludoChanged = false;
    const isUno = roomData.room.settings.gameId === 'uno';

    // Check if Ludo, Snake-Ladder, or UNO turn timed out or bot needs to act
    if (
      roomData.room.status === 'in-game' &&
      (roomData.room.settings.gameId === 'ludo' ||
        roomData.room.settings.gameId === 'snake-ladder' ||
        isUno) &&
      roomData.gameState
    ) {
      const { changed, gameState: updatedState, results } =
        isUno
          ? checkUnoTimeout(roomData.room, roomData.gameState)
          : roomData.room.settings.gameId === 'snake-ladder'
          ? checkSnakeTimeout(roomData.room, roomData.gameState)
          : checkLudoTimeout(roomData.room, roomData.gameState);
      if (changed) {
        ludoChanged = true;
        const newStatus = results ? 'finished' : 'in-game';
        const resultsJson = results ? JSON.stringify(results) : null;
        const expectedUpdatedAt = roomData.dbUpdatedAt || 0;
        const nextUpdatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);

        let wonRace = true;
        if (isUno) {
          // MySQL CAS: only update if updated_at matches expected
          if (expectedUpdatedAt > 0) {
            const [updateRes] = await safeDbQuery<any>(
              'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ? AND updated_at = ?',
              [JSON.stringify(updatedState), resultsJson, newStatus, nextUpdatedAt, code, expectedUpdatedAt]
            );
            wonRace = !(updateRes && typeof updateRes.affectedRows === 'number' && updateRes.affectedRows === 0);
          } else {
            await safeDbQuery(
              'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
              [JSON.stringify(updatedState), resultsJson, newStatus, nextUpdatedAt, code]
            );
          }
          if (wonRace && results) {
            recordUnoMatchResult({
              roomCode: code,
              gameMode: roomData.room.settings.gameMode,
              rankings: results.rankings || [],
              totalTurns: updatedState?.turnCount || 0,
              durationMs: Math.max(0, Date.now() - (updatedState?.startedAt || Date.now())),
            }).catch(() => {});
          }
        } else {
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
          const fresh = await getRoomByCode(code, { includeAux: true });
          if (fresh && fresh.room.players.length > 0) {
            roomData.room = fresh.room;
            roomData.gameState = fresh.gameState;
            roomData.gameResults = fresh.gameResults;
            roomData.activeVoteKick = fresh.activeVoteKick;
            roomData.chatMessages = fresh.chatMessages;
            roomData.emotes = fresh.emotes;
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
    const recentEmotes = roomData.emotes || [];
    const latestChatTs = recentChats.length > 0 ? recentChats[recentChats.length - 1].timestamp : 0;
    const latestEmoteTs = recentEmotes.length > 0 ? Number(recentEmotes[recentEmotes.length - 1].timestamp) : 0;
    const hasActiveVoteKick = Boolean(roomData.activeVoteKick);

    // Fast-path lightweight response during gameplay when nothing changed
    if (
      roomData.room.status === 'in-game' &&
      !ludoChanged &&
      clientU > 0 &&
      clientU === (roomData.dbUpdatedAt || 0) &&
      clientV > 0 &&
      clientV === (roomData.gameState?.stateVersion || 0) &&
      clientPc === roomData.room.players.length &&
      latestChatTs <= clientCs &&
      latestEmoteTs <= clientEs &&
      hasActiveVoteKick === clientVk &&
      !hasActiveVoteKick
    ) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        u: roomData.dbUpdatedAt,
      });
    }

    return NextResponse.json({
      success: true,
      u: roomData.dbUpdatedAt || 0,
      room: roomData.room,
      gameState: isUno ? sanitizeUnoForClient(roomData.gameState, playerId) : roomData.gameState,
      gameResults: roomData.gameResults,
      emotes: recentEmotes,
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
