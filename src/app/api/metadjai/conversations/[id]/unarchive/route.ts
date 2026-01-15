/**
 * Unarchive Conversation API Route
 *
 * POST /api/metadjai/conversations/{id}/unarchive
 * Unarchives a conversation for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { unarchiveConversation } from '../../../../../../../server/storage';

export const POST = withOriginValidation(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const conversation = await unarchiveConversation(id, session.id);

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    logger.error('[Unarchive Conversation] Error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to unarchive conversation' },
      { status: 500 }
    );
  }
});
