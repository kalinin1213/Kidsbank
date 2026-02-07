import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb, type User } from './db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'kidsbank-secret-key-change-in-production'
);

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hashSync(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(pin, hash);
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

export type SessionUser = {
  userId: number;
  name: string;
  role: 'parent' | 'child';
};

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function isSetupComplete(): boolean {
  const db = getDb();
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get() as { value: string } | undefined;
  return setting?.value === 'true';
}

export function getUserByName(name: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE name = ?').get(name) as User | undefined;
}
