/**
 * Storage Layer
 *
 * Database operations for users, sessions, preferences, and login attempts.
 * Uses Drizzle ORM with PostgreSQL.
 */

import { eq, and, gte, sql, count, desc, isNull } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  sessions,
  userPreferences,
  loginAttempts,
  conversations,
  messages,
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
 * Get all users (excludes soft-deleted)
 */
export async function getAllUsers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(sql`${users.deletedAt} IS NULL`);
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
