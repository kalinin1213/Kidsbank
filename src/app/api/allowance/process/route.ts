import { NextResponse } from 'next/server';
import { processAllowances } from '@/lib/allowance';

// Can be called by a cron job or on app load to process missed allowances
export async function POST() {
  try {
    const result = processAllowances();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
