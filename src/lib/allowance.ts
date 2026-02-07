import { getDb, type User, type Account } from './db';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function processAllowances(): { processed: number } {
  const db = getDb();

  const allowanceDaySetting = db.prepare("SELECT value FROM settings WHERE key = 'allowance_day'").get() as { value: string } | undefined;
  const lastAllowanceSetting = db.prepare("SELECT value FROM settings WHERE key = 'last_allowance_date'").get() as { value: string } | undefined;

  const allowanceDay = allowanceDaySetting?.value || 'sunday';
  const lastAllowanceDateStr = lastAllowanceSetting?.value || '';

  const targetDayIndex = DAYS_OF_WEEK.indexOf(allowanceDay.toLowerCase());
  if (targetDayIndex === -1) return { processed: 0 };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find all allowance dates that should have been processed since last run
  const missedDates: Date[] = [];

  let checkDate: Date;
  if (lastAllowanceDateStr) {
    const lastDate = new Date(lastAllowanceDateStr);
    checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1); // Start from day after last processed
  } else {
    // First time running - start from last occurrence of allowance day
    checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 7);
  }

  while (checkDate <= today) {
    if (checkDate.getDay() === targetDayIndex) {
      missedDates.push(new Date(checkDate));
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  if (missedDates.length === 0) return { processed: 0 };

  // Get child users with their accounts
  const children = db.prepare(
    "SELECT u.*, a.id as account_id, a.balance FROM users u JOIN accounts a ON a.user_id = u.id WHERE u.role = 'child'"
  ).all() as (User & { account_id: number; balance: number })[];

  let processed = 0;

  const addAllowance = db.transaction(() => {
    for (const date of missedDates) {
      const dateStr = date.toISOString().split('T')[0];
      for (const child of children) {
        if (child.allowance <= 0) continue;

        const newBalance = child.balance + child.allowance;

        db.prepare('UPDATE accounts SET balance = ?, updated_at = datetime(?) WHERE id = ?')
          .run(newBalance, dateStr + 'T00:01:00', child.account_id);

        db.prepare(
          'INSERT INTO transactions (account_id, type, amount, balance_after, comment, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          child.account_id,
          'allowance',
          child.allowance,
          newBalance,
          'Weekly allowance',
          'System',
          dateStr + 'T00:01:00'
        );

        // Update in-memory balance for subsequent iterations
        child.balance = newBalance;
        processed++;
      }

      // Update last allowance date after each day
      db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'last_allowance_date'")
        .run(dateStr);
    }
  });

  addAllowance();
  return { processed };
}
