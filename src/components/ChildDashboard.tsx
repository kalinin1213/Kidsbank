'use client';

import { computeGoalAllocations } from '@/lib/goalUtils';

type AccountData = {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  allowance: number;
};

type TransactionData = {
  id: string;
  account_id: string;
  type: 'allowance' | 'deposit' | 'withdrawal';
  amount: number;
  balance_after: number;
  comment: string | null;
  performed_by: string;
  created_at: string;
};

type GoalData = {
  id: string;
  account_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  emoji: string | null;
  is_completed: boolean;
  sort_order?: number;
};

type View = 'dashboard' | 'history' | 'deposit' | 'withdraw' | 'goals' | 'settings' | 'child-settings';

function formatCHF(amount: number): string {
  return `${amount.toFixed(2)} CHF`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'deposit': return 'text-green-600';
    case 'withdrawal': return 'text-red-500';
    case 'allowance': return 'text-blue-500';
    default: return 'text-gray-600';
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'deposit': return '💰';
    case 'withdrawal': return '🛍️';
    case 'allowance': return '📅';
    default: return '💫';
  }
}

export default function ChildDashboard({
  account,
  transactions,
  goals,
  userName,
  onAction,
}: {
  account: AccountData;
  transactions: TransactionData[];
  goals: GoalData[];
  userName: string;
  onAction: (action: View, accountId?: string) => void;
}) {
  const isMark = userName === 'Mark';
  const colors = isMark
    ? { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' }
    : { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-400 to-purple-600' };

  const activeGoals = goals.filter((g) => !g.is_completed);

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className={`bg-gradient-to-br ${colors.gradient} rounded-3xl p-8 text-white text-center shadow-lg`}>
        <p className="text-white/80 text-lg mb-2">Your Balance</p>
        <p className="text-5xl font-bold mb-2">{formatCHF(account.balance)}</p>
        <p className="text-white/60 text-sm">+{formatCHF(account.allowance)} every week</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onAction('withdraw', account.id)}
          className="flex-1 bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <span className="text-2xl block mb-1">🛍️</span>
          <span className="text-sm font-semibold text-gray-700">Withdraw</span>
        </button>
        <button
          onClick={() => onAction('goals', account.id)}
          className="flex-1 bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <span className="text-2xl block mb-1">🎯</span>
          <span className="text-sm font-semibold text-gray-700">My Goals</span>
        </button>
        <button
          onClick={() => onAction('history', account.id)}
          className="flex-1 bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="text-sm font-semibold text-gray-700">History</span>
        </button>
        <button
          onClick={() => onAction('child-settings')}
          className="flex-1 bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <span className="text-2xl block mb-1">&#9881;&#65039;</span>
          <span className="text-sm font-semibold text-gray-700">Settings</span>
        </button>
      </div>

      {/* Savings Goals */}
      {activeGoals.length > 0 && (() => {
        const allocations = computeGoalAllocations(activeGoals, account.balance);
        return (
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Savings Goals</h3>
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const alloc = allocations.get(goal.id);
                const allocated = alloc?.allocated ?? 0;
                const percent = alloc?.percent ?? 0;
                const remaining = alloc?.remaining ?? goal.target_amount;
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">
                        {goal.emoji || '🎯'} {goal.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`${colors.bg} h-4 rounded-full transition-all flex items-center justify-center`}
                        style={{ width: `${percent}%` }}
                      >
                        {percent >= 20 && (
                          <span className="text-white text-xs font-bold">
                            {formatCHF(allocated)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {remaining > 0
                        ? `${formatCHF(remaining)} more to go!`
                        : 'Goal reached! 🎉'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
          <button
            onClick={() => onAction('history', account.id)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            See all &rarr;
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center gap-3">
                <span className="text-2xl">{getTypeIcon(txn.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 truncate">
                    {txn.comment || txn.type}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(txn.created_at)}</p>
                </div>
                <span className={`font-bold ${getTypeColor(txn.type)}`}>
                  {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
