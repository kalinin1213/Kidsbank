'use client';

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

type View = 'dashboard' | 'history' | 'deposit' | 'withdraw' | 'goals' | 'settings';

function formatCHF(amount: number): string {
  return `${amount.toFixed(2)} CHF`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'deposit': return 'text-green-600';
    case 'withdrawal': return 'text-red-500';
    case 'allowance': return 'text-blue-500';
    default: return 'text-gray-600';
  }
}

function getChildColor(name: string): { bg: string; text: string; light: string; border: string } {
  if (name === 'Mark') {
    return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' };
  }
  return { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' };
}

export default function ParentDashboard({
  accounts,
  transactions,
  goals,
  onAction,
}: {
  accounts: AccountData[];
  transactions: Record<string, TransactionData[]>;
  goals: GoalData[];
  onAction: (action: View, accountId?: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Family Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((account) => {
          const colors = getChildColor(account.name);
          const accountGoals = goals.filter((g) => g.account_id === account.id && !g.is_completed);
          const recentTxns = (transactions[account.id] || []).slice(0, 3);
          const activeGoal = accountGoals[0];

          return (
            <div key={account.id} className={`card border-2 ${colors.border}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                    {account.name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{account.name}</h3>
                    <p className="text-sm text-gray-500">Allowance: {formatCHF(account.allowance)}/week</p>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className={`${colors.light} rounded-2xl p-4 mb-4`}>
                <p className="text-sm text-gray-500 mb-1">Balance</p>
                <p className={`text-3xl font-bold ${colors.text}`}>{formatCHF(account.balance)}</p>
              </div>

              {/* Active Goal */}
              {activeGoal && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {activeGoal.emoji || '🎯'} {activeGoal.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatCHF(Math.min(account.balance, activeGoal.target_amount))} / {formatCHF(activeGoal.target_amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${colors.bg} h-3 rounded-full transition-all`}
                      style={{ width: `${Math.min(100, (account.balance / activeGoal.target_amount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {recentTxns.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Recent</p>
                  <div className="space-y-2">
                    {recentTxns.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={getTypeColor(txn.type)}>
                            {txn.type === 'withdrawal' ? '−' : '+'}
                          </span>
                          <span className="text-gray-600 truncate max-w-[150px]">
                            {txn.comment || txn.type}
                          </span>
                        </div>
                        <span className={`font-medium ${getTypeColor(txn.type)}`}>
                          {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAction('deposit', account.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  + Add Money
                </button>
                <button
                  onClick={() => onAction('withdraw', account.id)}
                  className="flex-1 bg-red-400 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  − Withdraw
                </button>
              </div>

              {/* Links */}
              <div className="flex gap-4 mt-3 justify-center">
                <button
                  onClick={() => onAction('history', account.id)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  History
                </button>
                <button
                  onClick={() => onAction('goals', account.id)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Goals
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
