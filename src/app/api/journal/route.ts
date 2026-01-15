/**
 * Journal Entries API Route
 *
 * GET /api/journal - List all journal entries for authenticated user
 * POST /api/journal - Create or update a journal entry
 * DELETE /api/journal - Delete a journal entry by id
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '../../../../server/db';
import { journalEntries } from '../../../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.id === 'admin') {
      return NextResponse.json({
        success: true,
        entries: [],
        isVirtualUser: true,
      });
    }

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, session.id))
      .orderBy(desc(journalEntries.updatedAt));

    return NextResponse.json({
      success: true,
      entries,
    });
  } catch (error) {
    logger.error('[Journal] Get error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to get journal entries' },
      { status: 500 }
    );
  }
}

type JournalPayload = {
  id?: string;
  title: string;
  content: string;
};

export const POST = withOriginValidation(async (request: NextRequest) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.id === 'admin') {
      return NextResponse.json({
        success: true,
        message: 'Admin journal entries should be stored locally',
        isVirtualUser: true,
      });
    }

    const bodyResult = await readJsonBodyWithLimit<JournalPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const { id, title, content } = bodyResult.data ?? {};

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, message: 'title is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, message: 'content is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    if (id) {
      const existing = await db
        .select()
        .from(journalEntries)
        .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, session.id)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(journalEntries)
          .set({ title, content, updatedAt: now })
          .where(eq(journalEntries.id, id));

        const updated = await db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, id))
          .limit(1);

        return NextResponse.json({
          success: true,
          entry: updated[0],
        });
      }
    }

    const newId = id || crypto.randomUUID();
    await db.insert(journalEntries).values({
      id: newId,
      userId: session.id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, newId))
      .limit(1);

    return NextResponse.json({
      success: true,
      entry: created[0],
    });
  } catch (error) {
    logger.error('[Journal] Create/Update error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to save journal entry' },
      { status: 500 }
    );
  }
});

type DeletePayload = { id: string };

export const DELETE = withOriginValidation(async (request: NextRequest) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.id === 'admin') {
      return NextResponse.json({ success: true, isVirtualUser: true });
    }

    let entryId: string | null = null;

    const url = new URL(request.url);
    entryId = url.searchParams.get('id');

    if (!entryId) {
      const bodyResult = await readJsonBodyWithLimit<DeletePayload>(
        request,
        getMaxRequestSize(request.nextUrl.pathname)
      );
      if (bodyResult.ok && bodyResult.data?.id) {
        entryId = bodyResult.data.id;
      }
    }

    if (!entryId) {
      return NextResponse.json(
        { success: false, message: 'id is required' },
        { status: 400 }
      );
    }

    await db
      .delete(journalEntries)
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, session.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Journal] Delete error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
});
