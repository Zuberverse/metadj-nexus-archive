/**
 * Delete Archived Conversation API Route
 *
 * DELETE /api/metadjai/conversations/{id}
 * Permanently deletes an archived conversation for the authenticated user
 * Only works on conversations that are already archived
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hardDeleteArchivedConversation } from '../../../../../../server/storage';

export async function DELETE(
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

    const deleted = await hardDeleteArchivedConversation(id, session.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found, not archived, or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Delete Archived Conversation] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
