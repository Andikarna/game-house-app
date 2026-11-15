import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getRoomByCode } from '../../../../lib/room-service';
import { AvatarId } from '../../../../shared';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.code || body.roomCode)?.toUpperCase()?.trim();
    const nickname = body.nickname?.trim();
    const avatar = body.avatar || 'budi';

    if (!code) {
      return NextResponse.json({ success: false, error: 'Room code is required.' }, { status: 400 });
    }

    if (!nickname || nickname.length < 2) {
      return NextResponse.json({ success: false, error: 'Nickname must be at least 2 characters.' }, { status: 400 });
    }

    const roomData = await getRoomByCode(code);

    if (!roomData) {
      return NextResponse.json({ success: false, error: 'Room not found. Please check the code.' }, { status: 404 });
    }

    const { room } = roomData;

    if (room.status !== 'lobby') {
      return NextResponse.json({ success: false, error: 'Game has already started in this room.' }, { status: 400 });
    }

    // Check if player is already in room
    const existingPlayer = room.players.find((p) => p.id === body.playerId || p.nickname.toLowerCase() === nickname.toLowerCase());
    if (existingPlayer) {
      const now = Date.now();
      await pool.query(
        'UPDATE gh_players SET avatar = ?, is_connected = 1, last_seen_at = ? WHERE id = ?',
        [avatar, now, existingPlayer.id]
      );
      const updated = await getRoomByCode(code);
      return NextResponse.json({
        success: true,
        room: updated?.room || room,
        playerId: existingPlayer.id,
      });
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return NextResponse.json({ success: false, error: 'Room is already full.' }, { status: 400 });
    }

    const playerId = body.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await pool.query(
      `INSERT INTO gh_players 
        (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
       VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
        room_code = VALUES(room_code),
        nickname = VALUES(nickname),
        avatar = VALUES(avatar),
        is_host = 0,
        is_ready = 0,
        is_connected = 1,
        last_seen_at = VALUES(last_seen_at)`,
      [playerId, code, nickname, avatar, now, now]
    );

    const updatedRoomData = await getRoomByCode(code);

    return NextResponse.json({
      success: true,
      room: updatedRoomData?.room || room,
      playerId,
    });
  } catch (error: any) {
    console.error('[API join room error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to join room.' }, { status: 500 });
  }
}
