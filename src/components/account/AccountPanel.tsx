'use client';

/**
 * Account Panel Component
 *
 * Slide-out panel for account settings (email, password update) and feedback submission.
 * Styled to match Music and MetaDJai panels.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Mail, Lock, LogOut, Shield, MessageSquare, Bug, Lightbulb, Sparkles, SendHorizonal, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import type { FeedbackType, FeedbackSeverity } from '@/lib/feedback';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PanelView = 'main' | 'email' | 'password' | 'feedback';

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: 'feedback', label: 'General Feedback', icon: MessageSquare, description: 'Share comments or thoughts' },
  { value: 'feature', label: 'Feature Request', icon: Sparkles, description: 'Request a specific capability' },
  { value: 'idea', label: 'Creative Idea', icon: Lightbulb, description: 'Inspire with a vision or concept' },
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report an issue or error' },
];

const severityLevels: { value: FeedbackSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const router = useRouter();
  const { user, logout, updateEmail, updatePassword, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<PanelView>('main');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState<FeedbackSeverity | undefined>(undefined);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Prevent background scrolling when panel is open (uses shared reference-counting system)
  useBodyScrollLock(isOpen);

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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmittingFeedback(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          title: feedbackTitle,
          description: feedbackDescription,
          severity: feedbackType === 'bug' ? feedbackSeverity : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Thank you for your feedback!' });
        setFeedbackTitle('');
        setFeedbackDescription('');
        setFeedbackSeverity(undefined);
        setTimeout(() => {
          setCurrentView('main');
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to submit feedback' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleBack = () => {
    setCurrentView('main');
    setMessage(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - click to close panel */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close account panel"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-(--bg-surface-base)/95 backdrop-blur-3xl border-l border-white/15 z-[120] overflow-hidden flex flex-col">
        {/* Background Blobs - Matching Panel Style */}
        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />

        {/* Header - with safe area padding for mobile */}
        <div className="relative shrink-0 bg-(--bg-surface-base)/80 border-b border-white/15 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between gap-3">
          {currentView !== 'main' ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors font-heading font-medium text-sm min-w-0"
            >
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span>Back</span>
            </button>
          ) : (
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 min-w-0">
              <User className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="truncate">Account</span>
            </h2>
          )}
          <button
            onClick={onClose}
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 hover:text-white hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            aria-label="Close account panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-y-auto pb-20">
          {currentView === 'main' && (
            <>
              {/* User Info */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-heading font-semibold">{user?.username || user?.email}</p>
                    <p className="text-sm text-white/50">
                      {isAdmin ? 'Administrator' : 'Member'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-heading font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Actions
                </h3>
                <button
                  onClick={() => setCurrentView('feedback')}
                  className="w-full py-3 px-4 bg-white/5 border border-white/15 rounded-xl text-white/90 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all flex items-center gap-3 font-heading font-semibold text-sm"
                >
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  Submit Feedback
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      router.push('/admin');
                      onClose();
                    }}
                    className="w-full py-3 px-4 bg-purple-500/15 border border-purple-500/40 rounded-xl text-purple-300 hover:bg-purple-500/25 hover:border-purple-500/60 transition-all flex items-center gap-3 font-heading font-semibold text-sm"
                  >
                    <Shield className="w-5 h-5" />
                    Open Admin Dashboard
                  </button>
                )}
              </div>

              {/* Account Settings */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-heading font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Account Settings
                </h3>
                <button
                  onClick={() => setCurrentView('email')}
                  className="w-full py-3 px-4 bg-white/5 border border-white/15 rounded-xl text-white/90 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all flex items-center gap-3 font-heading font-semibold text-sm"
                >
                  <Mail className="w-5 h-5 text-blue-400" />
                  Update Email
                </button>
                <button
                  onClick={() => setCurrentView('password')}
                  className="w-full py-3 px-4 bg-white/5 border border-white/15 rounded-xl text-white/90 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all flex items-center gap-3 font-heading font-semibold text-sm"
                >
                  <Lock className="w-5 h-5 text-amber-400" />
                  Change Password
                </button>
              </div>
            </>
          )}

          {currentView === 'email' && (
            <div className="p-4">
              <h3 className="text-lg font-heading font-bold text-white mb-4">Update Email</h3>
              {message && (
                <div
                  className={`mb-4 p-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border border-red-500/50 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-2">
                    Current Email
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-2">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder="Enter new email"
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
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
                  className="w-full py-3 brand-gradient text-white font-heading font-semibold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </div>
          )}

          {currentView === 'password' && (
            <div className="p-4">
              <h3 className="text-lg font-heading font-bold text-white mb-4">Change Password</h3>
              {message && (
                <div
                  className={`mb-4 p-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border border-red-500/50 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                    required
                    disabled={user?.email === 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                    required
                    minLength={8}
                    disabled={user?.email === 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
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
                  className="w-full py-3 brand-gradient text-white font-heading font-semibold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {currentView === 'feedback' && (
            <div className="p-4">
              <h3 className="text-lg font-heading font-bold text-white mb-4">Share Your Feedback</h3>
              {message && (
                <div
                  className={`mb-4 p-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border border-red-500/50 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-heading font-medium text-white/70 mb-3">
                    What type of feedback?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {feedbackTypes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFeedbackType(option.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          feedbackType === option.value
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/15 text-white/70 hover:border-white/30'
                        }`}
                      >
                        <option.icon className={`w-4 h-4 mb-1.5 ${
                          feedbackType === option.value ? 'text-purple-400' : 'text-white/50'
                        }`} />
                        <div className="font-heading font-medium text-xs">{option.label}</div>
                        <div className="text-[10px] text-white/50 mt-0.5 line-clamp-2">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity (for bugs only) */}
                {feedbackType === 'bug' && (
                  <div>
                    <label className="block text-sm font-heading font-medium text-white/70 mb-3">
                      Severity
                    </label>
                    <div className="flex gap-2">
                      {severityLevels.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setFeedbackSeverity(level.value)}
                          className={`flex-1 py-2 px-2 rounded-lg border text-xs font-heading font-medium transition-all ${
                            feedbackSeverity === level.value
                              ? `${level.color}/20 border-current text-white`
                              : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${level.color} mr-1.5`} />
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label htmlFor="feedback-title" className="block text-sm font-heading font-medium text-white/70 mb-2">
                    Title
                  </label>
                  <input
                    id="feedback-title"
                    type="text"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder="Brief summary of your feedback"
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                    required
                    maxLength={200}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="feedback-description" className="block text-sm font-heading font-medium text-white/70 mb-2">
                    Description
                  </label>
                  <textarea
                    id="feedback-description"
                    value={feedbackDescription}
                    onChange={(e) => setFeedbackDescription(e.target.value)}
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
                    placeholder={feedbackType === 'bug'
                      ? 'Please describe the issue, steps to reproduce, and expected behavior...'
                      : 'Tell us more about your feedback...'
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all resize-none"
                    rows={5}
                    required
                    maxLength={2000}
                  />
                  <p className="mt-1 text-xs text-white/40 text-right">
                    {feedbackDescription.length}/2000
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackTitle.trim() || !feedbackDescription.trim()}
                  className={`w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-heading font-semibold ${
                    feedbackTitle.trim() && feedbackDescription.trim()
                      ? 'brand-gradient text-white hover:brightness-110'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmittingFeedback ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="w-4 h-4" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/15 bg-(--bg-surface-base)/95 backdrop-blur-xl">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 hover:border-red-500/60 rounded-xl transition-all flex items-center justify-center gap-2 font-heading font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
