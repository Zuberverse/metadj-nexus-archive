'use client';

/**
 * Feedback Modal Component
 *
 * Modal for submitting feedback, bug reports, feature requests, and ideas.
 */

import { useState } from 'react';
import { X, Bug, Lightbulb, MessageSquare, Sparkles, Send } from 'lucide-react';
import type { FeedbackType, FeedbackSeverity } from '@/lib/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report an issue or error' },
  { value: 'feature', label: 'Feature Request', icon: Sparkles, description: 'Suggest a new feature' },
  { value: 'idea', label: 'Idea', icon: Lightbulb, description: 'Share an idea or suggestion' },
  { value: 'feedback', label: 'General Feedback', icon: MessageSquare, description: 'General comments or thoughts' },
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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="w-full max-w-lg bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Share Your Feedback</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">
                What type of feedback?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {feedbackTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === option.value
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 mb-2 ${
                      type === option.value ? 'text-purple-400' : 'text-white/50'
                    }`} />
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-white/50 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity (for bugs only) */}
            {type === 'bug' && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Severity
                </label>
                <div className="flex gap-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSeverity(level.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        severity === level.value
                          ? `${level.color}/20 border-current text-white`
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${level.color} mr-2`} />
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
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
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
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
