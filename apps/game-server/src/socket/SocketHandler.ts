import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  RoomSettings, 
  GameId, 
  GameMode, 
  ClimberInput, 
  SkillType,
  AvatarId,
  EmoteId,
  GAME_AVAILABILITY
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
        const targetGameId = (gameId as GameId) || 'ludo';
        const avail = GAME_AVAILABILITY[targetGameId];
        if (avail && avail.status !== 'playable') {
          return callback({ success: false, error: avail.reason || 'Game ini belum dapat dimainkan saat ini.' });
        }

        const cleanNickname = (nickname || 'Climber').trim().substring(0, 18);
        if (!cleanNickname || cleanNickname.length < 2) {
          return callback({ success: false, error: 'Nickname must be at least 2 characters.' });
        }

        const validAvatar: AvatarId = avatar || 'budi';
        const isImpostorGame = (gameId as GameId) === 'impostor-desa';
        const isHiddenTeamGame = (gameId as GameId) === 'hidden-team';
        const isSixMaxBoardGame = (gameId as GameId) === 'ludo' || (gameId as GameId) === 'snake-ladder';
        const targetMaxPlayers = isHiddenTeamGame
          ? 6
          : isImpostorGame
          ? Math.min(6, Math.max(4, maxPlayers || 6))
          : isSixMaxBoardGame
          ? Math.min(6, Math.max(2, maxPlayers || 4))
          : Math.min(8, Math.max(2, maxPlayers || 8));

        const defaultRoomName = isHiddenTeamGame
          ? `${cleanNickname}'s Secret Council`
          : isImpostorGame
          ? `${cleanNickname}'s Desa`
          : (gameId as GameId) === 'snake-ladder'
          ? `${cleanNickname}'s Ular Tangga`
          : `${cleanNickname}'s Party`;

        const defaultGameMode = isHiddenTeamGame
          ? 'hidden-team-standard'
          : isImpostorGame
          ? 'impostor-classic'
          : (gameId as GameId) === 'snake-ladder'
          ? 'snake-classic'
          : 'classic-race';

        const defaultDuration = isHiddenTeamGame ? 600 : isImpostorGame ? 240 : 180;

        const settings: RoomSettings = {
          name: (roomName || defaultRoomName).trim().substring(0, 30),
          gameId: (gameId as GameId) || 'panjat-pinang',
          gameMode: (gameMode as GameMode) || defaultGameMode,
          maxPlayers: targetMaxPlayers,
          durationSeconds: defaultDuration,
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

        const validAvatar: AvatarId = avatar || 'rara';
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

      if (newSettings.gameId) {
        const avail = GAME_AVAILABILITY[newSettings.gameId];
        if (avail && avail.status !== 'playable') {
          socket.emit('error:message', avail.reason || 'Game ini belum dapat dimainkan saat ini.');
          return;
        }
      }

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

    // 6b. Bot Management (Host only - Practice Mode)
    socket.on('room:add-bot', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.hostId !== mapping.playerId) return;

      const result = room.addBot();
      if (result.success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      } else if (result.error) {
        socket.emit('error:message', result.error);
      }
    });

    socket.on('room:remove-bot', (payload?: { botId?: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.hostId !== mapping.playerId) return;

      const result = room.removeBot(payload?.botId);
      if (result.success) {
        io.to(room.id).emit('room:updated', room.getInfo());
      } else if (result.error) {
        socket.emit('error:message', result.error);
      }
    });

    socket.on('room:fill-bots', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.hostId !== mapping.playerId) return;

      const result = room.fillBots();
      if (result.added > 0) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    socket.on('room:clear-bots', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.hostId !== mapping.playerId) return;

      const result = room.clearBots();
      if (result.removed > 0) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 6c. Player Avatar Update inside Lobby
    socket.on('player:update-avatar' as any, (payload: { avatar: string } | string) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const nextAvatar = typeof payload === 'string' ? payload : payload?.avatar;
      if (!nextAvatar) return;
      if (room.updatePlayerAvatar(mapping.playerId, nextAvatar)) {
        io.to(room.id).emit('room:updated', room.getInfo());
      }
    });

    // 7. Start Game (Host only)
    socket.on('game:start', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const avail = GAME_AVAILABILITY[room.settings.gameId];
      if (avail && avail.status !== 'playable') {
        socket.emit('error:message', avail.reason || 'Game ini belum dapat dimainkan saat ini.');
        return;
      }

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
          } else {
            io.to(room.id).emit('room:updated', room.getInfo());
            const initialState = room.getGameInstance()?.getState();
            io.to(room.id).emit('game:countdown', 0);
            io.to(room.id).emit('game:start', initialState);
            io.to(room.id).emit('game:started', initialState);
            io.to(room.id).emit('game:state', initialState);
            if (room.settings.gameId === 'ludo') {
              io.to(room.id).emit('game:ludo_state', initialState);
            } else if (room.settings.gameId === 'snake-ladder') {
              io.to(room.id).emit('game:snake_state', initialState);
            }
          }
        }
      }, 1000);
    });

    // 8. Player Game Input (Climber movement, Ludo, or Impostor Desa actions)
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

    // 8b. Impostor Desa Specific Socket Events
    socket.on('impostor:ready-role', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'ready-role' });
    });

    socket.on('impostor:submit-clue', ({ clue }: { clue: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'submit-clue', clue });
    });

    socket.on('impostor:start-voting', () => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'start-voting' });
    });

    socket.on('impostor:submit-vote', ({ targetPlayerId }: { targetPlayerId: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'submit-vote', targetPlayerId });
    });

    socket.on('impostor:submit-guess', ({ guessedWord }: { guessedWord: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'submit-guess', guessedWord });
    });

    socket.on('impostor:send-chat', ({ message }: { message: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'send-chat', message });
    });

    // 8c. Hidden Team: Secret Role Specific Socket Events
    socket.on('hidden-team:select-main-card', ({ cardId }: { cardId: string }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'role_5_select', selectedCardId: cardId });
    });

    socket.on('hidden-team:execute-action', (payload: any) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, payload);
    });

    socket.on('hidden-team:submit-votes', ({ cardIds }: { cardIds: string[] }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'submit_votes', cardIds });
    });

    socket.on('hidden-team:inspect-decision', ({ decision }: { decision: 'KEEP' | 'DISCARD' }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room || room.status !== 'in-game') return;
      room.getGameInstance()?.handleInput(mapping.playerId, { action: 'role_4_inspect', decision });
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

    // 10. In-Game Emote Trigger
    socket.on('game:emote', ({ emoteId }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;

      const player = room.players.get(mapping.playerId);
      if (!player) return;

      // Rate limit per socket: max 1 emote every 800ms
      const now = Date.now();
      const lastEmote = (socket as any)._lastEmoteTime || 0;
      if (now - lastEmote < 800) return;
      (socket as any)._lastEmoteTime = now;

      // Broadcast emote to all players in the room
      io.to(room.id).emit('game:emote', {
        id: `emote-${now}-${Math.random().toString(36).substring(2, 7)}`,
        playerId: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        emoteId,
        timestamp: now,
      });
    });

    // Free Chat in Gameplay
    socket.on('game:chat', ({ message }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;
      room.handleChat(mapping.playerId, message);
    });

    // Vote Kick in Gameplay (players > 2)
    socket.on('game:vote-kick-start', ({ targetPlayerId, reason }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;
      const res = room.startVoteKick(mapping.playerId, targetPlayerId, reason);
      if (!res.success && res.error) {
        socket.emit('error:message', res.error);
      }
    });

    socket.on('game:vote-kick-vote', ({ vote }) => {
      const mapping = roomManager.getPlayerMapping(socket.id);
      if (!mapping) return;
      const room = roomManager.getRoomById(mapping.roomId);
      if (!room) return;
      const res = room.voteVoteKick(mapping.playerId, vote);
      if (!res.success && res.error) {
        socket.emit('error:message', res.error);
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
