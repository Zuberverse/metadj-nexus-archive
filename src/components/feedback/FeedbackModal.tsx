'use client';

/**
 * Feedback Modal Component
 *
 * Modal for submitting feedback, bug reports, feature requests, and ideas.
 */

import { useState } from 'react';
import { X, Bug, Lightbulb, MessageSquare, Sparkles, SendHorizonal } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import type { FeedbackType, FeedbackSeverity } from '@/lib/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FeedbackSeverity | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useBodyScrollLock(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          severity: type === 'bug' ? severity : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Thank you for your feedback!' });
        // Reset form
        setTitle('');
        setDescription('');
        setSeverity(undefined);
        // Close after a short delay
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to submit feedback' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-2 sm:px-4 py-20 sm:py-24">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          className="relative w-full max-w-lg bg-(--bg-surface-base)/95 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Blobs - Matching Panel Style */}
          <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
          <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
          
          {/* Header */}
          <div className="relative shrink-0 bg-(--bg-surface-base)/80 border-b border-white/10 p-3 sm:p-4 flex items-center justify-between">
            <h2 id="feedback-modal-title" className="text-lg sm:text-xl font-semibold text-white">Share Your Feedback</h2>
            <button
              onClick={onClose}
              aria-label="Close feedback modal"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/70" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Type Selection */}
            <fieldset>
              <legend className="block text-sm font-medium text-white/70 mb-2 sm:mb-3">
                What type of feedback?
              </legend>
              <div role="radiogroup" aria-label="Feedback type" className="grid grid-cols-2 gap-2 sm:gap-3">
                {feedbackTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={type === option.value}
                    onClick={() => setType(option.value)}
                    className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all ${
                      type === option.value
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                    }`}
                  >
                    <option.icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 ${
                      type === option.value ? 'text-purple-400' : 'text-white/50'
                    }`} aria-hidden="true" />
                    <div className="font-medium text-xs sm:text-sm">{option.label}</div>
                    <div className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1 line-clamp-2">{option.description}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Severity (for bugs only) */}
            {type === 'bug' && (
              <fieldset>
                <legend className="block text-sm font-medium text-white/70 mb-3">
                  Severity
                </legend>
                <div role="radiogroup" aria-label="Bug severity" className="flex gap-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      role="radio"
                      aria-checked={severity === level.value}
                      onClick={() => setSeverity(level.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        severity === level.value
                          ? `${level.color}/20 border-current text-white`
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${level.color} mr-2`} aria-hidden="true" />
                      {level.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Title */}
            <div>
              <label htmlFor="feedback-title" className="block text-sm font-medium text-white/70 mb-2">
                Title
              </label>
              <input
                id="feedback-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={(e) => {
                  const len = e.target.value.length;
                  e.target.setSelectionRange(len, len);
                }}
                placeholder="Brief summary of your feedback"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="feedback-description" className="block text-sm font-medium text-white/70 mb-2">
                Description
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={(e) => {
                  const len = e.target.value.length;
                  e.target.setSelectionRange(len, len);
                }}
                placeholder={type === 'bug'
                  ? 'Please describe the issue, steps to reproduce, and expected behavior...'
                  : 'Tell us more about your feedback...'
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all resize-none"
                rows={5}
                required
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-white/40 text-right">
                {description.length}/2000
              </p>
            </div>

            {/* Message */}
            {message && (
              <div
                role="alert"
                aria-live="polite"
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                    : 'bg-red-500/20 border border-red-500/50 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 font-heading font-semibold text-sm sm:text-base ${
                title.trim() && description.trim()
                  ? 'brand-gradient text-white hover:brightness-110'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <SendHorizonal className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
