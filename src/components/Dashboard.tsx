'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentDashboard from './ParentDashboard';
import ChildDashboard from './ChildDashboard';
import TransactionHistory from './TransactionHistory';
import TransactionForm from './TransactionForm';
import SavingsGoals from './SavingsGoals';
import Settings from './Settings';

type User = { userId: number; name: string; role: 'parent' | 'child' };

type AccountData = {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  allowance: number;
};

type TransactionData = {
  id: number;
  account_id: number;
  type: 'allowance' | 'deposit' | 'withdrawal';
  amount: number;
  balance_after: number;
  comment: string | null;
  performed_by: string;
  created_at: string;
};

type GoalData = {
  id: number;
  account_id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  emoji: string | null;
  is_completed: number;
};

type View = 'dashboard' | 'history' | 'deposit' | 'withdraw' | 'goals' | 'settings';

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [view, setView] = useState<View>('dashboard');
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [transactions, setTransactions] = useState<Record<number, TransactionData[]>>({});
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, goalsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/goals'),
      ]);
      const accData = await accRes.json();
      const goalsData = await goalsRes.json();

      setAccounts(accData.accounts || []);
      setGoals(goalsData.goals || []);

      // Fetch recent transactions for each account
      const txnMap: Record<number, TransactionData[]> = {};
      for (const acc of accData.accounts || []) {
        const txnRes = await fetch(`/api/transactions?accountId=${acc.id}&limit=5`);
        const txnData = await txnRes.json();
        txnMap[acc.id] = txnData.transactions || [];
      }
      setTransactions(txnMap);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleAction(action: View, accountId?: number) {
    if (accountId) setSelectedAccountId(accountId);
    setView(action);
  }

  function handleBack() {
    setView('dashboard');
    setSelectedAccountId(null);
    fetchData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  // Header
  const header = (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'dashboard' && (
            <button onClick={handleBack} className="text-gray-500 hover:text-gray-700 text-lg font-bold">
              &larr;
            </button>
          )}
          <h1
            className="text-xl font-bold text-emerald-700 cursor-pointer"
            onClick={handleBack}
          >
            Kids Bank
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'parent' && view === 'dashboard' && (
            <button
              onClick={() => setView('settings')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <div className="text-sm text-gray-500">
            {user.name}
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );

  const childAccount = user.role === 'child' ? accounts[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {view === 'dashboard' && user.role === 'parent' && (
          <ParentDashboard
            accounts={accounts}
            transactions={transactions}
            goals={goals}
            onAction={handleAction}
          />
        )}
        {view === 'dashboard' && user.role === 'child' && childAccount && (
          <ChildDashboard
            account={childAccount}
            transactions={transactions[childAccount.id] || []}
            goals={goals.filter((g) => g.account_id === childAccount.id)}
            userName={user.name}
            onAction={handleAction}
          />
        )}
        {view === 'history' && (
          <TransactionHistory
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            isParent={user.role === 'parent'}
          />
        )}
        {view === 'deposit' && (
          <TransactionForm
            type="deposit"
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            userName={user.name}
            onComplete={handleBack}
          />
        )}
        {view === 'withdraw' && (
          <TransactionForm
            type="withdrawal"
            accounts={accounts}
            selectedAccountId={selectedAccountId || (childAccount?.id ?? null)}
            userName={user.name}
            onComplete={handleBack}
          />
        )}
        {view === 'goals' && (
          <SavingsGoals
            accounts={accounts}
            goals={goals}
            selectedAccountId={selectedAccountId || (childAccount?.id ?? null)}
            isParent={user.role === 'parent'}
            onUpdate={fetchData}
          />
        )}
        {view === 'settings' && (
          <Settings onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
