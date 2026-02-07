'use client';

import { useState, useEffect } from 'react';
import LoginScreen from '@/components/LoginScreen';
import SetupWizard from '@/components/SetupWizard';
import Dashboard from '@/components/Dashboard';

type User = {
  userId: number;
  name: string;
  role: 'parent' | 'child';
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(true);

  useEffect(() => {
    checkSetupAndSession();
  }, []);

  async function checkSetupAndSession() {
    try {
      const setupRes = await fetch('/api/auth/setup');
      const setupData = await setupRes.json();
      setSetupComplete(setupData.setupComplete);

      if (setupData.setupComplete) {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (sessionData.user) {
          setUser(sessionData.user);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-2xl font-bold text-emerald-600 animate-pulse">
          Kids Bank
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupWizard onComplete={() => { setSetupComplete(true); }} />;
  }

  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
