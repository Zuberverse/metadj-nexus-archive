/**
 * Unarchive Conversation API Route
 *
 * POST /api/metadjai/conversations/{id}/unarchive
 * Unarchives a conversation for the authenticated user
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { unarchiveConversation } from '../../../../../../../server/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error('[Unarchive Conversation] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to unarchive conversation' },
      { status: 500 }
    );
  }
}
