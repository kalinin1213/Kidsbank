'use client';

import { useState } from 'react';

type AccountData = {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  allowance: number;
};

export default function TransactionForm({
  type,
  accounts,
  selectedAccountId,
  userName,
  onComplete,
}: {
  type: 'deposit' | 'withdrawal';
  accounts: AccountData[];
  selectedAccountId: number | null;
  userName: string;
  onComplete: () => void;
}) {
  const [accountId, setAccountId] = useState<number>(selectedAccountId || accounts[0]?.id || 0);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isDeposit = type === 'deposit';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!comment.trim()) {
      setError('Please add a comment');
      return;
    }

    if (!isDeposit && selectedAccount && parsedAmount > selectedAccount.balance) {
      setError(`Not enough money! Balance is ${selectedAccount.balance.toFixed(2)} CHF`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          type,
          amount: parsedAmount,
          comment: comment.trim(),
          date: date || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(onComplete, 1500);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">{isDeposit ? '✅' : '🛍️'}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {isDeposit ? 'Money Added!' : 'Withdrawal Complete!'}
        </h2>
        <p className="text-gray-500">
          {parseFloat(amount).toFixed(2)} CHF {isDeposit ? 'added to' : 'withdrawn from'}{' '}
          {selectedAccount?.name}&apos;s account
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isDeposit ? '💰 Add Money' : '🛍️ Withdraw Money'}
      </h2>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Account selector (for parents with multiple accounts) */}
        {accounts.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Account</label>
            <div className="flex gap-3">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    accountId === acc.id
                      ? acc.name === 'Mark'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-gray-800">{acc.name}</p>
                  <p className="text-sm text-gray-500">{acc.balance.toFixed(2)} CHF</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show balance for context */}
        {selectedAccount && (
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-500">Current balance</p>
            <p className="text-xl font-bold text-gray-800">{selectedAccount.balance.toFixed(2)} CHF</p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Amount (CHF)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input-field text-2xl text-center font-bold"
            required
          />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            What&apos;s it for? *
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isDeposit ? 'e.g., Birthday money from Grandma' : 'e.g., Lego Star Wars set'}
            className="input-field"
            required
          />
        </div>

        {/* Date (optional, for parents) */}
        {isDeposit && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Date (optional, defaults to today)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-center font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full font-bold py-4 rounded-2xl text-white text-lg transition-colors ${
            isDeposit
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          } disabled:opacity-50`}
        >
          {loading
            ? 'Processing...'
            : isDeposit
              ? `Add ${amount ? parseFloat(amount).toFixed(2) : '0.00'} CHF`
              : `Withdraw ${amount ? parseFloat(amount).toFixed(2) : '0.00'} CHF`}
        </button>
      </form>
    </div>
  );
}
