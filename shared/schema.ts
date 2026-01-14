/**
 * Database Schema
 *
 * Complete PostgreSQL schema for MetaDJ Nexus using Drizzle ORM.
 * Includes: users, sessions, preferences, conversations, messages.
 */

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
import { relations, sql } from 'drizzle-orm';

/**
 * Users table - Core user account data
 */
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    isAdmin: boolean('is_admin').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('users_email_unique_idx').on(table.email),
    index('users_status_idx').on(table.status),
    index('users_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Sessions table - Server-side session storage (optional, for enhanced security)
 */
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
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
 * Password reset tokens
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
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
    audioPreferences: jsonb('audio_preferences').default(sql`'{"volume": 0.8, "autoplay": false}'::jsonb`),
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
