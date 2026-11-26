import { NextResponse } from 'next/server';
import { safeDbQuery, ensureAuxTables } from '../../../../../lib/db';
import { getRoomByCode, saveMemoryRoom, RoomEntry } from '../../../../../lib/room-service';
import { createInitialGameState, processLudoAction, processPanjatAction, removeLudoPlayer } from '../../../../../lib/game-runner';
import { AvatarId, ChatMessage, VoteKickState, GAME_AVAILABILITY, GameId } from '../../../../../shared';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

const BOT_NAMES = ['Budi (Bot)', 'Siti (Bot)', 'Jago (Bot)', 'Rara (Bot)', 'Bayu (Bot)'];
const BOT_AVATARS: AvatarId[] = ['budi', 'siti', 'jago', 'rara', 'bayu'];

async function persistLudoTransition(
  code: string,
  roomData: RoomEntry,
  playerId: string,
  body: any
): Promise<{ gameState: any; results: any | null }> {
  const { gameState: newGameState, results } = processLudoAction(
    roomData.room,
    roomData.gameState,
    playerId,
    body
  );
  const resultsJson = results ? JSON.stringify(results) : null;
  const newStatus = results ? 'finished' : 'in-game';
  const expectedUpdatedAt = roomData.dbUpdatedAt || 0;
  const nextUpdatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);

  if (expectedUpdatedAt > 0) {
    const [res] = await safeDbQuery<any>(
      'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ? AND updated_at = ?',
      [JSON.stringify(newGameState), resultsJson, newStatus, nextUpdatedAt, code, expectedUpdatedAt]
    );
    if (res && typeof res.affectedRows === 'number' && res.affectedRows === 0) {
      // Concurrent update (e.g. timeout poll); reload fresh state and retry once
      const fresh = await getRoomByCode(code);
      if (fresh) {
        const retry = processLudoAction(fresh.room, fresh.gameState, playerId, body);
        const retryResultsJson = retry.results ? JSON.stringify(retry.results) : null;
        const retryStatus = retry.results ? 'finished' : 'in-game';
        const retryUpdatedAt = Math.max(Date.now(), (fresh.dbUpdatedAt || 0) + 1);
        fresh.room.status = retryStatus;
        saveMemoryRoom(fresh.room, retry.gameState, retry.results, fresh.activeVoteKick, fresh.chatMessages, retryUpdatedAt);
        await safeDbQuery(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [JSON.stringify(retry.gameState), retryResultsJson, retryStatus, retryUpdatedAt, code]
        );
        roomData.dbUpdatedAt = retryUpdatedAt;
        return retry;
      }
    }
  } else {
    await safeDbQuery(
      'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
      [JSON.stringify(newGameState), resultsJson, newStatus, nextUpdatedAt, code]
    );
  }

  roomData.room.status = newStatus;
  roomData.dbUpdatedAt = nextUpdatedAt;
  saveMemoryRoom(
    roomData.room,
    newGameState,
    results,
    roomData.activeVoteKick,
    roomData.chatMessages,
    nextUpdatedAt
  );
  return { gameState: newGameState, results };
}

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

    const needsAux =
      action === 'chat' ||
      action === 'vote_kick_start' ||
      action === 'vote_kick_vote';

    const roomData = await getRoomByCode(code, { includeAux: needsAux });
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
      await safeDbQuery(
        'UPDATE gh_players SET is_ready = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [isReady ? 1 : 0, now, playerId, code]
      );
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
      await safeDbQuery(
        'UPDATE gh_players SET avatar = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [avatar, now, playerId, code]
      );
      return NextResponse.json({ success: true, room });
    }

    // 1c. UPDATE SETTINGS
    if (action === 'update_settings') {
      if (body.gameId) {
        const avail = GAME_AVAILABILITY[body.gameId as GameId];
        if (avail && avail.status !== 'playable') {
          return NextResponse.json({ success: false, error: avail.reason || 'Game belum dapat dimainkan.' }, { status: 400 });
        }
        room.settings.gameId = body.gameId;
      }
      if (body.gameMode) room.settings.gameMode = body.gameMode;
      if (body.durationSeconds) room.settings.durationSeconds = Number(body.durationSeconds);
      if (body.maxPlayers) room.settings.maxPlayers = Number(body.maxPlayers);
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      saveMemoryRoom(room, gameState, roomData.gameResults, roomData.activeVoteKick, roomData.chatMessages, nextUpdatedAt);

      await safeDbQuery(
        'UPDATE gh_rooms SET game_id = ?, game_mode = ?, duration_seconds = ?, max_players = ?, updated_at = ? WHERE code = ?',
        [room.settings.gameId, room.settings.gameMode, room.settings.durationSeconds, room.settings.maxPlayers, nextUpdatedAt, code]
      );
      return NextResponse.json({ success: true, room });
    }

    // 1d. KICK
    if (action === 'kick') {
      room.players = room.players.filter((p) => p.id !== body.targetId);
      saveMemoryRoom(room, gameState, roomData.gameResults);

      await safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [body.targetId, code]);
      return NextResponse.json({ success: true, room });
    }

    // BOT ACTIONS (Single player / Practice mode)
    if (action === 'add_bot' || action === 'add-bot') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can add bots.' }, { status: 403 });
      }
      const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
      const maxCap = isSixPlayerGame ? 6 : (room.settings.maxPlayers || 4);
      if (room.players.length < maxCap) {
        const botIndex = room.players.filter((p) => p.isBot).length;
        const botId = `bot_${now}_${Math.random().toString(36).substring(2, 6)}`;
        const botNick = BOT_NAMES[botIndex % BOT_NAMES.length];
        const botAvatar = BOT_AVATARS[botIndex % BOT_AVATARS.length];
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: botNick,
          avatar: botAvatar,
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt: now,
          isBot: true,
        });
        saveMemoryRoom(room, gameState, roomData.gameResults);
        await safeDbQuery(
          `INSERT INTO gh_players 
            (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
           VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?)`,
          [botId, code, botNick, botAvatar, now, now]
        );
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'fill_bots' || action === 'fill-bots') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can fill bots.' }, { status: 403 });
      }
      const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
      const maxCap = isSixPlayerGame ? 6 : (room.settings.maxPlayers || 4);
      const insertPromises: Promise<any>[] = [];
      let offset = 0;
      while (room.players.length < maxCap) {
        const botIndex = room.players.filter((p) => p.isBot).length;
        const botId = `bot_${now}_${offset}_${Math.random().toString(36).substring(2, 6)}`;
        const botNick = BOT_NAMES[botIndex % BOT_NAMES.length];
        const botAvatar = BOT_AVATARS[botIndex % BOT_AVATARS.length];
        const joinedAt = now + offset;
        offset++;
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: botNick,
          avatar: botAvatar,
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt,
          isBot: true,
        });
        insertPromises.push(
          safeDbQuery(
            `INSERT INTO gh_players 
              (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
             VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?)`,
            [botId, code, botNick, botAvatar, now, joinedAt]
          )
        );
      }
      saveMemoryRoom(room, gameState, roomData.gameResults);
      if (insertPromises.length > 0) {
        await Promise.all(insertPromises);
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'remove_bot' || action === 'remove-bot') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can remove bots.' }, { status: 403 });
      }
      const targetBotIndex = body.botId
        ? room.players.findIndex((p) => p.id === body.botId && p.isBot)
        : room.players.map((p) => Boolean(p.isBot)).lastIndexOf(true);
      if (targetBotIndex >= 0) {
        const [removedBot] = room.players.splice(targetBotIndex, 1);
        saveMemoryRoom(room, gameState, roomData.gameResults);
        if (removedBot) {
          await safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [removedBot.id, code]);
        }
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'clear_bots' || action === 'clear-bots') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can clear bots.' }, { status: 403 });
      }
      room.players = room.players.filter((p) => !p.isBot);
      saveMemoryRoom(room, gameState, roomData.gameResults);
      await safeDbQuery('DELETE FROM gh_players WHERE id LIKE "bot_%" AND room_code = ?', [code]);
      return NextResponse.json({ success: true, room });
    }

    // 2. START ACTION
    if (action === 'start') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only the host can start the game.' }, { status: 403 });
      }

      const startAvail = GAME_AVAILABILITY[room.settings.gameId];
      if (startAvail && startAvail.status !== 'playable') {
        return NextResponse.json({ success: false, error: startAvail.reason || 'Game belum dapat dimainkan.' }, { status: 400 });
      }

      const initialGameState = createInitialGameState(room);
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      room.status = 'in-game';
      saveMemoryRoom(room, initialGameState, null, null, roomData.chatMessages, nextUpdatedAt);

      await Promise.all([
        safeDbQuery(
          'UPDATE gh_rooms SET status = "in-game", game_state_json = ?, game_results_json = NULL, updated_at = ? WHERE code = ?',
          [JSON.stringify(initialGameState), nextUpdatedAt, code]
        ),
        safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]),
      ]);

      return NextResponse.json({ success: true, room, gameState: initialGameState });
    }

    // 3. LUDO ACTION (or roll-dice / move-token / pass-turn)
    if (
      action === 'ludo_action' ||
      (room.settings.gameId === 'ludo' &&
        (body.action === 'roll-dice' || body.action === 'move-token' || body.action === 'pass-turn'))
    ) {
      const { gameState: newGameState, results } = await persistLudoTransition(code, roomData, playerId, body);
      return NextResponse.json({ success: true, gameState: newGameState, results, u: roomData.dbUpdatedAt });
    }

    // 4. PANJAT PINANG INPUT ACTION
    if (action === 'input') {
      if (room.settings.gameId === 'ludo') {
        const { gameState: newGameState, results } = await persistLudoTransition(code, roomData, playerId, body);
        return NextResponse.json({ success: true, gameState: newGameState, results, u: roomData.dbUpdatedAt });
      }

      const { gameState: newGameState, results } = processPanjatAction(room, gameState, playerId, body);
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      room.status = newStatus;
      saveMemoryRoom(room, newGameState, results, roomData.activeVoteKick, roomData.chatMessages, nextUpdatedAt);

      await safeDbQuery(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, nextUpdatedAt, code]
      );

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
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      room.status = newStatus;
      saveMemoryRoom(room, newGameState, results, roomData.activeVoteKick, roomData.chatMessages, nextUpdatedAt);

      await safeDbQuery(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, nextUpdatedAt, code]
      );

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4c. RESTART ACTION
    if (action === 'restart') {
      room.status = 'lobby';
      room.players.forEach((p) => {
        p.isReady = p.isHost || Boolean(p.isBot);
      });
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      saveMemoryRoom(room, null, null, null, [], nextUpdatedAt);

      await Promise.all([
        safeDbQuery(
          'UPDATE gh_rooms SET status = "lobby", game_state_json = NULL, game_results_json = NULL, updated_at = ? WHERE code = ?',
          [nextUpdatedAt, code]
        ),
        safeDbQuery('UPDATE gh_players SET is_ready = (is_host OR id LIKE "bot_%") WHERE room_code = ?', [code]),
        safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]),
        safeDbQuery('DELETE FROM gh_chats WHERE room_code = ?', [code]),
      ]);
      return NextResponse.json({ success: true, room });
    }

    // 5. EMOTE ACTION
    if (action === 'emote') {
      const emoteId = body.emoteId;
      const player = room.players.find((p) => p.id === playerId);
      const id = `emote_${now}_${Math.random().toString(36).substring(2, 6)}`;

      await safeDbQuery(
        'INSERT INTO gh_emotes (id, room_code, player_id, nickname, emote_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, code, playerId, player?.nickname || 'Player', emoteId, now]
      );

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

      await ensureAuxTables();
      await safeDbQuery(
        'INSERT INTO gh_chats (id, room_code, player_id, nickname, color, avatar, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [chatMessage.id, code, playerId, player.nickname, color || null, player.avatar, rawMessage, now]
      );

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

      await ensureAuxTables();

      if (voteState.yesCount >= requiredVotes) {
        const updatedState = room.settings.gameId === 'ludo' && gameState
          ? removeLudoPlayer(room, gameState, target.id)
          : gameState;
        room.players = room.players.filter((p) => p.id !== target.id);
        const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
        saveMemoryRoom(room, updatedState, roomData.gameResults, null, roomData.chatMessages, nextUpdatedAt);
        await Promise.all([
          safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [target.id, code]),
          safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]),
          updatedState
            ? safeDbQuery('UPDATE gh_rooms SET game_state_json = ?, updated_at = ? WHERE code = ?', [JSON.stringify(updatedState), nextUpdatedAt, code])
            : Promise.resolve(),
        ]);
        return NextResponse.json({ success: true, kicked: true, room, gameState: updatedState });
      }

      saveMemoryRoom(room, gameState, roomData.gameResults, voteState);
      await safeDbQuery(
        `INSERT INTO gh_vote_kicks (room_code, data_json, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = VALUES(updated_at)`,
        [code, JSON.stringify(voteState), now]
      );
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
      await ensureAuxTables();

      if (yesCount >= activeVote.requiredVotes) {
        const updatedState = room.settings.gameId === 'ludo' && gameState
          ? removeLudoPlayer(room, gameState, targetId)
          : gameState;
        room.players = room.players.filter((p) => p.id !== targetId);
        const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
        saveMemoryRoom(room, updatedState, roomData.gameResults, null, roomData.chatMessages, nextUpdatedAt);
        await Promise.all([
          safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [targetId, code]),
          safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]),
          updatedState
            ? safeDbQuery('UPDATE gh_rooms SET game_state_json = ?, updated_at = ? WHERE code = ?', [JSON.stringify(updatedState), nextUpdatedAt, code])
            : Promise.resolve(),
        ]);
        return NextResponse.json({ success: true, kicked: true, room, gameState: updatedState });
      }

      const eligibleCount = room.players.length - 1;
      const maxPossibleYes = eligibleCount - noCount;
      if (maxPossibleYes < activeVote.requiredVotes) {
        saveMemoryRoom(room, gameState, roomData.gameResults, null);
        await safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]);
        return NextResponse.json({ success: true, kicked: false, voteKick: null });
      }

      saveMemoryRoom(room, gameState, roomData.gameResults, activeVote);
      await safeDbQuery(
        `INSERT INTO gh_vote_kicks (room_code, data_json, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = VALUES(updated_at)`,
        [code, JSON.stringify(activeVote), now]
      );
      return NextResponse.json({ success: true, voteKick: activeVote });
    }

    // 6. LEAVE ACTION
    if (action === 'leave') {
      room.players = room.players.filter((p) => p.id !== playerId);

      if (room.players.length === 0) {
        saveMemoryRoom(room, null, null, null, []);
        await Promise.all([
          safeDbQuery('DELETE FROM gh_rooms WHERE code = ?', [code]),
          safeDbQuery('DELETE FROM gh_players WHERE room_code = ?', [code]),
          safeDbQuery('DELETE FROM gh_emotes WHERE room_code = ?', [code]),
          safeDbQuery('DELETE FROM gh_chats WHERE room_code = ?', [code]),
          safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]),
        ]);
      } else {
        if (room.hostId === playerId) {
          const nextHuman = room.players.find((p) => !p.isBot) || room.players[0];
          room.hostId = nextHuman.id;
          nextHuman.isHost = true;
          nextHuman.isReady = true;
        }
        const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
        saveMemoryRoom(room, gameState, roomData.gameResults, roomData.activeVoteKick, roomData.chatMessages, nextUpdatedAt);
        await Promise.all([
          safeDbQuery('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [playerId, code]),
          safeDbQuery('UPDATE gh_players SET is_host = 1, is_ready = 1 WHERE id = ? AND room_code = ?', [room.hostId, code]),
          safeDbQuery('UPDATE gh_rooms SET host_id = ?, updated_at = ? WHERE code = ?', [room.hostId, nextUpdatedAt, code]),
        ]);
      }

      return NextResponse.json({ success: true, room });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API action error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed.' }, { status: 500 });
  }
}
