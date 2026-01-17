/**
 * Recently Played API Route
 *
 * GET /api/auth/recently-played - Get user's recently played tracks
 * POST /api/auth/recently-played - Add a track to recently played
 * DELETE /api/auth/recently-played - Clear recently played history
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import { db } from '../../../../../server/db';
import { recentlyPlayed } from '../../../../../shared/schema';

const MAX_RECENTLY_PLAYED = 50;

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const entries = await db
      .select({
        trackId: recentlyPlayed.trackId,
        playedAt: recentlyPlayed.playedAt,
      })
      .from(recentlyPlayed)
      .where(eq(recentlyPlayed.userId, session.id))
      .orderBy(desc(recentlyPlayed.playedAt))
      .limit(MAX_RECENTLY_PLAYED);

    return NextResponse.json({
      success: true,
      entries: entries.map((e: { trackId: string; playedAt: Date }) => ({
        trackId: e.trackId,
        playedAt: e.playedAt.getTime(),
      })),
    });
  } catch (error) {
    logger.error('[RecentlyPlayed] Get error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to get recently played' },
      { status: 500 }
    );
  }
}

type AddPayload = { trackId: string };

export const POST = withOriginValidation(async (request: NextRequest) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const bodyResult = await readJsonBodyWithLimit<AddPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const { trackId } = bodyResult.data ?? {};

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'trackId is required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await db
      .insert(recentlyPlayed)
      .values({
        id,
        userId: session.id,
        trackId,
        playedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [recentlyPlayed.userId, recentlyPlayed.trackId],
        set: { playedAt: new Date() },
      });

    const oldEntries = await db
      .select({ id: recentlyPlayed.id })
      .from(recentlyPlayed)
      .where(eq(recentlyPlayed.userId, session.id))
      .orderBy(desc(recentlyPlayed.playedAt))
      .offset(MAX_RECENTLY_PLAYED);

    if (oldEntries.length > 0) {
      const idsToDelete = oldEntries.map((e: { id: string }) => e.id);
      for (const oldId of idsToDelete) {
        await db.delete(recentlyPlayed).where(eq(recentlyPlayed.id, oldId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[RecentlyPlayed] Add error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to add to recently played' },
      { status: 500 }
    );
  }
});

export const DELETE = withOriginValidation(async () => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await db.delete(recentlyPlayed).where(eq(recentlyPlayed.userId, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[RecentlyPlayed] Clear error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to clear recently played' },
      { status: 500 }
    );
  }
});
