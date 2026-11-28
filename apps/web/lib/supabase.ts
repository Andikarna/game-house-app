import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahjaqkncbnzmhchdfslf.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_bV_P1TExQB_AL3ijH5B1XQ_NDJMoga-';

declare global {
  // eslint-disable-next-line no-var
  var __gh_supabase_client: SupabaseClient | undefined;
}

export function getSupabaseClient(): SupabaseClient {
  if (!globalThis.__gh_supabase_client) {
    globalThis.__gh_supabase_client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
      realtime: {
        params: {
          eventsPerSecond: 30,
        },
      },
    });
  }
  return globalThis.__gh_supabase_client;
}
