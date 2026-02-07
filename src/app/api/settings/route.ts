import { NextRequest, NextResponse } from 'next/server';
import { getDb, type User } from '@/lib/db';
import { getSession, hashPin } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const children = db.prepare("SELECT id, name, allowance FROM users WHERE role = 'child'").all();

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({ settings: settingsMap, children });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, ...data } = await request.json();

    const db = getDb();

    if (type === 'pin') {
      const { userName, newPin } = data;
      if (!userName || !newPin || !/^\d{4}$/.test(newPin)) {
        return NextResponse.json({ error: 'Invalid PIN. Must be 4 digits.' }, { status: 400 });
      }

      const user = db.prepare('SELECT * FROM users WHERE name = ?').get(userName) as User | undefined;
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const hash = await hashPin(newPin);
      db.prepare('UPDATE users SET pin_hash = ? WHERE name = ?').run(hash, userName);
      return NextResponse.json({ success: true });
    }

    if (type === 'allowance') {
      const { userId, amount } = data;
      if (amount === undefined || amount < 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }

      db.prepare('UPDATE users SET allowance = ? WHERE id = ?').run(parseFloat(amount), userId);
      return NextResponse.json({ success: true });
    }

    if (type === 'allowance_day') {
      const { day } = data;
      const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      if (!validDays.includes(day.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid day' }, { status: 400 });
      }

      db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'allowance_day'").run(day.toLowerCase());
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid setting type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
