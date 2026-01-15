'use client';

/**
 * Authentication Context
 *
 * Client-side auth state management with session persistence.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { logger } from '@/lib/logger';
import { clearSessionStorage } from '@/lib/storage';
import { TERMS_VERSION } from '@/lib/constants/terms';
import { TermsUpdateModal } from '@/components/modals';

interface User {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  termsVersion?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, username: string, password: string, termsAccepted: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  updateUsername: (username: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  checkAvailability: (type: 'username' | 'email', value: string) => Promise<{ available: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      logger.error('[Auth] Session refresh error', { error: toErrorMessage(error) });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      logger.error('[Auth] Login error', { error: toErrorMessage(error) });
      return { success: false, message: 'An error occurred during login' };
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, termsAccepted: boolean) => {
    if (!termsAccepted) {
      return { success: false, message: 'Please agree to the Terms & Conditions' };
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, termsAccepted }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || 'Registration failed' };
    } catch (error) {
      logger.error('[Auth] Register error', { error: toErrorMessage(error) });
      return { success: false, message: 'An error occurred during registration' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear session-specific localStorage to ensure clean state on next login
      clearSessionStorage();
      setUser(null);
    } catch (error) {
      logger.error('[Auth] Logout error', { error: toErrorMessage(error) });
      // Still clear session storage even on error
      clearSessionStorage();
      setUser(null);
    }
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    try {
      const response = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateEmail', email }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || 'Update failed' };
    } catch (error) {
      logger.error('[Auth] Update email error', { error: toErrorMessage(error) });
      return { success: false, message: 'An error occurred' };
    }
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    try {
      const response = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateUsername', username }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || 'Update failed' };
    } catch (error) {
      logger.error('[Auth] Update username error', { error: toErrorMessage(error) });
      return { success: false, message: 'An error occurred' };
    }
  }, []);

  const checkAvailability = useCallback(async (type: 'username' | 'email', value: string) => {
    try {
      const response = await fetch('/api/auth/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });

      const data = await response.json();

      if (data.success) {
        return { available: data.available, error: data.error };
      }

      return { available: false, error: data.message || 'Check failed' };
    } catch (error) {
      logger.error('[Auth] Check availability error', { error: toErrorMessage(error) });
      return { available: false, error: 'An error occurred' };
    }
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePassword', currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      }

      return { success: false, message: data.message || 'Update failed' };
    } catch (error) {
      logger.error('[Auth] Update password error', { error: toErrorMessage(error) });
      return { success: false, message: 'An error occurred' };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin ?? false,
      login,
      register,
      logout,
      updateEmail,
      updateUsername,
      updatePassword,
      checkAvailability,
      refreshSession,
    }),
    [user, isLoading, login, register, logout, updateEmail, updateUsername, updatePassword, checkAvailability, refreshSession]
  );

  const needsTermsAcceptance = useMemo(() => {
    if (!user || isLoading) return false;
    if (user.isAdmin) return false;
    return user.termsVersion !== TERMS_VERSION;
  }, [user, isLoading]);

  const handleTermsAccepted = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsTermsAcceptance && <TermsUpdateModal onAccepted={handleTermsAccepted} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
