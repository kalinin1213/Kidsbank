import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPin, isSetupComplete } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({ setupComplete: isSetupComplete() });
}

export async function POST(request: NextRequest) {
  try {
    if (isSetupComplete()) {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
    }

    const { pins } = await request.json();

    // Expect { Art: "1234", Anna: "1234", Mark: "1234", Sophie: "1234" }
    if (!pins || !pins.Art || !pins.Anna || !pins.Mark || !pins.Sophie) {
      return NextResponse.json({ error: 'All 4 PINs are required' }, { status: 400 });
    }

    for (const [name, pin] of Object.entries(pins)) {
      if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: `Invalid PIN for ${name}. Must be 4 digits.` }, { status: 400 });
      }
    }

    const db = getDb();
    const updatePin = db.prepare('UPDATE users SET pin_hash = ? WHERE name = ?');

    const txn = db.transaction(async () => {
      for (const [name, pin] of Object.entries(pins)) {
        const hash = await hashPin(pin as string);
        updatePin.run(hash, name);
      }
      db.prepare("UPDATE settings SET value = 'true', updated_at = datetime('now') WHERE key = 'setup_complete'").run();
    });

    await txn();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
