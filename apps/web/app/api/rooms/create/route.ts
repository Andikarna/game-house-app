import { NextResponse } from 'next/server';
import { ensureTables, withConnection } from '../../../../lib/db';
import { generateRoomCode, saveMemoryRoom } from '../../../../lib/room-service';
import { RoomSettings, RoomInfo, Player, AvatarId, GameId, GameMode, GAME_AVAILABILITY } from '../../../../shared';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nickname = body.nickname?.trim();
    const avatar: AvatarId = body.avatar || 'budi';
    const gameId: GameId = body.gameId || body.settings?.gameId || 'ludo';
    const gameMode: GameMode = body.gameMode || body.settings?.gameMode || 'classic';
    const isHiddenTeam = gameId === 'hidden-team';
    const isImpostor = gameId === 'impostor-desa';
    const isLudo = gameId === 'ludo';
    const maxPlayers = isHiddenTeam
      ? 6
      : isImpostor
      ? Math.min(6, Math.max(4, Number(body.maxPlayers || 6)))
      : isLudo
      ? Math.min(6, Math.max(2, Number(body.maxPlayers || body.settings?.maxPlayers || 4)))
      : Number(body.maxPlayers || body.settings?.maxPlayers || 4);
    const roomName = body.roomName || body.settings?.name || (isHiddenTeam ? `${nickname}'s Council` : `${nickname}'s Arena`);
    const durationSeconds = Number(body.durationSeconds || body.settings?.durationSeconds || (isHiddenTeam ? 600 : 180));

    if (!nickname || nickname.length < 2) {
      return NextResponse.json({ success: false, error: 'Nickname must be at least 2 characters.' }, { status: 400 });
    }

    const avail = GAME_AVAILABILITY[gameId];
    if (avail && avail.status !== 'playable') {
      return NextResponse.json(
        { success: false, error: avail.reason || 'Game ini belum dapat dimainkan saat ini.' },
        { status: 400 }
      );
    }

    const code = generateRoomCode();
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const playerId = body.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const hostPlayer: Player = {
      id: playerId,
      socketId: playerId,
      nickname,
      avatar,
      isHost: true,
      isReady: true,
      isConnected: true,
      joinedAt: now,
    };

    const room: RoomInfo = {
      id: roomId,
      code,
      settings: {
        name: roomName,
        gameId,
        gameMode,
        maxPlayers,
        durationSeconds,
        isPrivate: false,
      },
      status: 'lobby',
      hostId: playerId,
      players: [hostPlayer],
      createdAt: now,
    };

    // 1. Save to in-memory store
    saveMemoryRoom(room, null, null, null, [], now);

    // 2. Persist player and room using one connection & standard single SQL statements
    try {
      await ensureTables();
      await withConnection(async (conn) => {
        await conn.query(
          `INSERT INTO gh_players 
            (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
           VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?)
           ON DUPLICATE KEY UPDATE
            room_code = VALUES(room_code),
            nickname = VALUES(nickname),
            avatar = VALUES(avatar),
            is_host = 1,
            is_ready = 1,
            is_connected = 1,
            last_seen_at = VALUES(last_seen_at),
            joined_at = VALUES(joined_at)`,
          [playerId, code, nickname, avatar, now, now]
        );
        await conn.query(
          `INSERT INTO gh_rooms 
            (id, code, name, game_id, game_mode, max_players, duration_seconds, is_private, status, host_id, updated_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'lobby', ?, ?, ?)`,
          [roomId, code, roomName, gameId, gameMode, maxPlayers, durationSeconds, 0, playerId, now, now]
        );
      });
    } catch (dbErr: any) {
      console.error('[API create room DB error]:', dbErr?.code || dbErr?.message || dbErr);
      if (process.env.VERCEL) {
        return NextResponse.json(
          {
            success: false,
            error: `Gagal menyimpan room ke database (${dbErr?.code || 'DB_ERROR'}). Silakan coba lagi.`,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      room,
      playerId,
    });
  } catch (error: any) {
    console.error('[API create room error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create room.' }, { status: 500 });
  }
}
