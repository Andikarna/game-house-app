import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getRoomByCode } from '../../../../lib/room-service';
import { AvatarId } from '../../../../shared';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = (body.code || body.roomCode || '')?.toString().trim().toUpperCase();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '');
    const nickname = (body.nickname || 'Player').trim();
    const avatar = body.avatar || 'budi';

    if (!cleanCode) {
      return NextResponse.json({ success: false, error: 'Room code is required.' }, { status: 400 });
    }

    if (!nickname || nickname.length < 2) {
      return NextResponse.json({ success: false, error: 'Nickname must be at least 2 characters.' }, { status: 400 });
    }

    // Try finding by clean code first, then raw code
    let roomData = await getRoomByCode(cleanCode);
    if (!roomData && cleanCode !== rawCode) {
      roomData = await getRoomByCode(rawCode);
    }

    if (!roomData) {
      return NextResponse.json({ success: false, error: `Room ${cleanCode} not found. Please check the code.` }, { status: 404 });
    }

    const { room } = roomData;

    // 1. Check if this exact player is already in room (reconnection)
    if (body.playerId) {
      const existingPlayer = room.players.find((p) => p.id === body.playerId);
      if (existingPlayer) {
        const now = Date.now();
        await pool.query(
          'UPDATE gh_players SET avatar = ?, is_connected = 1, last_seen_at = ? WHERE id = ?',
          [avatar, now, existingPlayer.id]
        );
        const updated = await getRoomByCode(room.code);
        return NextResponse.json({
          success: true,
          room: updated?.room || room,
          playerId: existingPlayer.id,
        });
      }
    }

    // 2. If new player and game is already in progress/finished, block joining
    if (room.status !== 'lobby') {
      return NextResponse.json({ success: false, error: 'Game has already started in this room.' }, { status: 400 });
    }

    // 3. Check capacity and bot replacement
    const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
    const maxCapacity = isSixPlayerGame ? 6 : (room.settings.maxPlayers || 4);

    const botPlayer = room.players.find((p) => (p as any).is_bot || p.isBot);
    if (room.players.length >= maxCapacity && !botPlayer) {
      return NextResponse.json({
        success: false,
        error: isSixPlayerGame
          ? `Room sudah penuh (maksimal 6 pemain untuk ${room.settings.gameId === 'hidden-team' ? 'Hidden Team' : 'Impostor Desa'}).`
          : 'Room is already full.',
      }, { status: 400 });
    }

    if (room.players.length >= maxCapacity && botPlayer) {
      // Free up space by replacing the bot
      await pool.query('DELETE FROM gh_players WHERE id = ?', [botPlayer.id]);
    }

    // 4. Nickname deduplication (e.g. "Player (2)")
    let finalNickname = nickname;
    let suffix = 2;
    const existingNicknames = room.players
      .filter((p) => p.id !== botPlayer?.id)
      .map((p) => p.nickname.toLowerCase());

    while (existingNicknames.includes(finalNickname.toLowerCase())) {
      finalNickname = `${nickname} (${suffix})`;
      suffix++;
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
      [playerId, room.code, finalNickname, avatar, now, now]
    );

    const updatedRoomData = await getRoomByCode(room.code);

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
