import { NextResponse } from 'next/server';
import { safeDbQuery } from '../../../../../lib/db';
import { getRoomByCode, saveMemoryRoom } from '../../../../../lib/room-service';
import { createInitialGameState, processLudoAction, processPanjatAction, removeLudoPlayer } from '../../../../../lib/game-runner';
import { ChatMessage, VoteKickState } from '../../../../../shared';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const rawCode = params.code?.toUpperCase() || '';
    const code = rawCode.replace(/[^A-Za-z0-9]/g, '');
    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { action, playerId } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'Player ID is required.' }, { status: 400 });
    }

    const roomData = await getRoomByCode(code);
    if (!roomData) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    const { room, gameState } = roomData;
    const now = Date.now();

    // 1. READY ACTION
    if (action === 'ready') {
      const isReady = typeof body.isReady === 'boolean' ? body.isReady : true;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isReady = isReady;
        saveMemoryRoom(room, gameState, roomData.gameResults);
      }
      safeDbQuery(
        'UPDATE gh_players SET is_ready = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [isReady ? 1 : 0, now, playerId, code]
      ).catch(() => {});
      return NextResponse.json({ success: true, room });
    }

    // 1b. UPDATE AVATAR
    if (action === 'update_avatar') {
      const avatar = body.avatar || 'budi';
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.avatar = avatar;
        saveMemoryRoom(room, gameState, roomData.gameResults);
      }
      safeDbQuery(
        'UPDATE gh_players SET avatar = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [avatar, now, playerId, code]
      ).catch(() => {});
      return NextResponse.json({ success: true, room });
    }

    // 1c. UPDATE SETTINGS
    if (action === 'update_settings') {
      if (body.gameId) room.settings.gameId = body.gameId;
      if (body.gameMode) room.settings.gameMode = body.gameMode;
      if (body.durationSeconds) room.settings.durationSeconds = Number(body.durationSeconds);
      if (body.maxPlayers) room.settings.maxPlayers = Number(body.maxPlayers);
      saveMemoryRoom(room, gameState, roomData.gameResults);

      safeDbQuery(
        'UPDATE gh_rooms SET game_id = ?, game_mode = ?, duration_seconds = ?, max_players = ?, updated_at = ? WHERE code = ?',
        [room.settings.gameId, room.settings.gameMode, room.settings.durationSeconds, room.settings.maxPlayers, now, code]
      ).catch(() => {});
      return NextResponse.json({ success: true, room });
    }

    // 1d. KICK
    if (action === 'kick') {
      room.players = room.players.filter((p) => p.id !== body.targetId);
      saveMemoryRoom(room, gameState, roomData.gameResults);

      safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [body.targetId, code]).catch(() => {});
      return NextResponse.json({ success: true, room });
    }

    // BOT ACTIONS (Single player / Practice mode)
    const BOT_NAMES = ['Budi (Bot)', 'Siti (Bot)', 'Joko (Bot)', 'Rian (Bot)', 'Dewi (Bot)'];
    const BOT_AVATARS: any[] = ['budi', 'siti', 'joko', 'rara', 'budi'];

    if (action === 'add_bot' || action === 'add-bot') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can add bots.' }, { status: 403 });
      }
      const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
      const maxCap = isSixPlayerGame ? 6 : (room.settings.maxPlayers || 4);
      if (room.players.length < maxCap) {
        const botIndex = room.players.filter(p => p.isBot).length;
        const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: BOT_NAMES[botIndex % BOT_NAMES.length],
          avatar: BOT_AVATARS[botIndex % BOT_AVATARS.length],
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt: now,
          isBot: true,
        });
        saveMemoryRoom(room, gameState, roomData.gameResults);
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'fill_bots' || action === 'fill-bots') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can fill bots.' }, { status: 403 });
      }
      const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
      const maxCap = isSixPlayerGame ? 6 : (room.settings.maxPlayers || 4);
      while (room.players.length < maxCap) {
        const botIndex = room.players.filter(p => p.isBot).length;
        const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: BOT_NAMES[botIndex % BOT_NAMES.length],
          avatar: BOT_AVATARS[botIndex % BOT_AVATARS.length],
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt: now,
          isBot: true,
        });
      }
      saveMemoryRoom(room, gameState, roomData.gameResults);
      return NextResponse.json({ success: true, room });
    }

    if (action === 'remove_bot' || action === 'remove-bot') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can remove bots.' }, { status: 403 });
      }
      const lastBotIndex = room.players.map(p => Boolean(p.isBot)).lastIndexOf(true);
      if (lastBotIndex >= 0) {
        room.players.splice(lastBotIndex, 1);
        saveMemoryRoom(room, gameState, roomData.gameResults);
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'clear_bots' || action === 'clear-bots') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can clear bots.' }, { status: 403 });
      }
      room.players = room.players.filter(p => !p.isBot);
      saveMemoryRoom(room, gameState, roomData.gameResults);
      return NextResponse.json({ success: true, room });
    }

    // 2. START ACTION
    if (action === 'start') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only the host can start the game.' }, { status: 403 });
      }

      const initialGameState = createInitialGameState(room);
      room.status = 'in-game';
      saveMemoryRoom(room, initialGameState, null);

      safeDbQuery(
        'UPDATE gh_rooms SET status = "in-game", game_state_json = ?, game_results_json = NULL, updated_at = ? WHERE code = ?',
        [JSON.stringify(initialGameState), now, code]
      ).catch(() => {});

      return NextResponse.json({ success: true, room, gameState: initialGameState });
    }

    // 3. LUDO ACTION (or roll-dice / move-token / pass-turn)
    if (
      action === 'ludo_action' ||
      (room.settings.gameId === 'ludo' &&
        (body.action === 'roll-dice' || body.action === 'move-token' || body.action === 'pass-turn'))
    ) {
      const { gameState: newGameState, results } = processLudoAction(room, gameState, playerId, body);
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';
      room.status = newStatus;
      saveMemoryRoom(room, newGameState, results);

      safeDbQuery(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      ).catch(() => {});

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4. PANJAT PINANG INPUT ACTION
    if (action === 'input') {
      if (room.settings.gameId === 'ludo') {
        const { gameState: newGameState, results } = processLudoAction(room, gameState, playerId, body);
        const resultsJson = results ? JSON.stringify(results) : null;
        const newStatus = results ? 'finished' : 'in-game';
        room.status = newStatus;
        saveMemoryRoom(room, newGameState, results);

        safeDbQuery(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
        ).catch(() => {});

        return NextResponse.json({ success: true, gameState: newGameState, results });
      }

      const { gameState: newGameState, results } = processPanjatAction(room, gameState, playerId, body);
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';
      room.status = newStatus;
      saveMemoryRoom(room, newGameState, results);

      safeDbQuery(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      ).catch(() => {});

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4b. SKILL ACTION
    if (action === 'skill') {
      const { gameState: newGameState, results } = processPanjatAction(room, gameState, playerId, {
        type: 'skill',
        skill: body.skill,
      });
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';
      room.status = newStatus;
      saveMemoryRoom(room, newGameState, results);

      safeDbQuery(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      ).catch(() => {});

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4c. RESTART ACTION
    if (action === 'restart') {
      room.status = 'lobby';
      room.players.forEach((p) => {
        p.isReady = p.isHost;
      });
      saveMemoryRoom(room, null, null);

      safeDbQuery(
        'UPDATE gh_rooms SET status = "lobby", game_state_json = NULL, game_results_json = NULL, updated_at = ? WHERE code = ?',
        [now, code]
      ).catch(() => {});
      safeDbQuery('UPDATE gh_players SET is_ready = is_host WHERE room_code = ?', [code]).catch(() => {});
      return NextResponse.json({ success: true, room });
    }

    // 5. EMOTE ACTION
    if (action === 'emote') {
      const emoteId = body.emoteId;
      const player = room.players.find((p) => p.id === playerId);
      const id = `emote_${now}_${Math.random().toString(36).substring(2, 6)}`;

      safeDbQuery(
        'INSERT INTO gh_emotes (id, room_code, player_id, nickname, emote_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, code, playerId, player?.nickname || 'Player', emoteId, now]
      ).catch(() => {});

      return NextResponse.json({ success: true });
    }

    // 5b. CHAT ACTION
    if (action === 'chat') {
      const player = room.players.find((p) => p.id === playerId);
      if (!player) {
        return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 404 });
      }
      const rawMessage = (body.message || '').trim();
      if (!rawMessage || rawMessage.length > 60) {
        return NextResponse.json({ success: false, error: 'Pesan chat harus antara 1-60 karakter.' }, { status: 400 });
      }

      let color = body.color;
      if (!color && gameState && gameState.players && gameState.players[playerId]) {
        color = gameState.players[playerId].color;
      }

      const chatMessage: ChatMessage = {
        id: `chat_${now}_${Math.random().toString(36).substring(2, 7)}`,
        playerId,
        nickname: player.nickname,
        color,
        avatar: player.avatar,
        message: rawMessage,
        timestamp: now,
      };

      const existingChats = (roomData.chatMessages || []).filter((c) => now - c.timestamp < 15000);
      existingChats.push(chatMessage);
      saveMemoryRoom(room, gameState, roomData.gameResults, roomData.activeVoteKick, existingChats);

      return NextResponse.json({ success: true, chatMessage });
    }

    // 5c. VOTE KICK START ACTION
    if (action === 'vote_kick_start') {
      if (room.status !== 'in-game') {
        return NextResponse.json({ success: false, error: 'Vote kick hanya bisa dilakukan saat game berjalan.' }, { status: 400 });
      }
      if (room.players.length <= 2) {
        return NextResponse.json({ success: false, error: 'Vote kick membutuhkan lebih dari 2 pemain.' }, { status: 400 });
      }
      if (roomData.activeVoteKick && Date.now() < roomData.activeVoteKick.expiresAt) {
        return NextResponse.json({ success: false, error: 'Vote kick sedang berlangsung.' }, { status: 400 });
      }

      const initiator = room.players.find((p) => p.id === playerId);
      const targetId = body.targetPlayerId;
      const target = room.players.find((p) => p.id === targetId);

      if (!initiator || !target) {
        return NextResponse.json({ success: false, error: 'Pemain tidak ditemukan.' }, { status: 404 });
      }
      if (initiator.id === target.id) {
        return NextResponse.json({ success: false, error: 'Tidak bisa vote kick diri sendiri.' }, { status: 400 });
      }

      const eligibleCount = room.players.length - 1;
      const requiredVotes = Math.floor(eligibleCount / 2) + 1;
      let targetColor: string | undefined;
      if (gameState && gameState.players && gameState.players[targetId]) {
        targetColor = gameState.players[targetId].color;
      }

      const voteState: VoteKickState = {
        targetPlayerId: target.id,
        targetNickname: target.nickname,
        targetColor,
        initiatedByPlayerId: initiator.id,
        initiatedByNickname: initiator.nickname,
        votes: { [initiator.id]: 'yes' },
        yesCount: 1,
        noCount: 0,
        requiredVotes,
        expiresAt: now + 25000,
      };

      if (voteState.yesCount >= requiredVotes) {
        if (room.settings.gameId === 'ludo' && gameState) {
          const updatedState = removeLudoPlayer(room, gameState, target.id);
          room.players = room.players.filter((p) => p.id !== target.id);
          saveMemoryRoom(room, updatedState, roomData.gameResults, null);
          return NextResponse.json({ success: true, kicked: true, room, gameState: updatedState });
        } else {
          room.players = room.players.filter((p) => p.id !== target.id);
          saveMemoryRoom(room, gameState, roomData.gameResults, null);
          return NextResponse.json({ success: true, kicked: true, room });
        }
      }

      saveMemoryRoom(room, gameState, roomData.gameResults, voteState);
      return NextResponse.json({ success: true, voteKick: voteState });
    }

    // 5d. VOTE KICK VOTE ACTION
    if (action === 'vote_kick_vote') {
      const activeVote = roomData.activeVoteKick;
      if (!activeVote || Date.now() > activeVote.expiresAt) {
        return NextResponse.json({ success: false, error: 'Tidak ada vote kick aktif.' }, { status: 400 });
      }
      if (playerId === activeVote.targetPlayerId) {
        return NextResponse.json({ success: false, error: 'Target tidak bisa memberi vote.' }, { status: 400 });
      }
      const vote = body.vote === 'no' ? 'no' : 'yes';
      activeVote.votes[playerId] = vote;

      let yesCount = 0;
      let noCount = 0;
      Object.values(activeVote.votes).forEach((v) => {
        if (v === 'yes') yesCount++;
        if (v === 'no') noCount++;
      });
      activeVote.yesCount = yesCount;
      activeVote.noCount = noCount;

      const targetId = activeVote.targetPlayerId;

      if (yesCount >= activeVote.requiredVotes) {
        if (room.settings.gameId === 'ludo' && gameState) {
          const updatedState = removeLudoPlayer(room, gameState, targetId);
          room.players = room.players.filter((p) => p.id !== targetId);
          saveMemoryRoom(room, updatedState, roomData.gameResults, null);
          return NextResponse.json({ success: true, kicked: true, room, gameState: updatedState });
        } else {
          room.players = room.players.filter((p) => p.id !== targetId);
          saveMemoryRoom(room, gameState, roomData.gameResults, null);
          return NextResponse.json({ success: true, kicked: true, room });
        }
      }

      const eligibleCount = room.players.length - 1;
      const maxPossibleYes = eligibleCount - noCount;
      if (maxPossibleYes < activeVote.requiredVotes) {
        saveMemoryRoom(room, gameState, roomData.gameResults, null);
        return NextResponse.json({ success: true, kicked: false, voteKick: null });
      }

      saveMemoryRoom(room, gameState, roomData.gameResults, activeVote);
      return NextResponse.json({ success: true, voteKick: activeVote });
    }

    // 6. LEAVE ACTION
    if (action === 'leave') {
      room.players = room.players.filter((p) => p.id !== playerId);

      if (room.players.length === 0) {
        saveMemoryRoom(room, null, null);
        safeDbQuery('DELETE FROM gh_rooms WHERE code = ?', [code]).catch(() => {});
        safeDbQuery('DELETE FROM gh_players WHERE room_code = ?', [code]).catch(() => {});
        safeDbQuery('DELETE FROM gh_emotes WHERE room_code = ?', [code]).catch(() => {});
      } else {
        if (room.hostId === playerId) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
          room.players[0].isReady = true;
        }
        saveMemoryRoom(room, gameState, roomData.gameResults);
        safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [playerId, code]).catch(() => {});
        safeDbQuery('UPDATE gh_rooms SET host_id = ?, updated_at = ? WHERE code = ?', [room.hostId, now, code]).catch(() => {});
      }

      return NextResponse.json({ success: true, room });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API action error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed.' }, { status: 500 });
  }
}
