import { NextResponse } from 'next/server';
import { safeDbQuery } from '../../../../lib/db';
import { getRoomByCode, addPlayerToMemoryRoom, saveMemoryRoom, RoomEntry } from '../../../../lib/room-service';
import { AvatarId, Player } from '../../../../shared';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = (body.code || body.roomCode || '')?.toString().trim().toUpperCase();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '');
    const nickname = (body.nickname || 'Player').trim();
    const avatar: AvatarId = body.avatar || 'budi';

    if (!cleanCode) {
      return NextResponse.json({ success: false, error: 'Room code is required.' }, { status: 400 });
    }

    if (!nickname || nickname.length < 2) {
      return NextResponse.json({ success: false, error: 'Nickname must be at least 2 characters.' }, { status: 400 });
    }

    // Try finding by clean code first, then raw code
    let roomData: RoomEntry | null = null;
    try {
      roomData = await getRoomByCode(cleanCode, { includeAux: false, throwOnDbError: true });
      if (!roomData && cleanCode !== rawCode) {
        roomData = await getRoomByCode(rawCode, { includeAux: false, throwOnDbError: true });
      }
    } catch (dbErr: any) {
      console.error('[API join DB error]:', dbErr?.code || dbErr?.message || dbErr);
      return NextResponse.json(
        {
          success: false,
          error: `Koneksi database sedang sibuk (${dbErr?.code || 'DB_ERROR'}). Silakan klik Join lagi.`,
        },
        { status: 503 }
      );
    }

    if (!roomData) {
      return NextResponse.json(
        { success: false, error: `Room ${cleanCode} not found. Please check the code.` },
        { status: 404 }
      );
    }

    const { room } = roomData;
    const now = Date.now();

    // 1. Check if this exact player is already in room (reconnection)
    if (body.playerId) {
      const existingPlayer = room.players.find((p) => p.id === body.playerId);
      if (existingPlayer) {
        existingPlayer.avatar = avatar;
        existingPlayer.isConnected = true;
        saveMemoryRoom(room, roomData.gameState, roomData.gameResults);

        await safeDbQuery(
          'UPDATE gh_players SET avatar = ?, is_connected = 1, last_seen_at = ? WHERE id = ?',
          [avatar, now, existingPlayer.id]
        );

        return NextResponse.json({
          success: true,
          room,
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

    const botIndex = room.players.findIndex((p) => (p as any).is_bot || p.isBot);
    if (room.players.length >= maxCapacity && botIndex < 0) {
      return NextResponse.json({
        success: false,
        error: isSixPlayerGame
          ? `Room sudah penuh (maksimal 6 pemain untuk ${room.settings.gameId === 'hidden-team' ? 'Hidden Team' : 'Impostor Desa'}).`
          : 'Room is already full.',
      }, { status: 400 });
    }

    if (room.players.length >= maxCapacity && botIndex >= 0) {
      const botPlayer = room.players[botIndex];
      room.players.splice(botIndex, 1);
      await safeDbQuery('DELETE FROM gh_players WHERE id = ?', [botPlayer.id]);
    }

    // 4. Nickname deduplication (e.g. "Player (2)")
    let finalNickname = nickname;
    let suffix = 2;
    const existingNicknames = room.players.map((p) => p.nickname.toLowerCase());
    while (existingNicknames.includes(finalNickname.toLowerCase())) {
      finalNickname = `${nickname} (${suffix})`;
      suffix++;
    }

    // 5. Generate player and add to room
    const newPlayerId = body.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      id: newPlayerId,
      socketId: newPlayerId,
      nickname: finalNickname,
      avatar,
      isHost: room.players.length === 0,
      isReady: room.players.length === 0,
      isConnected: true,
      joinedAt: now,
    };

    const updatedRoom = addPlayerToMemoryRoom(room.code, newPlayer) || room;

    await safeDbQuery(
      `INSERT INTO gh_players 
        (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
        room_code = VALUES(room_code),
        nickname = VALUES(nickname),
        avatar = VALUES(avatar),
        is_host = VALUES(is_host),
        is_ready = VALUES(is_ready),
        is_connected = 1,
        last_seen_at = VALUES(last_seen_at),
        joined_at = VALUES(joined_at)`,
      [newPlayerId, room.code, finalNickname, avatar, newPlayer.isHost ? 1 : 0, newPlayer.isReady ? 1 : 0, now, now]
    );

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      playerId: newPlayerId,
    });
  } catch (err: any) {
    console.error('[API /api/rooms/join error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to join room' },
      { status: 500 }
    );
  }
}
