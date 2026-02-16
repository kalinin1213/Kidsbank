'use client';

import { useState } from 'react';
import { getUser, verifyPin, updatePin } from '@/lib/db';
import { uploadAvatar, removeAvatar } from '@/lib/avatarUpload';
import Avatar from './Avatar';

type ChildSettingsProps = {
  userName: string;
  avatarUrl?: string;
  onAvatarChange: (newUrl: string) => void;
};

export default function ChildSettings({ userName, avatarUrl, onAvatarChange }: ChildSettingsProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const isMark = userName === 'Mark';
  const colorClass = isMark ? 'bg-blue-500' : 'bg-purple-500';

  async function handlePinChange() {
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      setPinMessage('Please enter valid 4-digit PINs');
      setPinError(true);
      return;
    }

    setPinLoading(true);
    setPinMessage('');
    setPinError(false);

    try {
      const user = await getUser(userName);
      if (!user) {
        setPinMessage('User not found');
        setPinError(true);
        return;
      }

      const valid = await verifyPin(currentPin, user.pin_hash);
      if (!valid) {
        setPinMessage('Current PIN is incorrect');
        setPinError(true);
        return;
      }

      await updatePin(userName, newPin);
      setPinMessage('PIN updated successfully!');
      setPinError(false);
      setCurrentPin('');
      setNewPin('');
    } catch {
      setPinMessage('Something went wrong');
      setPinError(true);
    } finally {
      setPinLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Please select an image file');
      setAvatarError(true);
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarLoading(true);
    setAvatarMessage('');
    setAvatarError(false);

    try {
      const url = await uploadAvatar(userName, file);
      onAvatarChange(url);
      setAvatarMessage('Photo updated!');
      setAvatarError(false);
    } catch {
      setAvatarMessage('Failed to upload photo');
      setAvatarError(true);
      setAvatarPreview(null);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    setAvatarMessage('');
    try {
      await removeAvatar(userName);
      onAvatarChange('');
      setAvatarPreview(null);
      setAvatarMessage('Photo removed');
      setAvatarError(false);
    } catch {
      setAvatarMessage('Failed to remove photo');
      setAvatarError(true);
    } finally {
      setAvatarLoading(false);
    }
  }

  const displayUrl = avatarPreview || avatarUrl;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">My Settings</h2>

      {/* Avatar Section */}
      <div className="card flex flex-col items-center">
        <h3 className="text-lg font-bold text-gray-800 mb-4 self-start">My Photo</h3>
        <Avatar name={userName} avatarUrl={displayUrl} size="xl" colorClass={colorClass} />
        <div className="flex gap-3 mt-4">
          <label className={`btn-primary cursor-pointer text-center ${avatarLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {avatarLoading ? 'Uploading...' : 'Choose Photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={avatarLoading}
            />
          </label>
          {(displayUrl) && (
            <button
              onClick={handleRemoveAvatar}
              disabled={avatarLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        {avatarMessage && (
          <p className={`text-sm mt-2 font-medium ${avatarError ? 'text-red-500' : 'text-emerald-600'}`}>
            {avatarMessage}
          </p>
        )}
      </div>

      {/* PIN Change Section */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Change My PIN</h3>
        <div className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, '')); setPinMessage(''); }}
            placeholder="Current PIN"
            className="input-field w-full"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '')); setPinMessage(''); }}
            placeholder="New 4-digit PIN"
            className="input-field w-full"
          />
          <button
            onClick={handlePinChange}
            disabled={pinLoading || currentPin.length !== 4 || newPin.length !== 4}
            className="btn-primary w-full"
          >
            {pinLoading ? 'Updating...' : 'Update PIN'}
          </button>
          {pinMessage && (
            <p className={`text-sm text-center font-medium ${pinError ? 'text-red-500' : 'text-emerald-600'}`}>
              {pinMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
