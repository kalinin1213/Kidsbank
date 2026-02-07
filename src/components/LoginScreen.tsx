'use client';

import { useState } from 'react';
import { loginUser } from '@/lib/db';

type User = { userId: string; name: string; role: 'parent' | 'child' };

const USERS = [
  { name: 'Art', emoji: '👨', color: 'bg-emerald-500 hover:bg-emerald-600', role: 'parent' },
  { name: 'Anna', emoji: '👩', color: 'bg-teal-500 hover:bg-teal-600', role: 'parent' },
  { name: 'Mark', emoji: '👦', color: 'bg-blue-500 hover:bg-blue-600', role: 'child' },
  { name: 'Sophie', emoji: '👧', color: 'bg-purple-500 hover:bg-purple-600', role: 'child' },
];

export default function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function attemptLogin(name: string, pinValue: string) {
    setLoading(true);
    setError('');
    try {
      const user = await loginUser(name, pinValue);
      if (user) {
        onLogin({ userId: user.id, name: user.name, role: user.role });
      } else {
        setError('Wrong PIN');
        setPin('');
      }
    } catch {
      setError('Something went wrong');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function handlePinDigit(digit: string) {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => attemptLogin(selectedUser!, newPin), 200);
      }
    }
  }

  function handleBackspace() {
    setPin(pin.slice(0, -1));
    setError('');
  }

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-emerald-700 mb-2">Kids Bank</h1>
        <p className="text-gray-500 mb-10 text-lg">Who are you?</p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {USERS.map((u) => (
            <button
              key={u.name}
              onClick={() => setSelectedUser(u.name)}
              className={`${u.color} text-white rounded-3xl p-6 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg`}
            >
              <span className="text-5xl">{u.emoji}</span>
              <span className="text-xl font-bold">{u.name}</span>
              <span className="text-xs opacity-80">{u.role}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedUserData = USERS.find((u) => u.name === selectedUser)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <button
        onClick={() => { setSelectedUser(null); setPin(''); setError(''); }}
        className="absolute top-6 left-6 text-gray-500 hover:text-gray-700 text-lg"
      >
        &larr; Back
      </button>

      <div className="text-6xl mb-4">{selectedUserData.emoji}</div>
      <h2 className="text-2xl font-bold text-gray-700 mb-8">Enter PIN for {selectedUser}</h2>

      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full transition-all ${
              i < pin.length ? 'bg-emerald-500 scale-110' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 font-medium mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
          if (key === '') return <div key="empty" />;
          if (key === 'del') {
            return (
              <button
                key="del"
                onClick={handleBackspace}
                disabled={loading}
                className="w-full aspect-square rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-50"
              >
                &larr;
              </button>
            );
          }
          return (
            <button
              key={key}
              onClick={() => handlePinDigit(key)}
              disabled={loading || pin.length >= 4}
              className="w-full aspect-square rounded-2xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-2xl shadow-md flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
