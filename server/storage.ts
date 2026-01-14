/**
 * Storage Layer
 *
 * Database operations for users, sessions, preferences, and login attempts.
 * Uses Drizzle ORM with PostgreSQL.
 */

import { eq, and, gte, sql, count, desc, isNull, like, or } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  sessions,
  userPreferences,
  loginAttempts,
  conversations,
  messages,
  analyticsEvents,
  emailVerificationTokens,
  type User,
  type NewUser,
  type Session,
  type NewSession,
  type UserPreference,
  type NewUserPreference,
  type LoginAttempt,
  type Conversation,
  type NewConversation,
  type Message,
  type NewMessage,
  type AnalyticsEvent,
  type EmailVerificationToken,
} from '../shared/schema';

/**
 * Generate a unique ID with a prefix
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================================================
// User Operations
// ============================================================================

/**
 * Create a new user
 */
export async function createUser(data: NewUser): Promise<User> {
  const id = data.id || generateId('user');
  const now = new Date();
  
  const [user] = await db
    .insert(users)
    .values({
      ...data,
      id,
      email: data.email.toLowerCase().trim(),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return user;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  
  return user || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return user || null;
}

/**
 * Update a user with partial data
 */
export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return updated || null;
}

/**
 * Update user email
 */
export async function updateUserEmail(id: string, email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const [updated] = await db
    .update(users)
    .set({
      email: normalizedEmail,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return updated || null;
}

/**
 * Update user password hash
 */
export async function updateUserPassword(id: string, passwordHash: string): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return updated || null;
}

/**
 * Find a user by username (case-insensitive)
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const normalizedUsername = username.toLowerCase().trim();
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);
  
  return user || null;
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase().trim();
  
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      excludeUserId
        ? and(eq(users.username, normalizedUsername), sql`${users.id} != ${excludeUserId}`)
        : eq(users.username, normalizedUsername)
    )
    .limit(1);
  
  return !existing;
}

/**
 * Check if an email is available
 */
export async function isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      excludeUserId
        ? and(eq(users.email, normalizedEmail), sql`${users.id} != ${excludeUserId}`)
        : eq(users.email, normalizedEmail)
    )
    .limit(1);
  
  return !existing;
}

/**
 * Update user username
 */
export async function updateUserUsername(id: string, username: string): Promise<User | null> {
  const normalizedUsername = username.toLowerCase().trim();
  
  const [updated] = await db
    .update(users)
    .set({
      username: normalizedUsername,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return updated || null;
}

/**
 * Update user email verification status
 */
export async function updateUserEmailVerified(id: string, verified: boolean): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({
      emailVerified: verified,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return updated || null;
}

// ============================================================================
// Email Verification Token Operations
// ============================================================================

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(
  userId: string,
  email: string,
  tokenHash: string,
  expiresAt: Date
): Promise<EmailVerificationToken> {
  const id = generateId('evt');
  
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
  
  const [token] = await db
    .insert(emailVerificationTokens)
    .values({
      id,
      userId,
      email: email.toLowerCase().trim(),
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    })
    .returning();
  
  return token;
}

/**
 * Find a valid email verification token by user ID
 */
export async function findEmailVerificationToken(userId: string): Promise<EmailVerificationToken | null> {
  const [token] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, userId),
        isNull(emailVerificationTokens.usedAt),
        gte(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  
  return token || null;
}

/**
 * Mark an email verification token as used
 */
export async function consumeEmailVerificationToken(tokenId: string): Promise<EmailVerificationToken | null> {
  const [updated] = await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenId))
    .returning();
  
  return updated || null;
}

/**
 * Delete all verification tokens for a user
 */
export async function deleteVerificationTokensForUser(userId: string): Promise<void> {
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
}

/**
 * Get all users (excludes soft-deleted)
 */
export async function getAllUsers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(sql`${users.deletedAt} IS NULL`);
}

/**
 * Get paginated users with optional search (SQL-level filtering)
 */
export async function getPaginatedUsers(options: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: User[]; total: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const search = options.search?.toLowerCase().trim();

  const baseCondition = sql`${users.deletedAt} IS NULL`;
  const searchCondition = search
    ? and(baseCondition, sql`LOWER(${users.email}) LIKE ${`%${search}%`}`)
    : baseCondition;

  const [countResult] = await db
    .select({ count: count() })
    .from(users)
    .where(searchCondition);

  const total = countResult?.count || 0;

  const paginatedUsers = await db
    .select()
    .from(users)
    .where(searchCondition)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return { users: paginatedUsers, total };
}

/**
 * Get total user count (excludes soft-deleted)
 */
export async function getUserCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.deletedAt} IS NULL`);
  
  return result?.count || 0;
}

/**
 * Soft delete a user by setting deletedAt timestamp
 */
export async function softDeleteUser(id: string): Promise<boolean> {
  const [updated] = await db
    .update(users)
    .set({
      deletedAt: new Date(),
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  
  return !!updated;
}

// ============================================================================
// User Preferences Operations
// ============================================================================

/**
 * Get user preferences by user ID
 */
export async function getUserPreferences(userId: string): Promise<UserPreference | null> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  
  return prefs || null;
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  prefs: Partial<UserPreference>
): Promise<UserPreference> {
  const existing = await getUserPreferences(userId);
  const now = new Date();
  
  if (existing) {
    const [updated] = await db
      .update(userPreferences)
      .set({
        ...prefs,
        updatedAt: now,
      })
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    return updated;
  }
  
  const [created] = await db
    .insert(userPreferences)
    .values({
      id: generateId('pref'),
      userId,
      ...prefs,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return created;
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Create a new database session
 */
export async function createDbSession(data: NewSession): Promise<Session> {
  const id = data.id || generateId('sess');
  
  const [session] = await db
    .insert(sessions)
    .values({
      ...data,
      id,
      createdAt: new Date(),
    })
    .returning();
  
  return session;
}

/**
 * Find a session by ID
 */
export async function findSessionById(id: string): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);
  
  return session || null;
}

/**
 * Delete a session by ID
 */
export async function deleteSession(id: string): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(eq(sessions.id, id))
    .returning();
  
  return result.length > 0;
}

/**
 * Delete all expired sessions and return count of deleted
 */
export async function deleteExpiredSessions(): Promise<number> {
  const now = new Date();
  
  const deleted = await db
    .delete(sessions)
    .where(sql`${sessions.expiresAt} < ${now}`)
    .returning();
  
  return deleted.length;
}

// ============================================================================
// Login Attempts Operations
// ============================================================================

/**
 * Record a login attempt for rate limiting and security
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string | null,
  success: boolean
): Promise<void> {
  await db.insert(loginAttempts).values({
    id: generateId('attempt'),
    email: email.toLowerCase().trim(),
    ipAddress,
    success,
    createdAt: new Date(),
  });
}

/**
 * Get recent login attempts for an email within specified minutes
 */
export async function getRecentLoginAttempts(
  email: string,
  minutes: number
): Promise<LoginAttempt[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  return db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, normalizedEmail),
        gte(loginAttempts.createdAt, since)
      )
    )
    .orderBy(loginAttempts.createdAt);
}

// ============================================================================
// Conversation Operations (MetaDJai Chat History)
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(userId: string, title?: string): Promise<Conversation> {
  const now = new Date();
  
  const [conversation] = await db
    .insert(conversations)
    .values({
      id: generateId('conv'),
      userId,
      title: title || 'New conversation',
      totalTokens: 0,
      messageCount: 0,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return conversation;
}

/**
 * Get all conversations for a user (not deleted, sorted by most recent)
 */
export async function getUserConversations(
  userId: string,
  limit: number = 50
): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        isNull(conversations.deletedAt)
      )
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  
  return conversation || null;
}

/**
 * Update conversation (title, summary, archived status, etc.)
 */
export async function updateConversation(
  id: string,
  data: Partial<Pick<Conversation, 'title' | 'summary' | 'isArchived' | 'totalTokens' | 'messageCount'>>
): Promise<Conversation | null> {
  const [updated] = await db
    .update(conversations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();
  
  return updated || null;
}

/**
 * Soft delete a conversation
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const [updated] = await db
    .update(conversations)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();
  
  return Boolean(updated);
}

/**
 * Hard delete a conversation and all its messages
 */
export async function hardDeleteConversation(id: string): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  
  return result.length > 0;
}

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Add a message to a conversation
 */
export async function addMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  const [message] = await db
    .insert(messages)
    .values({
      id: generateId('msg'),
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      tokensUsed: data.tokensUsed || 0,
      metadata: data.metadata || null,
      createdAt: new Date(),
    })
    .returning();
  
  // Update conversation message count and tokens
  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + 1`,
      totalTokens: sql`${conversations.totalTokens} + ${data.tokensUsed || 0}`,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, data.conversationId));
  
  return message;
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 100
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

/**
 * Get recent messages for a conversation (for context window)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 20
): Promise<Message[]> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  
  // Return in chronological order
  return result.reverse();
}

/**
 * Delete all messages for a conversation
 */
export async function deleteConversationMessages(conversationId: string): Promise<number> {
  const deleted = await db
    .delete(messages)
    .where(eq(messages.conversationId, conversationId))
    .returning();
  
  return deleted.length;
}

// ============================================================================
// Archive Operations
// ============================================================================

/**
 * Archive a conversation (set isArchived=true, archivedAt=now)
 * Verifies ownership before archiving
 */
export async function archiveConversation(id: string, userId: string): Promise<Conversation | null> {
  const [updated] = await db
    .update(conversations)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, userId)
      )
    )
    .returning();
  
  return updated || null;
}

/**
 * Unarchive a conversation (set isArchived=false, archivedAt=null)
 * Verifies ownership before unarchiving
 */
export async function unarchiveConversation(id: string, userId: string): Promise<Conversation | null> {
  const [updated] = await db
    .update(conversations)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, userId)
      )
    )
    .returning();
  
  return updated || null;
}

/**
 * Get archived conversations for a user
 */
export async function getArchivedConversations(
  userId: string,
  limit: number = 50
): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.isArchived, true),
        isNull(conversations.deletedAt)
      )
    )
    .orderBy(desc(conversations.archivedAt))
    .limit(limit);
}

/**
 * Hard delete an archived conversation (permanently remove)
 * Verifies the conversation is archived and owned by the user first
 */
export async function hardDeleteArchivedConversation(id: string, userId: string): Promise<boolean> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, userId),
        eq(conversations.isArchived, true)
      )
    )
    .limit(1);
  
  if (!conversation) {
    return false;
  }
  
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  
  return result.length > 0;
}

// ============================================================================
// Analytics Operations
// ============================================================================

/**
 * Record an analytics event
 */
export async function recordAnalyticsEvent(data: {
  eventName: string;
  userId?: string | null;
  sessionId?: string | null;
  source?: string;
  properties?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}): Promise<AnalyticsEvent> {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      id: generateId('evt'),
      eventName: data.eventName,
      userId: data.userId || null,
      sessionId: data.sessionId || null,
      source: data.source || 'server',
      properties: data.properties || null,
      context: data.context || null,
      createdAt: new Date(),
    })
    .returning();
  
  return event;
}

/**
 * Get analytics summary for admin dashboard
 */
export async function getAnalyticsSummary(days: number = 30): Promise<{
  totalEvents: number;
  uniqueUsers: number;
  eventCounts: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const [totalResult] = await db
    .select({ count: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since));
  
  const uniqueUsersResult = await db
    .select({ userId: analyticsEvents.userId })
    .from(analyticsEvents)
    .where(
      and(
        gte(analyticsEvents.createdAt, since),
        sql`${analyticsEvents.userId} IS NOT NULL`
      )
    )
    .groupBy(analyticsEvents.userId);
  
  const eventCountsResult = await db
    .select({
      eventName: analyticsEvents.eventName,
      count: count(),
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventName);
  
  const recentEvents = await db
    .select()
    .from(analyticsEvents)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(100);
  
  const eventCounts: Record<string, number> = {};
  for (const row of eventCountsResult) {
    eventCounts[row.eventName] = row.count;
  }
  
  return {
    totalEvents: totalResult?.count || 0,
    uniqueUsers: uniqueUsersResult.length,
    eventCounts,
    recentEvents,
  };
}
