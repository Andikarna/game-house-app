import { NextResponse } from 'next/server';
import { dbQuery, safeDbQuery, ensureAuxTables } from '../../../../../lib/db';
import { getRoomByCode, saveMemoryRoom, RoomEntry } from '../../../../../lib/room-service';
import {
  createInitialGameState,
  processLudoAction,
  processPanjatAction,
  removeLudoPlayer,
  processSnakeAction,
  removeSnakePlayer,
  processUnoAction,
  removeUnoPlayer,
  sanitizeUnoForClient,
} from '../../../../../lib/game-runner';
import {
  upsertUnoRoomToSupabase,
  updateUnoRoomCAS,
  deleteUnoRoomFromSupabase,
  recordUnoMatchResult,
} from '../../../../../lib/uno-supabase';
import { AvatarId, ChatMessage, VoteKickState, GAME_AVAILABILITY, GameId } from '../../../../../shared';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

const BOT_PRESETS: Array<{ nickname: string; avatar: AvatarId }> = [
  { nickname: 'Luna (Bot)', avatar: 'luna' },
  { nickname: 'Bima (Bot)', avatar: 'bima' },
  { nickname: 'Nala (Bot)', avatar: 'nala' },
  { nickname: 'Rama (Bot)', avatar: 'rama' },
  { nickname: 'Rara (Bot)', avatar: 'rara' },
  { nickname: 'Siti (Bot)', avatar: 'siti' },
  { nickname: 'Koko (Bot)', avatar: 'koko' },
  { nickname: 'Bayu (Bot)', avatar: 'bayu' },
  { nickname: 'Jaya (Bot)', avatar: 'jaya' },
  { nickname: 'Jago (Bot)', avatar: 'jago' },
  { nickname: 'Ujang (Bot)', avatar: 'ujang' },
  { nickname: 'Budi (Bot)', avatar: 'budi' },
];

function pickBotPreset(existingPlayers: any[]): { nickname: string; avatar: AvatarId } {
  const usedNicks = new Set(existingPlayers.map((p) => p.nickname));
  const usedAvatars = new Set(existingPlayers.map((p) => p.avatar));
  return (
    BOT_PRESETS.find((b) => !usedNicks.has(b.nickname) && !usedAvatars.has(b.avatar)) ||
    BOT_PRESETS.find((b) => !usedNicks.has(b.nickname)) || {
      nickname: `UNO Bot ${existingPlayers.length + 1}`,
      avatar: BOT_PRESETS[existingPlayers.length % BOT_PRESETS.length].avatar,
    }
  );
}

async function persistTurnGameTransition(
  code: string,
  roomData: RoomEntry,
  playerId: string,
  body: any,
  processor: (room: any, gameState: any, playerId: string, body: any) => { gameState: any; results: any | null }
): Promise<{ gameState: any; results: any | null }> {
  const { gameState: newGameState, results } = processor(
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
    const [res] = await dbQuery<any>(
      'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ? AND updated_at = ?',
      [JSON.stringify(newGameState), resultsJson, newStatus, nextUpdatedAt, code, expectedUpdatedAt]
    );
    if (res && typeof res.affectedRows === 'number' && res.affectedRows === 0) {
      // Concurrent update (e.g. timeout poll); reload fresh state and retry once
      const fresh = await getRoomByCode(code, { includeAux: false, throwOnDbError: true });
      if (fresh) {
        const retry = processor(fresh.room, fresh.gameState, playerId, body);
        const retryResultsJson = retry.results ? JSON.stringify(retry.results) : null;
        const retryStatus = retry.results ? 'finished' : 'in-game';
        const retryUpdatedAt = Math.max(Date.now(), (fresh.dbUpdatedAt || 0) + 1);
        await dbQuery(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [JSON.stringify(retry.gameState), retryResultsJson, retryStatus, retryUpdatedAt, code]
        );
        fresh.room.status = retryStatus;
        saveMemoryRoom(fresh.room, retry.gameState, retry.results, fresh.activeVoteKick, fresh.chatMessages, retryUpdatedAt);
        roomData.dbUpdatedAt = retryUpdatedAt;
        return retry;
      }
    }
  } else {
    await dbQuery(
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

async function persistLudoTransition(
  code: string,
  roomData: RoomEntry,
  playerId: string,
  body: any
): Promise<{ gameState: any; results: any | null }> {
  return persistTurnGameTransition(code, roomData, playerId, body, processLudoAction);
}

async function persistUnoTransition(
  code: string,
  roomData: RoomEntry,
  playerId: string,
  body: any
): Promise<{ gameState: any; results: any | null }> {
  const { gameState: newGameState, results } = processUnoAction(
    roomData.room,
    roomData.gameState,
    playerId,
    body
  );
  const newStatus = results ? 'finished' : 'in-game';
  const expectedUpdatedAt = roomData.dbUpdatedAt || 0;
  const nextUpdatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);

  roomData.room.status = newStatus;
  roomData.gameState = newGameState;
  roomData.gameResults = results;
  roomData.dbUpdatedAt = nextUpdatedAt;

  const casRes = await updateUnoRoomCAS(code, expectedUpdatedAt, roomData);
  if (casRes.ok && !casRes.wonRace && casRes.fresh) {
    const retry = processUnoAction(casRes.fresh.room, casRes.fresh.gameState, playerId, body);
    const retryStatus = retry.results ? 'finished' : 'in-game';
    const retryUpdatedAt = Math.max(Date.now(), (casRes.fresh.dbUpdatedAt || 0) + 1);
    casRes.fresh.room.status = retryStatus;
    casRes.fresh.gameState = retry.gameState;
    casRes.fresh.gameResults = retry.results;
    casRes.fresh.dbUpdatedAt = retryUpdatedAt;
    await upsertUnoRoomToSupabase(casRes.fresh);
    saveMemoryRoom(
      casRes.fresh.room,
      retry.gameState,
      retry.results,
      casRes.fresh.activeVoteKick,
      casRes.fresh.chatMessages,
      retryUpdatedAt
    );
    roomData.dbUpdatedAt = retryUpdatedAt;
    if (retry.results) {
      recordUnoMatchResult({
        roomCode: code,
        gameMode: casRes.fresh.room.settings.gameMode,
        rankings: retry.results.rankings || [],
        totalTurns: retry.gameState?.turnCount || 0,
        durationMs: Math.max(0, Date.now() - (retry.gameState?.startedAt || Date.now())),
      }).catch(() => {});
    }
    return retry;
  }

  saveMemoryRoom(
    roomData.room,
    newGameState,
    results,
    roomData.activeVoteKick,
    roomData.chatMessages,
    nextUpdatedAt
  );

  if (results) {
    recordUnoMatchResult({
      roomCode: code,
      gameMode: roomData.room.settings.gameMode,
      rankings: results.rankings || [],
      totalTurns: newGameState?.turnCount || 0,
      durationMs: Math.max(0, Date.now() - (newGameState?.startedAt || Date.now())),
    }).catch(() => {});
  }

  return { gameState: newGameState, results };
}

async function syncUnoMemoryAndSupabase(
  roomData: RoomEntry,
  nextUpdatedAt: number
): Promise<void> {
  roomData.dbUpdatedAt = nextUpdatedAt;
  saveMemoryRoom(
    roomData.room,
    roomData.gameState,
    roomData.gameResults,
    roomData.activeVoteKick,
    roomData.chatMessages,
    nextUpdatedAt
  );
  await upsertUnoRoomToSupabase({
    ...roomData,
    dbUpdatedAt: nextUpdatedAt,
  });
}

async function persistSnakeTransition(
  code: string,
  roomData: RoomEntry,
  playerId: string,
  body: any
): Promise<{ gameState: any; results: any | null }> {
  return persistTurnGameTransition(code, roomData, playerId, body, processSnakeAction);
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
    const isUno = room.settings.gameId === 'uno';

    // 1. READY ACTION
    if (action === 'ready') {
      const isReady = typeof body.isReady === 'boolean' ? body.isReady : true;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isReady = isReady;
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
          return NextResponse.json({ success: true, room });
        }
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
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
          return NextResponse.json({ success: true, room });
        }
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
      if (room.settings.gameId === 'uno') {
        await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
        return NextResponse.json({ success: true, room });
      }
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
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, room });
      }
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
      const maxCap = isSixPlayerGame
        ? 6
        : isUno
        ? Math.min(10, Math.max(4, room.settings.maxPlayers || 6))
        : (room.settings.maxPlayers || 4);
      if (room.players.length < maxCap) {
        const botPreset = pickBotPreset(room.players);
        const botId = `bot_${now}_${Math.random().toString(36).substring(2, 6)}`;
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: botPreset.nickname,
          avatar: botPreset.avatar,
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt: now,
          isBot: true,
        });
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
          return NextResponse.json({ success: true, room });
        }
        saveMemoryRoom(room, gameState, roomData.gameResults);
        await safeDbQuery(
          `INSERT INTO gh_players 
            (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
           VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?)`,
          [botId, code, botPreset.nickname, botPreset.avatar, now, now]
        );
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === 'fill_bots' || action === 'fill-bots') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only host can fill bots.' }, { status: 403 });
      }
      const isSixPlayerGame = room.settings.gameId === 'impostor-desa' || room.settings.gameId === 'hidden-team';
      const maxCap = isSixPlayerGame
        ? 6
        : isUno
        ? Math.min(10, Math.max(4, room.settings.maxPlayers || 6))
        : (room.settings.maxPlayers || 4);
      const insertPromises: Promise<any>[] = [];
      let offset = 0;
      while (room.players.length < maxCap) {
        const botPreset = pickBotPreset(room.players);
        const botId = `bot_${now}_${offset}_${Math.random().toString(36).substring(2, 6)}`;
        const joinedAt = now + offset;
        offset++;
        room.players.push({
          id: botId,
          socketId: botId,
          nickname: botPreset.nickname,
          avatar: botPreset.avatar,
          isHost: false,
          isReady: true,
          isConnected: true,
          joinedAt,
          isBot: true,
        });
        if (!isUno) {
          insertPromises.push(
            safeDbQuery(
              `INSERT INTO gh_players 
                (id, room_code, nickname, avatar, is_host, is_ready, is_connected, last_seen_at, joined_at)
               VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?)`,
              [botId, code, botPreset.nickname, botPreset.avatar, now, joinedAt]
            )
          );
        }
      }
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, room });
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
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
          return NextResponse.json({ success: true, room });
        }
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
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, room });
      }
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

      if (isUno && (room.players.length < 4 || room.players.length > 10)) {
        return NextResponse.json({ success: false, error: 'UNO Party membutuhkan 4 hingga 10 pemain untuk memulai.' }, { status: 400 });
      }

      const initialGameState = createInitialGameState(room);
      const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
      room.status = 'in-game';
      roomData.gameState = initialGameState;
      roomData.gameResults = null;
      roomData.activeVoteKick = null;

      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
        return NextResponse.json({
          success: true,
          room,
          gameState: sanitizeUnoForClient(initialGameState, playerId),
          u: nextUpdatedAt,
        });
      }

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

    // 3b. SNAKE LADDER ACTION
    if (
      action === 'snake_action' ||
      (room.settings.gameId === 'snake-ladder' && body.action === 'roll-dice')
    ) {
      const { gameState: newGameState, results } = await persistSnakeTransition(code, roomData, playerId, body);
      return NextResponse.json({ success: true, gameState: newGameState, results, u: roomData.dbUpdatedAt });
    }

    // 3c. UNO ACTION
    if (action === 'uno_action' || (isUno && action === 'input')) {
      const { gameState: newGameState, results } = await persistUnoTransition(code, roomData, playerId, body);
      return NextResponse.json({
        success: true,
        gameState: sanitizeUnoForClient(newGameState, playerId),
        results,
        u: roomData.dbUpdatedAt,
      });
    }

    // 4. PANJAT PINANG INPUT ACTION
    if (action === 'input') {
      if (room.settings.gameId === 'ludo') {
        const { gameState: newGameState, results } = await persistLudoTransition(code, roomData, playerId, body);
        return NextResponse.json({ success: true, gameState: newGameState, results, u: roomData.dbUpdatedAt });
      }
      if (room.settings.gameId === 'snake-ladder') {
        const { gameState: newGameState, results } = await persistSnakeTransition(code, roomData, playerId, body);
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
      roomData.gameState = null;
      roomData.gameResults = null;
      roomData.activeVoteKick = null;
      roomData.chatMessages = [];
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
        return NextResponse.json({ success: true, room });
      }
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

      if (isUno) {
        const recentEmotes = (roomData.emotes || []).filter((e: any) => now - Number(e.timestamp || 0) < 10000);
        recentEmotes.push({
          id,
          playerId,
          nickname: player?.nickname || 'Player',
          emoteId,
          timestamp: now,
        });
        roomData.emotes = recentEmotes;
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true });
      }

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
      roomData.chatMessages = existingChats;
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, chatMessage });
      }
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
          : room.settings.gameId === 'snake-ladder' && gameState
          ? removeSnakePlayer(room, gameState, target.id)
          : isUno && gameState
          ? removeUnoPlayer(room, gameState, target.id)
          : gameState;
        room.players = room.players.filter((p) => p.id !== target.id);
        const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
        roomData.gameState = updatedState;
        roomData.activeVoteKick = null;
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
          return NextResponse.json({ success: true, kicked: true, room, gameState: sanitizeUnoForClient(updatedState, playerId) });
        }
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

      roomData.activeVoteKick = voteState;
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, voteKick: voteState });
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
          : room.settings.gameId === 'snake-ladder' && gameState
          ? removeSnakePlayer(room, gameState, targetId)
          : isUno && gameState
          ? removeUnoPlayer(room, gameState, targetId)
          : gameState;
        room.players = room.players.filter((p) => p.id !== targetId);
        const nextUpdatedAt = Math.max(now, (roomData.dbUpdatedAt || 0) + 1);
        roomData.gameState = updatedState;
        roomData.activeVoteKick = null;
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
          return NextResponse.json({ success: true, kicked: true, room, gameState: sanitizeUnoForClient(updatedState, playerId) });
        }
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
        roomData.activeVoteKick = null;
        if (isUno) {
          await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
          return NextResponse.json({ success: true, kicked: false, voteKick: null });
        }
        saveMemoryRoom(room, gameState, roomData.gameResults, null);
        await safeDbQuery('DELETE FROM gh_vote_kicks WHERE room_code = ?', [code]);
        return NextResponse.json({ success: true, kicked: false, voteKick: null });
      }

      roomData.activeVoteKick = activeVote;
      if (isUno) {
        await syncUnoMemoryAndSupabase(roomData, Math.max(now, (roomData.dbUpdatedAt || 0) + 1));
        return NextResponse.json({ success: true, voteKick: activeVote });
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
        if (isUno) {
          await deleteUnoRoomFromSupabase(code);
          return NextResponse.json({ success: true, room });
        }
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
        if (isUno) {
          if (gameState) {
            roomData.gameState = removeUnoPlayer(room, gameState, playerId);
          }
          await syncUnoMemoryAndSupabase(roomData, nextUpdatedAt);
          return NextResponse.json({ success: true, room });
        }
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
