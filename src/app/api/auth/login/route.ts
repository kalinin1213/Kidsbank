import { NextRequest, NextResponse } from 'next/server';
import { getDb, type User } from '@/lib/db';
import { verifyPin, createSession } from '@/lib/auth';
import { processAllowances } from '@/lib/allowance';

export async function POST(request: NextRequest) {
  try {
    const { name, pin } = await request.json();

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as User | undefined;

    if (!user || !user.pin_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPin(pin, user.pin_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Process any missed allowances on login
    processAllowances();

    const token = await createSession(user);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
