/**
 * Feedback Tool
 *
 * Provides feedback submission capabilities for MetaDJai.
 * Opens the feedback modal when users want to submit feedback through chat.
 *
 * @module lib/ai/tools/feedback
 */

import { z } from 'zod'
import { sanitizeAndValidateToolResult } from '@/lib/ai/tools/utils'

const openFeedbackSchema = z.object({
  feedbackType: z
    .enum(['bug', 'feature', 'idea', 'feedback'])
    .optional()
    .describe('Optional: Pre-select the type of feedback to submit'),
})

/**
 * Custom event name for opening feedback modal
 */
export const OPEN_FEEDBACK_EVENT = 'metadj:openFeedback'

/**
 * Detail type for the open feedback event
 */
export interface OpenFeedbackEventDetail {
  feedbackType?: 'bug' | 'feature' | 'idea' | 'feedback'
}

/**
 * Open Feedback Tool
 *
 * Opens the feedback modal so users can submit their feedback.
 * Can optionally pre-select the feedback type.
 */
export const openFeedback = {
  description:
    'Open the feedback form so the user can submit feedback, report a bug, request a feature, or share an idea. Use when the user wants to provide feedback about the platform.',
  inputSchema: openFeedbackSchema,
  execute: async ({ feedbackType }: { feedbackType?: 'bug' | 'feature' | 'idea' | 'feedback' }) => {
    // Emit custom event to open feedback modal
    // The event will be caught by the client-side listener
    if (typeof window !== 'undefined') {
      const detail: OpenFeedbackEventDetail = { feedbackType }
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT, { detail }))
    }

    const typeDescriptions = {
      bug: 'bug report',
      feature: 'feature request',
      idea: 'idea submission',
      feedback: 'general feedback',
    }

    const result = {
      success: true,
      feedbackType,
      message: feedbackType
        ? `Opening the feedback form with ${typeDescriptions[feedbackType]} selected. Please fill in the details.`
        : 'Opening the feedback form. You can choose the type of feedback and fill in the details.',
      hint: 'The feedback form will appear where you can describe your feedback, bug, feature request, or idea.',
    }

    return sanitizeAndValidateToolResult(result, 'openFeedback')
  },
}
