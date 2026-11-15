import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import { getRoomByCode } from '../../../../../lib/room-service';
import { createInitialGameState, processLudoAction, processPanjatAction } from '../../../../../lib/game-runner';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code?.toUpperCase();
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
      await pool.query(
        'UPDATE gh_players SET is_ready = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [isReady ? 1 : 0, now, playerId, code]
      );
      return NextResponse.json({ success: true });
    }

    // 1b. UPDATE AVATAR
    if (action === 'update_avatar') {
      const avatar = body.avatar || 'budi';
      await pool.query(
        'UPDATE gh_players SET avatar = ?, last_seen_at = ? WHERE id = ? AND room_code = ?',
        [avatar, now, playerId, code]
      );
      return NextResponse.json({ success: true });
    }

    // 1c. UPDATE SETTINGS
    if (action === 'update_settings') {
      if (body.gameId) {
        await pool.query('UPDATE gh_rooms SET game_id = ?, updated_at = ? WHERE code = ?', [body.gameId, now, code]);
      }
      if (body.gameMode) {
        await pool.query('UPDATE gh_rooms SET game_mode = ?, updated_at = ? WHERE code = ?', [body.gameMode, now, code]);
      }
      if (body.durationSeconds) {
        await pool.query('UPDATE gh_rooms SET duration_seconds = ?, updated_at = ? WHERE code = ?', [body.durationSeconds, now, code]);
      }
      if (body.maxPlayers) {
        await pool.query('UPDATE gh_rooms SET max_players = ?, updated_at = ? WHERE code = ?', [body.maxPlayers, now, code]);
      }
      return NextResponse.json({ success: true });
    }

    // 1d. KICK
    if (action === 'kick') {
      await pool.query('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [body.targetId, code]);
      return NextResponse.json({ success: true });
    }

    // 2. START ACTION
    if (action === 'start') {
      if (room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Only the host can start the game.' }, { status: 403 });
      }

      const initialGameState = createInitialGameState(room);
      await pool.query(
        'UPDATE gh_rooms SET status = "in-game", game_state_json = ?, game_results_json = NULL, updated_at = ? WHERE code = ?',
        [JSON.stringify(initialGameState), now, code]
      );

      return NextResponse.json({ success: true, gameState: initialGameState });
    }

    // 3. LUDO ACTION (or roll-dice / move-token / pass-turn)
    if (action === 'ludo_action' || (room.settings.gameId === 'ludo' && (body.action === 'roll-dice' || body.action === 'move-token' || body.action === 'pass-turn'))) {
      const { gameState: newGameState, results } = processLudoAction(room, gameState, playerId, body);
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';

      await pool.query(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      );

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4. PANJAT PINANG INPUT ACTION
    if (action === 'input') {
      if (room.settings.gameId === 'ludo') {
        const { gameState: newGameState, results } = processLudoAction(room, gameState, playerId, body);
        const resultsJson = results ? JSON.stringify(results) : null;
        const newStatus = results ? 'finished' : 'in-game';

        await pool.query(
          'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
          [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
        );

        return NextResponse.json({ success: true, gameState: newGameState, results });
      }

      const { gameState: newGameState, results } = processPanjatAction(room, gameState, playerId, body);
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';

      await pool.query(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      );

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4b. SKILL ACTION
    if (action === 'skill') {
      const { gameState: newGameState, results } = processPanjatAction(room, gameState, playerId, { type: 'skill', skill: body.skill });
      const resultsJson = results ? JSON.stringify(results) : null;
      const newStatus = results ? 'finished' : 'in-game';

      await pool.query(
        'UPDATE gh_rooms SET game_state_json = ?, game_results_json = ?, status = ?, updated_at = ? WHERE code = ?',
        [JSON.stringify(newGameState), resultsJson, newStatus, now, code]
      );

      return NextResponse.json({ success: true, gameState: newGameState, results });
    }

    // 4c. RESTART ACTION
    if (action === 'restart') {
      await pool.query(
        'UPDATE gh_rooms SET status = "lobby", game_state_json = NULL, game_results_json = NULL, updated_at = ? WHERE code = ?',
        [now, code]
      );
      await pool.query('UPDATE gh_players SET is_ready = 0 WHERE room_code = ?', [code]);
      return NextResponse.json({ success: true });
    }

    // 5. EMOTE ACTION
    if (action === 'emote') {
      const emoteId = body.emoteId;
      const player = room.players.find((p) => p.id === playerId);
      const id = `emote_${now}_${Math.random().toString(36).substring(2, 6)}`;

      await pool.query(
        'INSERT INTO gh_emotes (id, room_code, player_id, nickname, emote_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, code, playerId, player?.nickname || 'Player', emoteId, now]
      );

      return NextResponse.json({ success: true });
    }

    // 6. LEAVE ACTION
    if (action === 'leave') {
      await pool.query('DELETE FROM gh_players WHERE id = ? AND room_code = ?', [playerId, code]);

      const [remainingPlayers] = await pool.query<any[]>(
        'SELECT id FROM gh_players WHERE room_code = ? ORDER BY joined_at ASC',
        [code]
      );

      if (!remainingPlayers || remainingPlayers.length === 0) {
        await pool.query('DELETE FROM gh_rooms WHERE code = ?', [code]);
        await pool.query('DELETE FROM gh_emotes WHERE room_code = ?', [code]);
      } else if (room.hostId === playerId) {
        const newHostId = remainingPlayers[0].id;
        await pool.query('UPDATE gh_players SET is_host = 1 WHERE id = ?', [newHostId]);
        await pool.query('UPDATE gh_rooms SET host_id = ?, updated_at = ? WHERE code = ?', [newHostId, now, code]);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API action error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Action failed.' }, { status: 500 });
  }
}
