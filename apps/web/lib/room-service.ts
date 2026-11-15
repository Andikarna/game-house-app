import pool from './db';
import { RoomInfo, Player, RoomSettings, RoomStatus, GameId, GameMode, AvatarId } from '../shared';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getRoomByCode(code: string): Promise<{ room: RoomInfo; gameState: any; gameResults: any } | null> {
  const upperCode = code.toUpperCase();
  const [roomRows] = await pool.query<any[]>(
    'SELECT * FROM gh_rooms WHERE code = ? LIMIT 1',
    [upperCode]
  );

  if (!roomRows || roomRows.length === 0) {
    return null;
  }

  const r = roomRows[0];
  const [playerRows] = await pool.query<any[]>(
    'SELECT * FROM gh_players WHERE room_code = ? ORDER BY joined_at ASC',
    [upperCode]
  );

  const players: Player[] = playerRows.map((p) => ({
    id: p.id,
    socketId: p.id,
    nickname: p.nickname,
    avatar: p.avatar as AvatarId,
    isHost: Boolean(p.is_host),
    isReady: Boolean(p.is_ready),
    isConnected: Boolean(p.is_connected),
    joinedAt: Number(p.joined_at),
  }));

  const settings: RoomSettings = {
    name: r.name,
    gameId: r.game_id as GameId,
    gameMode: r.game_mode as GameMode,
    maxPlayers: Number(r.max_players),
    durationSeconds: Number(r.duration_seconds),
    isPrivate: Boolean(r.is_private),
  };

  const room: RoomInfo = {
    id: r.id,
    code: r.code,
    settings,
    status: r.status as RoomStatus,
    hostId: r.host_id,
    players,
    createdAt: Number(r.created_at),
  };

  let gameState = null;
  if (r.game_state_json) {
    try {
      gameState = JSON.parse(r.game_state_json);
    } catch {
      gameState = null;
    }
  }

  let gameResults = null;
  if (r.game_results_json) {
    try {
      gameResults = JSON.parse(r.game_results_json);
    } catch {
      gameResults = null;
    }
  }

  return { room, gameState, gameResults };
}
