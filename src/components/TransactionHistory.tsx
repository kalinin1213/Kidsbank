'use client';

import { useState, useEffect, useMemo } from 'react';
import { subscribeToTransactions, filterTransactions } from '@/lib/db';

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

const SLOW_CONNECTION_MS = 6000;

function formatCHF(amount: number): string {
  return `${amount.toFixed(2)} CHF`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'deposit': return 'text-green-600';
    case 'withdrawal': return 'text-red-500';
    case 'allowance': return 'text-blue-500';
    default: return 'text-gray-600';
  }
}

function getTypeBg(type: string): string {
  switch (type) {
    case 'deposit': return 'bg-green-100';
    case 'withdrawal': return 'bg-red-100';
    case 'allowance': return 'bg-blue-100';
    default: return 'bg-gray-100';
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

export default function TransactionHistory({
  accounts,
  selectedAccountId,
  isParent,
}: {
  accounts: AccountData[];
  selectedAccountId: string | null;
  isParent: boolean;
}) {
  const [allTransactions, setAllTransactions] = useState<TransactionData[] | null>(null);
  const [accountId, setAccountId] = useState<string | null>(selectedAccountId);
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slowConnection, setSlowConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen rather than fetch: the listener answers from the offline cache right
  // away and keeps the list in sync, where a one-shot fetch could wait forever
  // on a stalled connection and leave the screen stuck on "Loading...".
  useEffect(() => {
    setAllTransactions(null);
    setError(null);
    setSlowConnection(false);
    let hasData = false;

    const timer = setTimeout(() => setSlowConnection(true), SLOW_CONNECTION_MS);
    const unsubscribe = subscribeToTransactions(
      accountId || undefined,
      (txns, meta) => {
        setError(null);
        // An empty answer from a cold cache means "nothing stored yet", not
        // "no transactions" — keep waiting for the server.
        if (txns.length === 0 && meta.fromCache && !hasData) return;
        hasData = true;
        setAllTransactions(txns);
      },
      () => setError('Could not load the history. Check your connection.')
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [accountId]);

  const transactions = useMemo(
    () =>
      allTransactions &&
      filterTransactions(allTransactions, {
        type: typeFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        maxResults: 100,
      }),
    [allTransactions, typeFilter, startDate, endDate]
  );

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Unknown';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Transaction History</h2>

      {/* Filters */}
      <div className="card mb-6 space-y-4">
        {/* Account filter (parent only) */}
        {isParent && accounts.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Account</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAccountId(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !accountId ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    accountId === acc.id
                      ? acc.name === 'Mark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type filter */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Type</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'allowance', label: '📅 Allowance' },
              { value: 'deposit', label: '💰 Deposit' },
              { value: 'withdrawal', label: '🛍️ Withdrawal' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-row flex-wrap gap-3">
          <div className="w-40 shrink-0">
            <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field !px-3 !py-2 !text-sm"
            />
          </div>
          <div className="w-40 shrink-0">
            <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field !px-3 !py-2 !text-sm"
            />
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-3">
        {transactions === null ? (
          <div className="text-center py-8 text-gray-400">
            <p>Loading...</p>
            {(slowConnection || error) && (
              <p className="text-sm text-gray-500 mt-2">
                {error ?? 'This is taking longer than usual — the connection looks slow.'}
              </p>
            )}
          </div>
        ) : transactions.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          transactions.map((txn) => (
            <div key={txn.id} className="card py-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${getTypeBg(txn.type)} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                  {getTypeIcon(txn.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {txn.comment || txn.type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(txn.created_at)}
                        {isParent && ' · ' + getAccountName(txn.account_id)}
                        {' · by ' + txn.performed_by}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold ${getTypeColor(txn.type)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatCHF(txn.balance_after)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
