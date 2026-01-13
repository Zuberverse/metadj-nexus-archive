/**
 * User Management
 *
 * JSON-based user storage for development and single-instance deployments.
 * For production with multiple instances, migrate to a database.
 *
 * See docs/AUTH-SYSTEM.md for database migration guide.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from './password';
import type { User, SessionUser, LoginCredentials, RegisterCredentials } from './types';

// Use a data directory that persists (in Replit, this is the project root)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

/**
 * Ensure the data directory and users file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
  } catch (error) {
    console.error('[Auth] Failed to initialize data file:', error);
  }
}

/**
 * Read all users from storage
 */
async function readUsers(): Promise<User[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.users || [];
  } catch {
    return [];
  }
}

/**
 * Write users to storage
 */
async function writeUsers(users: User[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2));
}

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Find a user by email (or "admin" username)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await readUsers();
  const normalizedEmail = email.toLowerCase().trim();

  // Special case: admin login
  if (normalizedEmail === 'admin') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn('[Auth] ADMIN_PASSWORD not set, admin login disabled');
      return null;
    }
    // Return a virtual admin user (password checked separately)
    return {
      id: 'admin',
      email: 'admin',
      passwordHash: '', // Will use env var for password check
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return users.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  if (id === 'admin') {
    return {
      id: 'admin',
      email: 'admin',
      passwordHash: '',
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const users = await readUsers();
  return users.find((u) => u.id === id) || null;
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

  const users = await readUsers();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const newUser: User = {
    id: generateUserId(),
    email: normalizedEmail,
    passwordHash,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
  };

  users.push(newUser);
  await writeUsers(users);

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

  const users = await readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users[userIndex].email = normalizedEmail;
  users[userIndex].updatedAt = new Date().toISOString();
  await writeUsers(users);

  return {
    id: users[userIndex].id,
    email: users[userIndex].email,
    isAdmin: users[userIndex].isAdmin,
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

  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await writeUsers(users);

  return true;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  const users = await readUsers();
  return users.map(({ passwordHash, ...user }) => user);
}

/**
 * Get user count
 */
export async function getUserCount(): Promise<number> {
  const users = await readUsers();
  return users.length;
}
