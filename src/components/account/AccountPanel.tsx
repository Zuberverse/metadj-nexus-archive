'use client';

/**
 * Account Panel Component
 *
 * Slide-out panel for account settings (email, password update).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Mail, Lock, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const router = useRouter();
  const { user, logout, updateEmail, updatePassword, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await updateEmail(newEmail);
      if (result.success) {
        setMessage({ type: 'success', text: 'Email updated successfully' });
        setNewEmail('');
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Account Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">{user?.email}</p>
              <p className="text-sm text-white/50">
                {isAdmin ? 'Administrator' : 'Member'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="mt-4 w-full py-2 px-4 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Open Admin Dashboard
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Password
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-red-500/20 border border-red-500/50 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Current Email
                </label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                  required
                  disabled={user?.email === 'admin'}
                />
                {user?.email === 'admin' && (
                  <p className="mt-2 text-xs text-white/50">
                    Admin email cannot be changed
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || user?.email === 'admin'}
                className="w-full py-3 brand-gradient text-white font-medium rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                  required
                  disabled={user?.email === 'admin'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                  required
                  minLength={8}
                  disabled={user?.email === 'admin'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                  required
                  minLength={8}
                  disabled={user?.email === 'admin'}
                />
              </div>
              {user?.email === 'admin' && (
                <p className="text-xs text-white/50">
                  Admin password can only be changed via environment variable
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading || user?.email === 'admin'}
                className="w-full py-3 brand-gradient text-white font-medium rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0a0a0a]/95">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
