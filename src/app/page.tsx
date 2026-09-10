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

const SESSION_KEY = 'kidsbank_session';
const SETUP_KEY = 'kidsbank_setup_complete';

// Only shown on a first-ever launch that cannot reach Firestore.  Setup rewrites
// every PIN and zeroes the balances, so we never route there automatically just
// because the network is slow — the user has to choose it.
const SLOW_START_MS = 8000;

// The PWA is usually resumed rather than reloaded, so a phone left open over
// the weekend would otherwise never check for a due allowance.
const ALLOWANCE_RECHECK_MS = 5 * 60 * 1000;

let lastAllowanceCheck = 0;

function syncAllowances() {
  const now = Date.now();
  if (now - lastAllowanceCheck < ALLOWANCE_RECHECK_MS) return;
  lastAllowanceCheck = now;
  processAllowances().catch(() => {});
}

function readSession(): User | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(true);
  const [slowStart, setSlowStart] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSlowStart(true), SLOW_START_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    function handleVisibility() {
      if (document.visibilityState === 'visible') syncAllowances();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  async function init() {
    const session = readSession();

    // Once setup has been seen through, it never becomes un-done.  Remembering
    // that locally means a returning user goes straight to their dashboard
    // instead of waiting on a Firestore round trip first — and a slow or
    // offline network can no longer drop them into the Setup Wizard, which
    // would overwrite the family's PINs and balances.
    const knownSetUp = localStorage.getItem(SETUP_KEY) === 'true' || session !== null;

    if (knownSetUp) {
      localStorage.setItem(SETUP_KEY, 'true');
      setSetupDone(true);
      if (session) setUser(session);
      setLoading(false);
    } else {
      let done = false;
      try {
        done = await isSetupComplete();
      } catch {
        done = false;
      }
      if (done) localStorage.setItem(SETUP_KEY, 'true');
      setSetupDone(done);
      setLoading(false);
      if (!done) return;
    }

    // Allowances are credited in the background; the dashboard listens for
    // balance changes and picks them up on its own.
    syncAllowances();
  }

  function handleLogin(u: User) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
    syncAllowances();
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function handleSetupComplete() {
    localStorage.setItem(SETUP_KEY, 'true');
    setForceSetup(false);
    setSetupDone(true);
    setLoading(false);
  }

  if (loading && !forceSetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 to-blue-50 px-6 text-center">
        <div className="text-2xl font-bold text-emerald-600 animate-pulse">
          Kids Bank
        </div>
        {slowStart && (
          <>
            <p className="text-sm text-gray-500 max-w-xs">
              Still connecting — the network looks slow.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
            <button
              onClick={() => setForceSetup(true)}
              className="text-xs text-gray-400 underline"
            >
              First time on this device? Set up a new family
            </button>
          </>
        )}
      </div>
    );
  }

  if (!setupDone || forceSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
