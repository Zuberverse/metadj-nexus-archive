/**
 * Feedback Storage
 *
 * JSON-based feedback storage for development and single-instance deployments.
 * For production with multiple instances, migrate to a database.
 *
 * See docs/AUTH-SYSTEM.md for database migration guide.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackStats,
} from './types';

// Use a data directory that persists (in Replit, this is the project root)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

/**
 * Ensure the data directory and feedback file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(FEEDBACK_FILE);
    } catch {
      await fs.writeFile(FEEDBACK_FILE, JSON.stringify({ feedback: [] }, null, 2));
    }
  } catch (error) {
    console.error('[Feedback] Failed to initialize data file:', error);
  }
}

/**
 * Read all feedback from storage
 */
async function readFeedback(): Promise<FeedbackItem[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.feedback || [];
  } catch {
    return [];
  }
}

/**
 * Write feedback to storage
 */
async function writeFeedback(feedback: FeedbackItem[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify({ feedback }, null, 2));
}

/**
 * Generate a unique feedback ID
 */
function generateFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create new feedback
 */
export async function createFeedback(
  input: CreateFeedbackInput,
  userId?: string,
  userEmail?: string
): Promise<FeedbackItem> {
  const feedback = await readFeedback();
  const now = new Date().toISOString();

  const newFeedback: FeedbackItem = {
    id: generateFeedbackId(),
    type: input.type,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: 'new',
    userId,
    userEmail,
    createdAt: now,
    updatedAt: now,
  };

  feedback.push(newFeedback);
  await writeFeedback(feedback);

  return newFeedback;
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(id: string): Promise<FeedbackItem | null> {
  const feedback = await readFeedback();
  return feedback.find((f) => f.id === id) || null;
}

/**
 * Get all feedback with optional filters
 */
export async function getAllFeedback(filters?: {
  type?: FeedbackType;
  status?: FeedbackStatus;
  userId?: string;
}): Promise<FeedbackItem[]> {
  let feedback = await readFeedback();

  if (filters?.type) {
    feedback = feedback.filter((f) => f.type === filters.type);
  }
  if (filters?.status) {
    feedback = feedback.filter((f) => f.status === filters.status);
  }
  if (filters?.userId) {
    feedback = feedback.filter((f) => f.userId === filters.userId);
  }

  // Sort by creation date (newest first)
  return feedback.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Update feedback
 */
export async function updateFeedback(
  id: string,
  input: UpdateFeedbackInput
): Promise<FeedbackItem | null> {
  const feedback = await readFeedback();
  const index = feedback.findIndex((f) => f.id === id);

  if (index === -1) return null;

  if (input.status) {
    feedback[index].status = input.status;
  }
  if (input.severity) {
    feedback[index].severity = input.severity;
  }
  feedback[index].updatedAt = new Date().toISOString();

  await writeFeedback(feedback);
  return feedback[index];
}

/**
 * Delete feedback
 */
export async function deleteFeedback(id: string): Promise<boolean> {
  const feedback = await readFeedback();
  const index = feedback.findIndex((f) => f.id === id);

  if (index === -1) return false;

  feedback.splice(index, 1);
  await writeFeedback(feedback);
  return true;
}

/**
 * Get feedback statistics
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  const feedback = await readFeedback();

  const byType: Record<FeedbackType, number> = {
    bug: 0,
    feature: 0,
    feedback: 0,
    idea: 0,
  };

  const byStatus: Record<FeedbackStatus, number> = {
    new: 0,
    reviewed: 0,
    'in-progress': 0,
    resolved: 0,
    closed: 0,
  };

  for (const item of feedback) {
    byType[item.type]++;
    byStatus[item.status]++;
  }

  return {
    total: feedback.length,
    byType,
    byStatus,
  };
}
