/**
 * User Management
 *
 * PostgreSQL-based user storage via Drizzle ORM.
 * Uses the storage layer for database operations.
 *
 * See docs/AUTH-SYSTEM.md for architecture details.
 */

import * as storage from '../../../server/storage';
import { hashPassword, verifyPassword } from './password';
import type { User, SessionUser, LoginCredentials, RegisterCredentials } from './types';

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
    passwordHash: '',
    isAdmin: true,
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
      console.warn('[Auth] ADMIN_PASSWORD not set, admin login disabled');
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
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin,
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
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin,
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
      console.warn('[Auth] ADMIN_PASSWORD not set, admin login disabled');
      return null;
    }
    if (password === adminPassword) {
      return {
        id: 'admin',
        email: 'admin',
        isAdmin: true,
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
    isAdmin: user.isAdmin,
  };
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

  const { email, password } = credentials;
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  // Check password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  // Reserved usernames
  if (normalizedEmail === 'admin') {
    throw new Error('This email cannot be used for registration');
  }

  const passwordHash = await hashPassword(password);

  const newUser = await storage.createUser({
    id: generateUserId(),
    email: normalizedEmail,
    passwordHash,
    isAdmin: false,
  });

  return {
    id: newUser.id,
    email: newUser.email,
    isAdmin: newUser.isAdmin,
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
    isAdmin: updated.isAdmin,
  };
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
    isAdmin: user.isAdmin,
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
