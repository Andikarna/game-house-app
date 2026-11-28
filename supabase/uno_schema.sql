-- =========================================================================
-- GameHouse: UNO Party (4-10 Players) Supabase Schema & Realtime Setup
-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> New Query
-- =========================================================================

-- 1. Tabel Room & Authoritative Game State UNO (Single-row JSONB untuk latensi ultra-rendah)
CREATE TABLE IF NOT EXISTS public.uno_rooms (
  code TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  name TEXT NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'uno-classic',
  max_players INTEGER NOT NULL DEFAULT 6,
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'lobby',
  host_id TEXT NOT NULL,
  players_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state_json JSONB,
  game_results_json JSONB,
  chats_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  vote_kick_json JSONB,
  state_version BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uno_rooms_status_updated
  ON public.uno_rooms (status, updated_at DESC);

-- 2. Riwayat Pertandingan UNO (Match History)
CREATE TABLE IF NOT EXISTS public.uno_match_history (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  winner_id TEXT,
  winner_nickname TEXT,
  winner_avatar TEXT,
  rankings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_turns INTEGER NOT NULL DEFAULT 0,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uno_match_history_created
  ON public.uno_match_history (created_at DESC);

-- 3. Leaderboard Global Pemain UNO
CREATE TABLE IF NOT EXISTS public.uno_leaderboard (
  nickname TEXT PRIMARY KEY,
  avatar TEXT NOT NULL DEFAULT 'luna',
  wins INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  uno_shouts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uno_leaderboard_rank
  ON public.uno_leaderboard (wins DESC, total_score DESC);

-- 4. Row Level Security (Izinkan akses Publishable Key untuk Guest Session GameHouse)
ALTER TABLE public.uno_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uno_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uno_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public UNO room access" ON public.uno_rooms;
CREATE POLICY "Allow public UNO room access"
  ON public.uno_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public UNO match history access" ON public.uno_match_history;
CREATE POLICY "Allow public UNO match history access"
  ON public.uno_match_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public UNO leaderboard access" ON public.uno_leaderboard;
CREATE POLICY "Allow public UNO leaderboard access"
  ON public.uno_leaderboard
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Aktifkan Supabase Realtime Postgres Changes untuk tabel uno_rooms
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_rooms;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
