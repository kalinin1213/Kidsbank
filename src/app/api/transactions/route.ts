import { NextRequest, NextResponse } from 'next/server';
import { getDb, type Account } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '50');

  const db = getDb();

  // Verify access
  if (session.role === 'child') {
    const account = db.prepare(
      'SELECT * FROM accounts WHERE user_id = ?'
    ).get(session.userId) as Account | undefined;

    if (!account || (accountId && parseInt(accountId) !== account.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let query = 'SELECT t.* FROM transactions t';
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (accountId) {
    conditions.push('t.account_id = ?');
    params.push(parseInt(accountId));
  } else if (session.role === 'child') {
    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as { id: number };
    conditions.push('t.account_id = ?');
    params.push(account.id);
  }

  if (type && type !== 'all') {
    conditions.push('t.type = ?');
    params.push(type);
  }

  if (startDate) {
    conditions.push('t.created_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('t.created_at <= ?');
    params.push(endDate + 'T23:59:59');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(limit);

  const transactions = db.prepare(query).all(...params);
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accountId, type, amount, comment, date } = await request.json();

    if (!accountId || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'deposit' && session.role !== 'parent') {
      return NextResponse.json({ error: 'Only parents can make deposits' }, { status: 403 });
    }

    if ((type === 'deposit' || type === 'withdrawal') && !comment?.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const db = getDb();

    // Verify account access for children
    if (session.role === 'child') {
      const ownAccount = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as { id: number } | undefined;
      if (!ownAccount || ownAccount.id !== accountId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as Account | undefined;
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const txnAmount = type === 'withdrawal' ? -parsedAmount : parsedAmount;
    const newBalance = Math.round((account.balance + txnAmount) * 100) / 100;

    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const createdAt = date ? new Date(date).toISOString() : new Date().toISOString();

    const txn = db.transaction(() => {
      db.prepare('UPDATE accounts SET balance = ?, updated_at = datetime(?) WHERE id = ?')
        .run(newBalance, createdAt, accountId);

      db.prepare(
        'INSERT INTO transactions (account_id, type, amount, balance_after, comment, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(accountId, type, txnAmount, newBalance, comment || null, session.name, createdAt);
    });

    txn();

    return NextResponse.json({ success: true, balance: newBalance });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
