'use client';

import { useState, useEffect } from 'react';
import LoginScreen from '@/components/LoginScreen';
import SetupWizard from '@/components/SetupWizard';
import Dashboard from '@/components/Dashboard';
import { isSetupComplete, processAllowances } from '@/lib/db';

type User = {
  userId: string;
  name: string;
  role: 'parent' | 'child';
  avatarUrl?: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(true);

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    try {
      const timeout = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 5000)
      );
      const done = await Promise.race([isSetupComplete(), timeout]);
      setSetupDone(done);

      if (done) {
        const saved = localStorage.getItem('kidsbank_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
          processAllowances().catch(() => {});
        }
      }
    } catch {
      setSetupDone(false);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(u: User) {
    localStorage.setItem('kidsbank_session', JSON.stringify(u));
    setUser(u);
    processAllowances().catch(() => {});
  }

  function handleLogout() {
    localStorage.removeItem('kidsbank_session');
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

  if (!setupDone) {
    return <SetupWizard onComplete={() => setSetupDone(true)} />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
