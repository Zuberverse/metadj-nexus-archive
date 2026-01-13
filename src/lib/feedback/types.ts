/**
 * Feedback Types
 *
 * Type definitions for the feedback system.
 */

export type FeedbackType = 'bug' | 'feature' | 'feedback' | 'idea';
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'new' | 'reviewed' | 'in-progress' | 'resolved' | 'closed';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  severity?: FeedbackSeverity;
  status: FeedbackStatus;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  title: string;
  description: string;
  severity?: FeedbackSeverity;
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  severity?: FeedbackSeverity;
}

export interface FeedbackStats {
  total: number;
  byType: Record<FeedbackType, number>;
  byStatus: Record<FeedbackStatus, number>;
}
