import { NextResponse } from 'next/server';
import { fetchUnoLeaderboardData } from '../../../../lib/uno-mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchUnoLeaderboardData(20);
  return NextResponse.json({
    success: true,
    ...data,
  });
}
