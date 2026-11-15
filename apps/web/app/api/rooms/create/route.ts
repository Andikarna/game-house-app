import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { generateRoomCode } from '../../../../lib/room-service';
import { RoomSettings, RoomInfo, Player, AvatarId } from '../../../../shared';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nickname = body.nickname?.trim();
    const avatar = body.avatar || 'budi';
    const gameId = body.gameId || body.settings?.gameId || 'ludo';
    const gameMode = body.gameMode || body.settings?.gameMode || 'classic';
    const maxPlayers = Number(body.maxPlayers || body.settings?.maxPlayers || 4);
    const roomName = body.roomName || body.settings?.name || `${nickname}'s Room`;
    const durationSeconds = Number(body.durationSeconds || body.settings?.durationSeconds || 120);

    if (!nickname || nickname.length < 2) {
      return NextResponse.json({ success: false, error: 'Nickname must be at least 2 characters.' }, { status: 400 });
    }

    let code = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const [existing] = await pool.query<any[]>('SELECT id FROM gh_rooms WHERE code = ?', [code]);
      if (!existing || existing.length === 0) {
        isUnique = true;
      } else {
        code = generateRoomCode();
        attempts++;
      }
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const playerId = body.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await pool.query(
      `INSERT INTO gh_rooms 
        (id, code, name, game_id, game_mode, max_players, duration_seconds, is_private, status, host_id, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'lobby', ?, ?, ?)`,
      [
        roomId,
        code,
        roomName,
        gameId,
        gameMode,
        maxPlayers,
        durationSeconds,
        0,
        playerId,
        now,
        now,
      ]
    );

    await pool.query(
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
        last_seen_at = VALUES(last_seen_at)`,
      [playerId, code, nickname, avatar, now, now]
    );

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
