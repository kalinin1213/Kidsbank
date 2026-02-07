'use client';

import { useState } from 'react';

type AccountData = {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  allowance: number;
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

function formatCHF(amount: number): string {
  return `${amount.toFixed(2)} CHF`;
}

const EMOJI_OPTIONS = ['🎮', '🚲', '📱', '🎨', '⚽', '🎸', '📚', '🧸', '🎯', '🌟', '🎪', '🏖️'];

export default function SavingsGoals({
  accounts,
  goals,
  selectedAccountId,
  isParent,
  onUpdate,
}: {
  accounts: AccountData[];
  goals: GoalData[];
  selectedAccountId: number | null;
  isParent: boolean;
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formAccountId, setFormAccountId] = useState<number>(selectedAccountId || accounts[0]?.id || 0);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredGoals = selectedAccountId
    ? goals.filter((g) => g.account_id === selectedAccountId)
    : goals;

  const activeGoals = filteredGoals.filter((g) => !g.is_completed);
  const completedGoals = filteredGoals.filter((g) => g.is_completed);

  function getAccountBalance(accountId: number): number {
    return accounts.find((a) => a.id === accountId)?.balance || 0;
  }

  function getAccountName(accountId: number): string {
    return accounts.find((a) => a.id === accountId)?.name || '';
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formAccountId,
          name,
          targetAmount: parseFloat(targetAmount),
          targetDate: targetDate || null,
          emoji,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setName('');
        setTargetAmount('');
        setTargetDate('');
        setEmoji('🎯');
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create goal');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleComplete(goal: GoalData) {
    try {
      await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id, isCompleted: !goal.is_completed }),
      });
      onUpdate();
    } catch {
      // Ignore
    }
  }

  async function handleDelete(goalId: number) {
    if (!confirm('Delete this goal?')) return;
    try {
      await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' });
      onUpdate();
    } catch {
      // Ignore
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🎯 Savings Goals</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm py-2 px-4"
        >
          {showForm ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h3 className="font-bold text-gray-700">New Savings Goal</h3>

          {/* Account selector */}
          {isParent && accounts.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">For</label>
              <div className="flex gap-3">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setFormAccountId(acc.id)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      formAccountId === acc.id
                        ? acc.name === 'Mark'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-800">{acc.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nintendo Switch"
              className="input-field"
              required
            />
          </div>

          {/* Target amount */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Target Amount (CHF)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              className="input-field"
              required
            />
          </div>

          {/* Target date */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Target Date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
        </form>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 && !showForm && (
        <div className="card text-center py-8">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-400">No savings goals yet</p>
          <p className="text-sm text-gray-400 mt-1">Create one to start saving!</p>
        </div>
      )}

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const balance = getAccountBalance(goal.account_id);
          const percent = Math.min(100, (balance / goal.target_amount) * 100);
          const remaining = Math.max(0, goal.target_amount - balance);
          const childName = getAccountName(goal.account_id);
          const isMarkAccount = childName === 'Mark';

          return (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{goal.emoji || '🎯'}</span>
                  <div>
                    <h3 className="font-bold text-gray-800">{goal.name}</h3>
                    {isParent && <p className="text-sm text-gray-500">{childName}</p>}
                    {goal.target_date && (
                      <p className="text-xs text-gray-400">
                        Target: {new Date(goal.target_date).toLocaleDateString('de-CH')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleComplete(goal)}
                    className="text-sm px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    title="Mark complete"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-sm px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{formatCHF(balance)}</span>
                  <span>{formatCHF(goal.target_amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${isMarkAccount ? 'bg-blue-500' : 'bg-purple-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                {remaining > 0
                  ? `${formatCHF(remaining)} more to reach your goal (${percent.toFixed(0)}%)`
                  : 'Goal reached! 🎉'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-600 mb-4">Completed</h3>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="card py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.emoji || '🎯'}</span>
                    <div>
                      <p className="font-medium text-gray-600 line-through">{goal.name}</p>
                      {isParent && (
                        <p className="text-xs text-gray-400">{getAccountName(goal.account_id)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-xs text-gray-400 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
