/**
 * Individual Feedback API Route
 *
 * GET /api/feedback/[id] - Get single feedback item
 * PATCH /api/feedback/[id] - Update feedback (admin only)
 * DELETE /api/feedback/[id] - Delete feedback (admin only)
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFeedbackById, updateFeedback, deleteFeedback } from '@/lib/feedback';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const feedback = await getFeedbackById(id);

    if (!feedback) {
      return NextResponse.json(
        { success: false, message: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Users can only see their own feedback
    if (!session.isAdmin && feedback.userId !== session.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('[Feedback] Get error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session?.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, severity } = body;

    // Validate status if provided
    if (status && !['new', 'reviewed', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
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

    const feedback = await updateFeedback(id, { status, severity });

    if (!feedback) {
      return NextResponse.json(
        { success: false, message: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('[Feedback] Update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session?.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const success = await deleteFeedback(id);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
