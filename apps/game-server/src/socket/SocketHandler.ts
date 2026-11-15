import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  RoomSettings, 
  GameId, 
  GameMode, 
  ClimberInput, 
  SkillType,
  AvatarId 
} from '@gamehouse/shared';
import { RoomManager } from '../rooms/RoomManager';

export function setupSocketHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Room Creation
    socket.on('room:create', ({ nickname, avatar, roomName, gameId, gameMode, maxPlayers, playerId }, callback) => {
      try {
        const cleanNickname = (nickname || 'Climber').trim().substring(0, 18);
        if (!cleanNickname || cleanNickname.length < 2) {
          return callback({ success: false, error: 'Nickname must be at least 2 characters.' });
        }

        const validAvatar: AvatarId = avatar || 'climber-red';
        const settings: RoomSettings = {
          name: (roomName || `${cleanNickname}'s Party`).trim().substring(0, 30),
          gameId: (gameId as GameId) || 'panjat-pinang',
          gameMode: (gameMode as GameMode) || 'classic-race',
          maxPlayers: Math.min(8, Math.max(2, maxPlayers || 8)),
          durationSeconds: 180,
          isPrivate: false,
        };

        const room = roomManager.createRoom(
          socket.id,
          { nickname: cleanNickname, avatar: validAvatar, playerId },
          settings
        );

        socket.join(room.id);
        const roomInfo = room.getInfo();

        callback({ success: true, room: roomInfo });
        io.to(room.id).emit('room:updated', roomInfo);
      } catch (err: any) {
        callback({ success: false, error: err?.message || 'Failed to create room.' });
      }
    });

    // 2. Room Joining
    socket.on('room:join', ({ roomCode, nickname, avatar, playerId }, callback) => {
      try {
        const cleanNickname = (nickname || 'Climber').trim().substring(0, 18);
        if (!cleanNickname || cleanNickname.length < 2) {
          return callback({ success: false, error: 'Nickname must be at least 2 characters.' });
        }

        const validAvatar: AvatarId = avatar || 'climber-blue';
        const joinResult = roomManager.joinRoom(
          socket.id,
          roomCode,
          { nickname: cleanNickname, avatar: validAvatar, playerId }
        );

        if (!joinResult.success || !joinResult.room || !joinResult.player) {
          return callback({ success: false, error: joinResult.error || 'Could not join room.' });
        }

        const room = joinResult.room;
        socket.join(room.id);

        const roomInfo = room.getInfo();
        callback({ success: true, room: roomInfo });

        // Notify other room members
        socket.to(room.id).emit('room:player-joined', joinResult.player);
        io.to(room.id).emit('room:updated', roomInfo);
      } catch (err: any) {
        callback({ success: false, error: err?.message || 'Error joining room.' });
      }
    });

    // 3. Room Leave
    socket.on('room:leave', () => {
      handlePlayerLeave(socket, io, roomManager);
    });

    // 4. Ready / Unready Toggle
    socket.on('room:ready', (isReady: boolean) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const success = room.setPlayerReady(mapping.playerId, isReady);
      if (success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 5. Update Room Settings (Host only)
    socket.on('room:update-settings', (newSettings: Partial<RoomSettings>) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const success = room.updateSettings(newSettings, mapping.playerId);
      if (success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 6. Kick Player (Host only)
    socket.on('room:kick-player', (targetPlayerId: string) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const targetPlayer = room.players.get(targetPlayerId);
      if (targetPlayer) {
        // Send kicking message to target socket
        io.to(targetPlayer.socketId).emit('room:kicked', 'You were kicked by the room host.');
        io.sockets.sockets.get(targetPlayer.socketId)?.leave(room.id);
      }

      const success = room.kickPlayer(targetPlayerId, mapping.playerId);
      if (success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 7. Start Game (Host only)
    socket.on('game:start', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const validation = room.canStartGame(mapping.playerId);
      if (!validation.canStart) {
        socket.emit('error:message', validation.reason || 'Cannot start game.');
        return;
      }

      // 3-2-1 Countdown before action starts
      room.status = 'countdown';
      io.to(room.id).emit('room:updated', room.getInfo());

      let countdown = 3;
      io.to(room.id).emit('game:countdown', countdown);

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.to(room.id).emit('game:countdown', countdown);
        } else {
          clearInterval(countdownInterval);
          const started = room.startGame();
          if (!started) {
            socket.emit('error:message', 'Failed to start game module.');
          }
        }
      }, 1000);
    });

    // 8. Player Game Input (Climber movement or Ludo dice / token moves)
    socket.on('game:input', (input: any) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;

      const gameInstance = room.getGameInstance();
      if (gameInstance) {
        gameInstance.handleInput(mapping.playerId, input);
      }
    });

    // 9. Player Skill Trigger
    socket.on('player:skill', (skill: SkillType) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;

      const gameInstance = room.getGameInstance();
      if (gameInstance) {
        gameInstance.handleSkill(mapping.playerId, skill);
      }
    });

    // 10. Game Rematch / Restart (Host only)
    socket.on('game:restart', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const success = room.restartGame(mapping.playerId);
      if (success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 11. Heartbeat / Ping Check
    socket.on('ping:check', (clientTimestamp: number, callback) => {
      if (typeof callback === 'function') {
        callback(clientTimestamp);
      }
    });

    // 12. Socket Disconnect
    socket.on('disconnect', () => {
      handlePlayerLeave(socket, io, roomManager);
    });
  });
}

function handlePlayerLeave(
  socket: Socket, 
  io: SocketIOServer, 
  roomManager: RoomManager
): void {
  const result = roomManager.handleSocketDisconnect(socket.id);
  if (result.room && result.playerId) {
    socket.leave(result.room.id);

    if (result.room.players.size > 0) {
      io.to(result.room.id).emit('room:player-left', {
        playerId: result.playerId,
        nickname: 'Player',
        newHostId: result.room.hostId,
      });
      io.to(result.room.id).emit('room:updated', result.room.getInfo());
    }
  }
}
