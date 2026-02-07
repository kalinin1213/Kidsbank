import { NextRequest, NextResponse } from 'next/server';
import { getDb, type Account, type SavingsGoal } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  const db = getDb();

  if (session.role === 'child') {
    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as { id: number } | undefined;
    if (!account || (accountId && parseInt(accountId) !== account.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const goals = db.prepare('SELECT * FROM savings_goals WHERE account_id = ? ORDER BY created_at DESC').all(account.id);
    return NextResponse.json({ goals });
  }

  if (accountId) {
    const goals = db.prepare('SELECT * FROM savings_goals WHERE account_id = ? ORDER BY created_at DESC').all(parseInt(accountId));
    return NextResponse.json({ goals });
  }

  const goals = db.prepare('SELECT * FROM savings_goals ORDER BY created_at DESC').all();
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accountId, name, targetAmount, targetDate, emoji } = await request.json();

    if (!accountId || !name || !targetAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();

    // Verify access for children
    if (session.role === 'child') {
      const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as { id: number } | undefined;
      if (!account || account.id !== accountId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const result = db.prepare(
      'INSERT INTO savings_goals (account_id, name, target_amount, target_date, emoji) VALUES (?, ?, ?, ?, ?)'
    ).run(accountId, name, parseFloat(targetAmount), targetDate || null, emoji || null);

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ goal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, targetAmount, targetDate, emoji, isCompleted } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 });
    }

    const db = getDb();
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as SavingsGoal | undefined;

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access for children
    if (session.role === 'child') {
      const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as { id: number } | undefined;
      if (!account || account.id !== goal.account_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    db.prepare(
      'UPDATE savings_goals SET name = ?, target_amount = ?, target_date = ?, emoji = ?, is_completed = ? WHERE id = ?'
    ).run(
      name || goal.name,
      targetAmount ? parseFloat(targetAmount) : goal.target_amount,
      targetDate !== undefined ? targetDate : goal.target_date,
      emoji !== undefined ? emoji : goal.emoji,
      isCompleted !== undefined ? (isCompleted ? 1 : 0) : goal.is_completed,
      id
    );

    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
    return NextResponse.json({ goal: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 });
    }

    const db = getDb();
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(parseInt(id)) as SavingsGoal | undefined;

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access for children
    if (session.role === 'child') {
      const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.userId) as Account | undefined;
      if (!account || account.id !== goal.account_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    db.prepare('DELETE FROM savings_goals WHERE id = ?').run(parseInt(id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
