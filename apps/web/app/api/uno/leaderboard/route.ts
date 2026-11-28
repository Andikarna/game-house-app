import { NextResponse } from 'next/server';
import { fetchUnoLeaderboardData } from '../../../../lib/uno-supabase';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

export async function GET() {
  const data = await fetchUnoLeaderboardData(20);
  return NextResponse.json({
    success: true,
    ...data,
  });
}
