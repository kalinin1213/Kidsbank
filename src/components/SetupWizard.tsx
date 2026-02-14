'use client';

import { useState } from 'react';
import { completeSetup } from '@/lib/db';

const USERS = [
  { name: 'Art', emoji: '👨', label: 'Art (Parent)' },
  { name: 'Anna', emoji: '👩', label: 'Anna (Parent)' },
  { name: 'Mark', emoji: '👦', label: 'Mark (Child)' },
  { name: 'Sophie', emoji: '👧', label: 'Sophie (Child)' },
];

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [currentPin, setCurrentPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = USERS[step];

  function handlePinDigit(digit: string) {
    if (isConfirming) {
      if (confirmPin.length < 4) {
        const newPin = confirmPin + digit;
        setConfirmPin(newPin);
        if (newPin.length === 4) {
          if (newPin === currentPin) {
            const newPins = { ...pins, [currentUser.name]: newPin };
            setPins(newPins);
            setError('');

            if (step < USERS.length - 1) {
              setTimeout(() => {
                setStep(step + 1);
                setCurrentPin('');
                setConfirmPin('');
                setIsConfirming(false);
              }, 300);
            } else {
              // All PINs set - submit
              setTimeout(() => submitSetup(newPins), 300);
            }
          } else {
            setError('PINs do not match. Try again.');
            setTimeout(() => {
              setCurrentPin('');
              setConfirmPin('');
              setIsConfirming(false);
            }, 800);
          }
        }
      }
    } else {
      if (currentPin.length < 4) {
        const newPin = currentPin + digit;
        setCurrentPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => {
            setIsConfirming(true);
            setError('');
          }, 300);
        }
      }
    }
  }

  function handleBackspace() {
    setError('');
    if (isConfirming) {
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setCurrentPin(currentPin.slice(0, -1));
    }
  }

  async function submitSetup(allPins: Record<string, string>) {
    setSubmitting(true);
    setError('');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );
      await Promise.race([completeSetup(allPins), timeout]);
      onComplete();
    } catch (err) {
      let msg: string;
      if (err instanceof Error && err.message === 'timeout') {
        msg = 'Setup is taking too long. Please try again.';
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        msg = `Setup failed: ${detail}`;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const activePin = isConfirming ? confirmPin : currentPin;
  const canRetry = !submitting && error !== '' && Object.keys(pins).length === USERS.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-emerald-700 mb-2">Kids Bank Setup</h1>
      <p className="text-gray-500 mb-8">Set a 4-digit PIN for each family member</p>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {USERS.map((u, i) => (
          <div
            key={u.name}
            className={`w-3 h-3 rounded-full transition-all ${
              i < step ? 'bg-emerald-500' : i === step ? 'bg-emerald-400 scale-125' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div className="text-5xl mb-3">{currentUser.emoji}</div>
      <h2 className="text-xl font-bold text-gray-700 mb-1">{currentUser.label}</h2>
      <p className="text-gray-500 mb-6">
        {submitting ? 'Saving...' : canRetry ? 'Could not save' : isConfirming ? 'Confirm PIN' : 'Choose a 4-digit PIN'}
      </p>

      {/* PIN dots or spinner */}
      <div className="flex gap-4 mb-6">
        {submitting ? (
          <div className="w-6 h-6 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        ) : canRetry ? null : (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full transition-all ${
                i < activePin.length ? 'bg-emerald-500 scale-110' : 'bg-gray-300'
              }`}
            />
          ))
        )}
      </div>

      {error && <p className="text-red-500 font-medium mb-4 text-center px-4">{error}</p>}

      {canRetry ? (
        <button
          onClick={() => submitSetup(pins)}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-colors active:scale-95"
        >
          Try Again
        </button>
      ) : (
        /* Number pad */
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
            if (key === '') return <div key="empty" />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  onClick={handleBackspace}
                  disabled={submitting}
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
                disabled={submitting || activePin.length >= 4}
                className="w-full aspect-square rounded-2xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-2xl shadow-md flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
              >
                {key}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
