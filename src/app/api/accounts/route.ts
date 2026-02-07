import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  if (session.role === 'parent') {
    const accounts = db.prepare(`
      SELECT a.*, u.name, u.allowance
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE u.role = 'child'
      ORDER BY u.name
    `).all();
    return NextResponse.json({ accounts });
  } else {
    const account = db.prepare(`
      SELECT a.*, u.name, u.allowance
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE u.id = ?
    `).get(session.userId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ accounts: [account] });
  }
}
