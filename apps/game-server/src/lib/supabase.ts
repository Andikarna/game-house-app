import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameMode, PlayerGameResult, UnoLeaderboardEntry } from '@gamehouse/shared';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahjaqkncbnzmhchdfslf.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_bV_P1TExQB_AL3ijH5B1XQ_NDJMoga-';

let client: SupabaseClient | null = null;
let schemaMissingWarned = false;

export function getServerSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function recordUnoMatchToSupabase(params: {
  roomCode: string;
  gameMode: GameMode;
  rankings: PlayerGameResult[];
  totalTurns: number;
  durationMs: number;
}): Promise<void> {
  const sb = getServerSupabase();
  if (!sb || params.rankings.length === 0) return;

  try {
    const winner = params.rankings[0];
    const matchId = `uno_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const { error: histErr } = await sb.from('uno_match_history').insert({
      id: matchId,
      room_code: params.roomCode,
      game_mode: params.gameMode,
      player_count: params.rankings.length,
      winner_id: winner?.playerId || null,
      winner_nickname: winner?.nickname || null,
      winner_avatar: winner?.avatar || null,
      rankings_json: params.rankings,
      total_turns: params.totalTurns,
      duration_ms: params.durationMs,
    });

    if (histErr) {
      if (histErr.code === 'PGRST205' && !schemaMissingWarned) {
        schemaMissingWarned = true;
        console.warn('[Supabase UNO] Tables not yet migrated. Run supabase/uno_schema.sql in Supabase SQL Editor.');
      }
      return;
    }

    // Update leaderboard entries for human/named players in parallel
    await Promise.all(
      params.rankings.map(async (r) => {
        const cleanNick = r.nickname.trim();
        if (!cleanNick) return;
        const { data: existing } = await sb
          .from('uno_leaderboard')
          .select('nickname, wins, matches_played, total_score, uno_shouts')
          .eq('nickname', cleanNick)
          .maybeSingle();

        const nextEntry: UnoLeaderboardEntry = {
          nickname: cleanNick,
          avatar: r.avatar,
          wins: (existing?.wins || 0) + (r.rank === 1 ? 1 : 0),
          matches_played: (existing?.matches_played || 0) + 1,
          total_score: (existing?.total_score || 0) + (r.score || 0),
          uno_shouts: (existing?.uno_shouts || 0) + (r.skillsUsedCount || 0),
          updated_at: new Date().toISOString(),
        };

        await sb.from('uno_leaderboard').upsert(nextEntry, { onConflict: 'nickname' });
      })
    );
  } catch (err: any) {
    console.warn('[Supabase UNO] Non-blocking persistence error:', err?.message || err);
  }
}
