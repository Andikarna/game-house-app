import { 
  Player, 
  RoomInfo, 
  RoomSettings, 
  AvatarId 
} from '@gamehouse/shared';
import { Server as SocketIOServer } from 'socket.io';
import { Room } from './Room';

export class RoomManager {
  private roomsById: Map<string, Room> = new Map();
  private roomsByCode: Map<string, Room> = new Map();
  private socketToPlayerMap: Map<string, { roomId: string; playerId: string }> = new Map();
  private emptyRoomTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // Generate super simple 5-digit number (e.g. 48291) - NO symbols, NO dashes!
  public generateRoomCode(): string {
    let code = '';
    let attempts = 0;
    
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
      attempts++;
    } while (this.roomsByCode.has(code) && attempts < 100);

    return code;
  }

  public createRoom(
    socketId: string,
    hostData: { nickname: string; avatar: AvatarId; playerId?: string },
    settings: RoomSettings
  ): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomCode = this.generateRoomCode();
    const playerId = hostData.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const hostPlayer: Player = {
      id: playerId,
      socketId,
      nickname: hostData.nickname.trim(),
      avatar: hostData.avatar,
      isHost: true,
      isReady: true,
      isConnected: true,
      joinedAt: Date.now(),
    };

    const room = new Room(
      roomId,
      roomCode,
      hostPlayer,
      settings,
      this.io,
      (emptyRoomId) => this.scheduleRoomCleanup(emptyRoomId)
    );

    this.roomsById.set(roomId, room);
    this.roomsByCode.set(roomCode, room);
    this.socketToPlayerMap.set(socketId, { roomId, playerId });

    return room;
  }

  public joinRoom(
    socketId: string,
    roomCodeOrId: string,
    playerData: { nickname: string; avatar: AvatarId; playerId?: string }
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    const raw = (roomCodeOrId || '').trim().toUpperCase();
    const cleanNumeric = raw.replace(/[^A-Za-z0-9]/g, '');
    const cleanWithoutPrefix = cleanNumeric.replace(/^GH/, '');

    // Search room by numeric code, raw code, prefix code, or internal room id
    const room = this.roomsByCode.get(cleanNumeric) ||
                 this.roomsByCode.get(cleanWithoutPrefix) ||
                 this.roomsByCode.get(raw) ||
                 this.roomsById.get(roomCodeOrId);

    if (!room) {
      return { 
        success: false, 
        error: `Room ${raw} not found. Please verify the 5-digit room code.` 
      };
    }

    // Cancel pending cleanup timeout if room was temporarily empty
    const pendingTimeout = this.emptyRoomTimeouts.get(room.id);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.emptyRoomTimeouts.delete(room.id);
    }

    const playerId = playerData.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isFirstInRoom = room.players.size === 0;

    const player: Player = {
      id: playerId,
      socketId,
      nickname: playerData.nickname.trim(),
      avatar: playerData.avatar,
      isHost: isFirstInRoom || room.hostId === playerId,
      isReady: isFirstInRoom || room.hostId === playerId,
      isConnected: true,
      joinedAt: Date.now(),
    };

    const result = room.addPlayer(player);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    this.socketToPlayerMap.set(socketId, { roomId: room.id, playerId });
    return { success: true, room, player };
  }

  public getRoomById(roomId: string): Room | undefined {
    return this.roomsById.get(roomId);
  }

  public getRoomByCode(code: string): Room | undefined {
    const raw = (code || '').trim().toUpperCase();
    const cleanNumeric = raw.replace(/[^A-Za-z0-9]/g, '');
    const cleanWithoutPrefix = cleanNumeric.replace(/^GH/, '');

    return this.roomsByCode.get(cleanNumeric) ||
           this.roomsByCode.get(cleanWithoutPrefix) ||
           this.roomsByCode.get(raw);
  }

  public getPlayerMapping(socketId: string): { roomId: string; playerId: string } | undefined {
    return this.socketToPlayerMap.get(socketId);
  }

  public handleSocketDisconnect(socketId: string): { room?: Room; playerId?: string; wasHost?: boolean } {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return {};

    const { roomId, playerId } = mapping;
    this.socketToPlayerMap.delete(socketId);

    const room = this.roomsById.get(roomId);
    if (!room) return {};

    const removal = room.removePlayer(playerId);
    return { room, playerId, wasHost: removal.wasHost };
  }

  // Grace period before deleting empty rooms (45 seconds) so browser page navigation/refresh doesn't destroy the room
  private scheduleRoomCleanup(roomId: string): void {
    if (this.emptyRoomTimeouts.has(roomId)) return;

    const timeout = setTimeout(() => {
      const room = this.roomsById.get(roomId);
      if (room && room.players.size === 0) {
        this.deleteRoom(roomId);
      }
      this.emptyRoomTimeouts.delete(roomId);
    }, 45000);

    this.emptyRoomTimeouts.set(roomId, timeout);
  }

  public deleteRoom(roomId: string): void {
    const room = this.roomsById.get(roomId);
    if (!room) return;

    this.roomsByCode.delete(room.code);
    this.roomsById.delete(roomId);
    const pendingTimeout = this.emptyRoomTimeouts.get(roomId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.emptyRoomTimeouts.delete(roomId);
    }
    room.cleanup();
  }

  public getStats(): { activeRooms: number; onlinePlayers: number } {
    let totalPlayers = 0;
    this.roomsById.forEach(r => {
      totalPlayers += r.players.size;
    });

    return {
      activeRooms: this.roomsById.size,
      onlinePlayers: totalPlayers,
    };
  }
}
