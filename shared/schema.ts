/**
 * Database Schema
 *
 * Complete PostgreSQL schema for MetaDJ Nexus using Drizzle ORM.
 * Includes: users, sessions, preferences, conversations, messages,
 * email verification tokens, password resets, login attempts,
 * analytics events, feedback, journal entries, recently played.
 */

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Users table - Core user account data
 */
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 30 }),
    usernameAliases: jsonb('username_aliases').default(sql`'[]'::jsonb`),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    isAdmin: boolean('is_admin').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    termsVersion: varchar('terms_version', { length: 20 }),
    termsAcceptedAt: timestamp('terms_accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('users_email_unique_idx').on(table.email),
    uniqueIndex('users_username_unique_idx').on(table.username),
    index('users_status_idx').on(table.status),
    index('users_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Email verification tokens — Planned feature (schema ready, routes pending)
 *
 * Stores hashed tokens sent via email to verify user email addresses.
 * On registration (or email change), a token is generated, hashed with SHA-256,
 * and stored here. The raw token is sent to the user's email as a verification link.
 * When the user clicks the link, the token is hashed and looked up to verify ownership.
 *
 * Flow: register -> generate token -> store hash here -> email raw token -> user clicks link
 *       -> hash incoming token -> find match -> mark used -> set users.emailVerified = true
 *
 * Security: Only the SHA-256 hash is stored; the raw token never touches the database.
 * Tokens auto-invalidated by creating a new one (old tokens deleted per user).
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    /** IP address of the verification request, for security audit trail */
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('email_verification_tokens_token_hash_idx').on(table.tokenHash),
    index('email_verification_tokens_user_id_idx').on(table.userId),
    index('email_verification_tokens_expires_at_idx').on(table.expiresAt),
  ]
);

/**
 * Sessions table — Server-side session storage (optional, for enhanced security)
 */
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    /**
     * Planned: Token rotation for sliding session windows.
     * When a session is refreshed, a new rotationToken is issued and the old one
     * is invalidated. This prevents session fixation attacks by ensuring that
     * stolen session IDs become invalid after the legitimate user's next request.
     * The client presents the rotation token to extend the session; the server
     * verifies it, issues a new one, and updates expiresAt.
     */
    rotationToken: varchar('rotation_token', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_rotation_token_idx').on(table.rotationToken),
  ]
);

/**
 * Password reset tokens — Planned feature (schema ready, routes pending)
 *
 * Stores hashed tokens for password reset requests. When a user requests a
 * password reset, a cryptographically random token is generated, hashed with
 * SHA-256, and stored here. The raw token is sent to the user's email as a
 * reset link. When the user submits a new password with the token, the token
 * is hashed and looked up to authorize the password change.
 *
 * Flow: forgot password -> generate token -> store hash here -> email raw token
 *       -> user clicks link -> hash incoming token -> find valid match
 *       -> update password -> mark token used
 *
 * Security: Only the SHA-256 hash is stored; the raw token never touches the database.
 * Tokens are single-use (marked via usedAt) and time-limited (expiresAt).
 * The ipAddress field enables security audit trails for reset requests.
 */
export const passwordResets = pgTable(
  'password_resets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    /** IP address of the reset request, for security audit trail */
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('password_resets_token_hash_idx').on(table.tokenHash),
    index('password_resets_user_id_idx').on(table.userId),
    index('password_resets_expires_at_idx').on(table.expiresAt),
  ]
);

/**
 * Login attempts tracking (for rate limiting and security)
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('login_attempts_email_idx').on(table.email),
    index('login_attempts_ip_address_idx').on(table.ipAddress),
    index('login_attempts_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Recently Played tracks - For cross-device history sync
 */
export const recentlyPlayed = pgTable(
  'recently_played',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trackId: varchar('track_id', { length: 64 }).notNull(),
    playedAt: timestamp('played_at').defaultNow().notNull(),
  },
  (table) => [
    index('recently_played_user_id_idx').on(table.userId),
    index('recently_played_played_at_idx').on(table.playedAt),
    uniqueIndex('recently_played_user_track_idx').on(table.userId, table.trackId),
  ]
);

/**
 * User preferences - Settings and customization
 */
export const userPreferences = pgTable(
  'user_preferences',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    theme: varchar('theme', { length: 20 }).default('system'),
    reducedMotion: boolean('reduced_motion').default(false),
    notifications: jsonb('notifications').default(sql`'{"email": true, "push": false}'::jsonb`),
    audioPreferences: jsonb('audio_preferences').default(sql`'{"volume": 0.8, "autoplay": false, "crossfadeEnabled": false, "muted": false}'::jsonb`),
    videoPreferences: jsonb('video_preferences').default(sql`'{"quality": "auto", "autoplay": false}'::jsonb`),
    privacySettings: jsonb('privacy_settings').default(sql`'{"analytics": true, "personalization": true}'::jsonb`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_preferences_user_id_unique_idx').on(table.userId),
  ]
);

/**
 * Conversations - MetaDJai chat threads
 */
export const conversations = pgTable(
  'conversations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    summary: text('summary'),
    totalTokens: integer('total_tokens').default(0),
    messageCount: integer('message_count').default(0),
    isArchived: boolean('is_archived').default(false),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('conversations_user_id_idx').on(table.userId),
    index('conversations_created_at_idx').on(table.createdAt),
    index('conversations_is_archived_idx').on(table.isArchived),
  ]
);

/**
 * Messages - Individual chat messages within conversations
 */
export const messages = pgTable(
  'messages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    conversationId: varchar('conversation_id', { length: 64 })
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    tokensUsed: integer('tokens_used').default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  ]
);

/**
 * Feedback items - User-submitted feedback, bugs, and feature requests
 */
export const feedback = pgTable(
  'feedback',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    type: varchar('type', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    severity: varchar('severity', { length: 20 }),
    status: varchar('status', { length: 20 }).default('new').notNull(),
    userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
    userEmail: varchar('user_email', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('feedback_type_idx').on(table.type),
    index('feedback_status_idx').on(table.status),
    index('feedback_user_id_idx').on(table.userId),
    index('feedback_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Relations - Define relationships between tables
 */
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  passwordResets: many(passwordResets),
  preferences: one(userPreferences),
  conversations: many(conversations),
  feedback: many(feedback),
  analyticsEvents: many(analyticsEvents),
  recentlyPlayed: many(recentlyPlayed),
  journalEntries: many(journalEntries),
}));

export const recentlyPlayedRelations = relations(recentlyPlayed, ({ one }) => ({
  user: one(users, {
    fields: [recentlyPlayed.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

/**
 * Analytics events - Server-side event tracking
 */
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 64 }),
    source: varchar('source', { length: 50 }).default('server').notNull(),
    properties: jsonb('properties'),
    context: jsonb('context'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('analytics_events_event_name_idx').on(table.eventName),
    index('analytics_events_user_id_idx').on(table.userId),
    index('analytics_events_created_at_idx').on(table.createdAt),
    index('analytics_events_event_created_idx').on(table.eventName, table.createdAt),
  ]
);

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

/**
 * Journal Entries - User private journal notes
 */
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('journal_entries_user_id_idx').on(table.userId),
    index('journal_entries_created_at_idx').on(table.createdAt),
    index('journal_entries_updated_at_idx').on(table.updatedAt),
  ]
);

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
}));

/**
 * Type exports for use throughout the application
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type RecentlyPlayed = typeof recentlyPlayed.$inferSelect;
export type NewRecentlyPlayed = typeof recentlyPlayed.$inferInsert;
export type JournalEntryRecord = typeof journalEntries.$inferSelect;
export type NewJournalEntryRecord = typeof journalEntries.$inferInsert;
