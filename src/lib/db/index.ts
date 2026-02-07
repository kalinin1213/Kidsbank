import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'kidsbank.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('parent', 'child')),
      pin_hash TEXT,
      allowance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('allowance', 'deposit', 'withdrawal')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      comment TEXT,
      performed_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      target_date TEXT,
      emoji TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed users if they don't exist
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = database.prepare(
      'INSERT INTO users (name, role, allowance) VALUES (?, ?, ?)'
    );
    const insertAccount = database.prepare(
      'INSERT INTO accounts (user_id, balance) VALUES (?, 0)'
    );

    const txn = database.transaction(() => {
      insertUser.run('Art', 'parent', 0);
      insertUser.run('Anna', 'parent', 0);
      const markResult = insertUser.run('Mark', 'child', 6.0);
      const sophieResult = insertUser.run('Sophie', 'child', 4.0);
      insertAccount.run(markResult.lastInsertRowid);
      insertAccount.run(sophieResult.lastInsertRowid);
    });
    txn();
  }

  // Seed default settings if they don't exist
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    database.prepare("INSERT INTO settings (key, value) VALUES ('allowance_day', 'sunday')").run();
    database.prepare("INSERT INTO settings (key, value) VALUES ('last_allowance_date', '')").run();
    database.prepare("INSERT INTO settings (key, value) VALUES ('setup_complete', 'false')").run();
  }
}

export type User = {
  id: number;
  name: string;
  role: 'parent' | 'child';
  pin_hash: string | null;
  allowance: number;
  created_at: string;
};

export type Account = {
  id: number;
  user_id: number;
  balance: number;
  updated_at: string;
};

export type Transaction = {
  id: number;
  account_id: number;
  type: 'allowance' | 'deposit' | 'withdrawal';
  amount: number;
  balance_after: number;
  comment: string | null;
  performed_by: string;
  created_at: string;
};

export type SavingsGoal = {
  id: number;
  account_id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  emoji: string | null;
  is_completed: number;
  created_at: string;
};

export type Setting = {
  id: number;
  key: string;
  value: string;
  updated_at: string;
};
