import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, getFirebaseConfigErrors } from './firebase';

// ---- Types ----

export type User = {
  id: string;
  name: string;
  role: 'parent' | 'child';
  pin_hash: string;
  allowance: number;
  avatar_url?: string;
};

export type Account = {
  id: string;
  user_id: string;
  user_name: string;
  balance: number;
};

export type Transaction = {
  id: string;
  account_id: string;
  type: 'allowance' | 'deposit' | 'withdrawal';
  amount: number;
  balance_after: number;
  comment: string;
  performed_by: string;
  created_at: string;
};

export type SavingsGoal = {
  id: string;
  account_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  emoji: string | null;
  is_completed: boolean;
  sort_order?: number;
};

// ---- Simple PIN hashing (SHA-256, client-side) ----

async function hashValue(value: string): Promise<string> {
  // Use a salt to make rainbow tables useless
  const salted = 'kidsbank-salt-v1:' + value;
  const encoded = new TextEncoder().encode(salted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string): Promise<string> {
  return hashValue(pin);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashValue(pin);
  return pinHash === hash;
}

// ---- Setup ----

export async function isSetupComplete(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    console.warn('[KidsBank] Firebase not configured — skipping setup check.');
    return false;
  }
  const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
  return settingsDoc.exists() && settingsDoc.data()?.setup_complete === true;
}

export async function completeSetup(pins: Record<string, string>): Promise<void> {
  if (!isFirebaseConfigured()) {
    const missing = getFirebaseConfigErrors();
    throw new Error(
      `Firebase is not configured. Missing: ${missing.map((k) => `NEXT_PUBLIC_FIREBASE_${k === 'apiKey' ? 'API_KEY' : k === 'projectId' ? 'PROJECT_ID' : 'APP_ID'}`).join(', ')}. ` +
      'Copy .env.example to .env.local and fill in your Firebase project values.'
    );
  }

  console.log('[KidsBank] Starting setup, writing to Firestore...');
  const batch = writeBatch(db);

  // Create users
  const users = [
    { name: 'Art', role: 'parent' as const, allowance: 0 },
    { name: 'Anna', role: 'parent' as const, allowance: 0 },
    { name: 'Mark', role: 'child' as const, allowance: 6.0 },
    { name: 'Sophie', role: 'child' as const, allowance: 4.0 },
  ];

  for (const user of users) {
    const pinHash = await hashPin(pins[user.name]);
    const userRef = doc(db, 'users', user.name.toLowerCase());
    batch.set(userRef, {
      name: user.name,
      role: user.role,
      pin_hash: pinHash,
      allowance: user.allowance,
    });

    // Create accounts for children
    if (user.role === 'child') {
      const accountRef = doc(db, 'accounts', user.name.toLowerCase());
      batch.set(accountRef, {
        user_id: user.name.toLowerCase(),
        user_name: user.name,
        balance: 0,
      });
    }
  }

  // Save settings
  batch.set(doc(db, 'settings', 'app'), {
    setup_complete: true,
    allowance_day: 'sunday',
    last_allowance_date: '',
  });

  try {
    await batch.commit();
    console.log('[KidsBank] Setup complete — all documents written to Firestore.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[KidsBank] Firestore batch commit failed:', msg);
    if (msg.includes('PERMISSION_DENIED') || msg.includes('permission')) {
      throw new Error(
        'Firestore denied the write. Update your Firestore Security Rules to allow reads/writes for the collections: users, accounts, settings, transactions, goals.'
      );
    }
    throw err;
  }
}

// ---- Auth ----

export async function loginUser(
  name: string,
  pin: string
): Promise<User | null> {
  if (!isFirebaseConfigured()) {
    console.error('[KidsBank] Cannot log in — Firebase is not configured.');
    return null;
  }
  const userDoc = await getDoc(doc(db, 'users', name.toLowerCase()));
  if (!userDoc.exists()) return null;

  const userData = userDoc.data();
  const valid = await verifyPin(pin, userData.pin_hash);
  if (!valid) return null;

  return {
    id: userDoc.id,
    name: userData.name,
    role: userData.role,
    pin_hash: userData.pin_hash,
    allowance: userData.allowance,
    avatar_url: userData.avatar_url || undefined,
  };
}

export async function getUser(userName: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, 'users', userName.toLowerCase()));
  if (!userDoc.exists()) return null;
  const data = userDoc.data();
  return {
    id: userDoc.id,
    name: data.name,
    role: data.role,
    pin_hash: data.pin_hash,
    allowance: data.allowance,
    avatar_url: data.avatar_url || undefined,
  };
}

export async function getAllUsers(): Promise<Pick<User, 'id' | 'name' | 'role' | 'avatar_url'>[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    role: d.data().role,
    avatar_url: d.data().avatar_url || undefined,
  }));
}

export async function updateAvatarUrl(userName: string, avatarUrl: string): Promise<void> {
  await updateDoc(doc(db, 'users', userName.toLowerCase()), { avatar_url: avatarUrl });
}

// ---- Accounts ----

export async function getAccounts(
  userRole: string,
  userId: string
): Promise<Account[]> {
  if (userRole === 'parent') {
    const snapshot = await getDocs(collection(db, 'accounts'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Account));
  } else {
    const accountDoc = await getDoc(doc(db, 'accounts', userId));
    if (!accountDoc.exists()) return [];
    return [{ id: accountDoc.id, ...accountDoc.data() } as Account];
  }
}

// ---- Transactions ----

export async function getTransactions(options: {
  accountId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  maxResults?: number;
}): Promise<Transaction[]> {
  const constraints = [];

  if (options.accountId) {
    constraints.push(where('account_id', '==', options.accountId));
  }

  // Avoid combining where() with orderBy() on different fields, which
  // requires a Firestore composite index.  All filtering beyond
  // account_id, sorting, and limiting are done client-side instead.
  const q = query(collection(db, 'transactions'), ...constraints);
  const snapshot = await getDocs(q);

  let results = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Transaction)
  );

  // Client-side type filtering
  if (options.type && options.type !== 'all') {
    results = results.filter((t) => t.type === options.type);
  }

  // Client-side date filtering
  if (options.startDate) {
    results = results.filter((t) => t.created_at >= options.startDate!);
  }
  if (options.endDate) {
    results = results.filter((t) => t.created_at <= options.endDate! + 'T23:59:59');
  }

  // Client-side sorting (newest first)
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Client-side limit
  const maxResults = options.maxResults || 50;
  return results.slice(0, maxResults);
}

export async function createTransaction(params: {
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  comment: string;
  performedBy: string;
  date?: string;
}): Promise<{ balance: number }> {
  const accountRef = doc(db, 'accounts', params.accountId);

  const newBalance = await runTransaction(db, async (transaction) => {
    const accountDoc = await transaction.get(accountRef);
    if (!accountDoc.exists()) throw new Error('Account not found');

    const account = accountDoc.data();
    const txnAmount =
      params.type === 'withdrawal' ? -params.amount : params.amount;
    const balance = Math.round((account.balance + txnAmount) * 100) / 100;

    if (balance < 0) throw new Error('Insufficient balance');

    const createdAt = params.date
      ? new Date(params.date).toISOString()
      : new Date().toISOString();

    transaction.update(accountRef, { balance });

    const txnRef = doc(collection(db, 'transactions'));
    transaction.set(txnRef, {
      account_id: params.accountId,
      type: params.type,
      amount: txnAmount,
      balance_after: balance,
      comment: params.comment,
      performed_by: params.performedBy,
      created_at: createdAt,
    });

    return balance;
  });

  return { balance: newBalance };
}

// ---- Savings Goals ----

export async function getGoals(accountId?: string): Promise<SavingsGoal[]> {
  let q;
  if (accountId) {
    q = query(
      collection(db, 'goals'),
      where('account_id', '==', accountId)
    );
  } else {
    q = query(collection(db, 'goals'));
  }

  const snapshot = await getDocs(q);
  const goals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SavingsGoal));

  // Client-side sort: by sort_order ascending (legacy docs without sort_order go to end)
  goals.sort((a, b) => {
    const orderA = a.sort_order ?? Infinity;
    const orderB = b.sort_order ?? Infinity;
    return orderA - orderB;
  });

  return goals;
}

export async function createGoal(params: {
  accountId: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  emoji?: string;
}): Promise<SavingsGoal> {
  // Determine the next sort_order for this account
  const existingGoals = await getGoals(params.accountId);
  const maxOrder = existingGoals.reduce(
    (max, g) => Math.max(max, g.sort_order ?? 0),
    0
  );

  const docRef = await addDoc(collection(db, 'goals'), {
    account_id: params.accountId,
    name: params.name,
    target_amount: params.targetAmount,
    target_date: params.targetDate || null,
    emoji: params.emoji || null,
    is_completed: false,
    sort_order: maxOrder + 1,
    created_at: new Date().toISOString(),
  });

  const created = await getDoc(docRef);
  return { id: created.id, ...created.data() } as SavingsGoal;
}

export async function updateGoal(
  goalId: string,
  updates: Partial<{
    name: string;
    target_amount: number;
    target_date: string | null;
    emoji: string | null;
    is_completed: boolean;
    sort_order: number;
  }>
): Promise<void> {
  await updateDoc(doc(db, 'goals', goalId), updates);
}

export async function deleteGoal(goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'goals', goalId));
}

export async function reorderGoals(goalIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  goalIds.forEach((id, index) => {
    batch.update(doc(db, 'goals', id), { sort_order: index });
  });
  await batch.commit();
}

// ---- Settings ----

export async function getSettings(): Promise<{
  settings: Record<string, string | boolean>;
  children: { id: string; name: string; allowance: number; avatar_url?: string }[];
}> {
  const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
  const settings = settingsDoc.exists() ? settingsDoc.data() : {};

  const usersSnapshot = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'child'))
  );
  const children = usersSnapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    allowance: d.data().allowance,
    avatar_url: d.data().avatar_url || undefined,
  }));

  return { settings, children };
}

export async function updatePin(userName: string, newPin: string): Promise<void> {
  const hash = await hashPin(newPin);
  await updateDoc(doc(db, 'users', userName.toLowerCase()), { pin_hash: hash });
}

export async function updateAllowance(userId: string, amount: number): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { allowance: amount });
}

export async function updateAllowanceDay(day: string): Promise<void> {
  await updateDoc(doc(db, 'settings', 'app'), { allowance_day: day });
}

// ---- Allowance Processing ----

const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export async function processAllowances(): Promise<{ processed: number }> {
  const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
  if (!settingsDoc.exists()) return { processed: 0 };

  const settings = settingsDoc.data();
  const allowanceDay = settings.allowance_day || 'sunday';
  const lastAllowanceDateStr = settings.last_allowance_date || '';

  const targetDayIndex = DAYS_OF_WEEK.indexOf(allowanceDay.toLowerCase());
  if (targetDayIndex === -1) return { processed: 0 };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const missedDates: Date[] = [];
  let checkDate: Date;

  if (lastAllowanceDateStr) {
    const lastDate = new Date(lastAllowanceDateStr);
    checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1);
  } else {
    checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 6);
  }

  while (checkDate <= today) {
    if (checkDate.getDay() === targetDayIndex) {
      missedDates.push(new Date(checkDate));
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  if (missedDates.length === 0) return { processed: 0 };

  // Get child users
  const usersSnapshot = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'child'))
  );

  let processed = 0;

  for (const date of missedDates) {
    const dateStr = date.toISOString().split('T')[0];

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.allowance <= 0) continue;

      const accountRef = doc(db, 'accounts', userDoc.id);

      await runTransaction(db, async (transaction) => {
        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) return;

        const account = accountDoc.data();
        const newBalance = Math.round((account.balance + user.allowance) * 100) / 100;

        transaction.update(accountRef, { balance: newBalance });

        const txnRef = doc(collection(db, 'transactions'));
        transaction.set(txnRef, {
          account_id: userDoc.id,
          type: 'allowance',
          amount: user.allowance,
          balance_after: newBalance,
          comment: 'Weekly allowance',
          performed_by: 'System',
          created_at: dateStr + 'T00:01:00.000Z',
        });
      });

      processed++;
    }

    await updateDoc(doc(db, 'settings', 'app'), {
      last_allowance_date: dateStr,
    });
  }

  return { processed };
}
