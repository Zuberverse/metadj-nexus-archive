/**
 * Feedback API Route
 *
 * GET /api/feedback - List all feedback (admin) or user's feedback
 * POST /api/feedback - Submit new feedback
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createFeedback, getAllFeedback, type CreateFeedbackInput } from '@/lib/feedback';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CreateFeedbackInput['type'] | null;
    const status = searchParams.get('status') as 'new' | 'reviewed' | 'in-progress' | 'resolved' | 'closed' | null;

    // Admin can see all feedback, users see only their own
    const filters = session.isAdmin
      ? { type: type || undefined, status: status || undefined }
      : { userId: session.id, type: type || undefined, status: status || undefined };

    const feedback = await getAllFeedback(filters);

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('[Feedback] List error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const { type, title, description, severity } = body;

    if (!type || !title || !description) {
      return NextResponse.json(
        { success: false, message: 'Type, title, and description are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['bug', 'feature', 'feedback', 'idea'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate severity if provided
    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return NextResponse.json(
        { success: false, message: 'Invalid severity' },
        { status: 400 }
      );
    }

    const feedback = await createFeedback(
      { type, title, description, severity },
      session?.id,
      session?.email
    );

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('[Feedback] Create error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
