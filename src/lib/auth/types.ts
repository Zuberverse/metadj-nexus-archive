/**
 * Authentication Types
 *
 * Type definitions for the authentication system.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  email: string;
  isAdmin: boolean;
  expiresAt: number;
}

export interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: SessionUser;
}

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'feedback' | 'idea';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'reviewed' | 'in-progress' | 'resolved' | 'closed';
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}
