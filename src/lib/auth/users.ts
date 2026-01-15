/**
 * User Management
 *
 * PostgreSQL-based user storage via Drizzle ORM.
 * Uses the storage layer for database operations.
 *
 * See docs/AUTH-SYSTEM.md for architecture details.
 */

import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword } from './password';
import * as storage from '../../../server/storage';
import type { User, SessionUser, LoginCredentials, RegisterCredentials } from './types';
import { TERMS_VERSION } from '@/lib/constants/terms';

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a virtual admin user object
 */
function createAdminUser(): User {
  return {
    id: 'admin',
    email: 'admin',
    username: 'admin',
    passwordHash: '',
    isAdmin: true,
    emailVerified: true,
    termsVersion: null,
    termsAcceptedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Find a user by email (or "admin" username)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // Special case: admin login
  if (normalizedEmail === 'admin') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      logger.warn('[Auth] ADMIN_PASSWORD not set, admin login disabled');
      return null;
    }
    return createAdminUser();
  }

  const user = await storage.findUserByEmail(normalizedEmail);
  if (!user) return null;

  // Convert database user to auth user type
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    termsVersion: user.termsVersion ?? null,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  if (id === 'admin') {
    return createAdminUser();
  }

  const user = await storage.findUserById(id);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    termsVersion: user.termsVersion ?? null,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Authenticate a user with email/password
 */
export async function authenticateUser(
  credentials: LoginCredentials
): Promise<SessionUser | null> {
  const { email, password } = credentials;
  const normalizedEmail = email.toLowerCase().trim();

  // Special case: admin login
  if (normalizedEmail === 'admin') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      logger.warn('[Auth] ADMIN_PASSWORD not set, admin login disabled');
      return null;
    }
    if (password === adminPassword) {
      return {
        id: 'admin',
        email: 'admin',
        username: 'admin',
        isAdmin: true,
        emailVerified: true,
        termsVersion: null,
      };
    }
    return null;
  }

  const user = await findUserByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    termsVersion: user.termsVersion,
  };
}

/**
 * Validate username format (lowercase alphanumeric and underscores, 3-20 chars)
 */
function validateUsername(username: string): { valid: boolean; error?: string } {
  const normalized = username.toLowerCase().trim();
  
  if (normalized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (normalized.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores' };
  }
  if (/^[0-9]/.test(normalized)) {
    return { valid: false, error: 'Username cannot start with a number' };
  }
  
  const reserved = ['admin', 'root', 'system', 'metadj', 'metadjai', 'support', 'help', 'api', 'www'];
  if (reserved.includes(normalized)) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true };
}

/**
 * Register a new user
 */
export async function registerUser(
  credentials: RegisterCredentials
): Promise<SessionUser | null> {
  const registrationEnabled = process.env.AUTH_REGISTRATION_ENABLED !== 'false';
  if (!registrationEnabled) {
    throw new Error('Registration is currently disabled');
  }

  const { email, username, password } = credentials;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  // Validate username format
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    throw new Error(usernameValidation.error);
  }

  // Check password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if email already exists
  const emailAvailable = await storage.isEmailAvailable(normalizedEmail);
  if (!emailAvailable) {
    throw new Error('An account with this email already exists');
  }

  // Check if username already exists
  const usernameAvailable = await storage.isUsernameAvailable(normalizedUsername);
  if (!usernameAvailable) {
    throw new Error('This username is already taken');
  }

  // Reserved admin email
  if (normalizedEmail === 'admin') {
    throw new Error('This email cannot be used for registration');
  }

  const passwordHash = await hashPassword(password);

  const newUser = await storage.createUser({
    id: generateUserId(),
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash,
    isAdmin: false,
    emailVerified: false,
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: new Date(),
  });

  return {
    id: newUser.id,
    email: newUser.email,
    username: newUser.username,
    isAdmin: newUser.isAdmin,
    emailVerified: newUser.emailVerified,
    termsVersion: newUser.termsVersion,
  };
}

/**
 * Update user email
 */
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<SessionUser | null> {
  if (userId === 'admin') {
    throw new Error('Admin email cannot be changed');
  }

  const normalizedEmail = newEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  // Check if email is already taken
  const existingUser = await findUserByEmail(newEmail);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('This email is already in use');
  }

  const updated = await storage.updateUserEmail(userId, normalizedEmail);
  if (!updated) {
    throw new Error('User not found');
  }

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    isAdmin: updated.isAdmin,
    emailVerified: updated.emailVerified,
    termsVersion: updated.termsVersion ?? null,
  };
}

/**
 * Update user username
 */
export async function updateUserUsername(
  userId: string,
  newUsername: string
): Promise<SessionUser | null> {
  if (userId === 'admin') {
    throw new Error('Admin username cannot be changed');
  }

  const normalizedUsername = newUsername.toLowerCase().trim();
  
  // Validate username format
  const validation = validateUsername(newUsername);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check if username is already taken
  const usernameAvailable = await storage.isUsernameAvailable(normalizedUsername, userId);
  if (!usernameAvailable) {
    throw new Error('This username is already taken');
  }

  const updated = await storage.updateUserUsername(userId, normalizedUsername);
  if (!updated) {
    throw new Error('User not found');
  }

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    isAdmin: updated.isAdmin,
    emailVerified: updated.emailVerified,
    termsVersion: updated.termsVersion ?? null,
  };
}

/**
 * Check username availability
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }
  
  const available = await storage.isUsernameAvailable(username.toLowerCase().trim(), excludeUserId);
  return { available };
}

/**
 * Check email availability
 */
export async function checkEmailAvailability(
  email: string,
  excludeUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(normalizedEmail)) {
    return { available: false, error: 'Invalid email format' };
  }
  
  if (normalizedEmail === 'admin') {
    return { available: false, error: 'This email cannot be used' };
  }
  
  const available = await storage.isEmailAvailable(normalizedEmail, excludeUserId);
  return { available };
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  if (userId === 'admin') {
    throw new Error('Admin password can only be changed via environment variable');
  }

  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  const newPasswordHash = await hashPassword(newPassword);
  const updated = await storage.updateUserPassword(userId, newPasswordHash);
  
  return !!updated;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  const users = await storage.getAllUsers();
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    termsVersion: user.termsVersion ?? null,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

/**
 * Get user count
 */
export async function getUserCount(): Promise<number> {
  return storage.getUserCount();
}

/**
 * Update user terms acceptance
 */
export async function updateUserTerms(
  userId: string,
  termsVersion: string
): Promise<SessionUser | null> {
  if (userId === 'admin') {
    // Return null for admin (no-op, admin doesn't have DB terms)
    return null;
  }

  const updated = await storage.updateUserTerms(userId, termsVersion);
  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    isAdmin: updated.isAdmin,
    emailVerified: updated.emailVerified,
    termsVersion: updated.termsVersion ?? null,
  };
}
