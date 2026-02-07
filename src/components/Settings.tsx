'use client';

import { useState, useEffect } from 'react';
import { getSettings, updatePin, updateAllowance, updateAllowanceDay } from '@/lib/db';

type ChildData = {
  id: string;
  name: string;
  allowance: number;
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const USERS = ['Art', 'Anna', 'Mark', 'Sophie'];

export default function Settings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // PIN change state
  const [selectedPinUser, setSelectedPinUser] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const data = await getSettings();
      setSettings(data.settings as Record<string, string>);
      setChildren(data.children);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handlePinChange() {
    if (!selectedPinUser || !/^\d{4}$/.test(newPin)) {
      setMessage('Please select a user and enter a valid 4-digit PIN');
      return;
    }

    setPinLoading(true);
    try {
      await updatePin(selectedPinUser, newPin);
      setMessage(`PIN updated for ${selectedPinUser}`);
      setNewPin('');
      setSelectedPinUser('');
    } catch {
      setMessage('Something went wrong');
    } finally {
      setPinLoading(false);
    }
  }

  async function handleAllowanceChange(childId: string, amount: string) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      await updateAllowance(childId, parsed);
      setChildren(children.map((c) => (c.id === childId ? { ...c, allowance: parsed } : c)));
      setMessage('Allowance updated');
    } catch {
      setMessage('Failed to update allowance');
    }
  }

  async function handleDayChange(day: string) {
    try {
      await updateAllowanceDay(day);
      setSettings({ ...settings, allowance_day: day });
      setMessage('Allowance day updated');
    } catch {
      setMessage('Failed to update');
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-center text-sm font-medium">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-emerald-500">✕</button>
        </div>
      )}

      {/* PIN Management */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔐 Change PINs</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">User</label>
            <div className="grid grid-cols-4 gap-2">
              {USERS.map((u) => (
                <button
                  key={u}
                  onClick={() => setSelectedPinUser(u)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    selectedPinUser === u
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {selectedPinUser && (
            <div className="flex gap-3">
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4-digit PIN"
                className="input-field flex-1"
              />
              <button
                onClick={handlePinChange}
                disabled={pinLoading || newPin.length !== 4}
                className="btn-primary"
              >
                {pinLoading ? '...' : 'Update'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allowance Settings */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Weekly Allowance</h3>

        <div className="space-y-4">
          {children.map((child) => (
            <div key={child.id} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                child.name === 'Mark' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {child.name[0]}
              </div>
              <span className="font-medium text-gray-700 w-16">{child.name}</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={child.allowance}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChildren(children.map((c) => (c.id === child.id ? { ...c, allowance: parseFloat(val) || 0 } : c)));
                  }}
                  onBlur={(e) => handleAllowanceChange(child.id, e.target.value)}
                  className="input-field w-28"
                />
                <span className="text-gray-500 text-sm">CHF/week</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allowance Day */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Allowance Day</h3>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => handleDayChange(day)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                settings.allowance_day === day
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
