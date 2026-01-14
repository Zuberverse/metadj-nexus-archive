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

interface User {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  updateUsername: (username: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  checkAvailability: (type: 'username' | 'email', value: string) => Promise<{ available: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
      console.error('[Auth] Session refresh error:', error);
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
      console.error('[Auth] Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || 'Registration failed' };
    } catch (error) {
      console.error('[Auth] Register error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
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
      console.error('[Auth] Update email error:', error);
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
      console.error('[Auth] Update username error:', error);
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
      console.error('[Auth] Check availability error:', error);
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
      console.error('[Auth] Update password error:', error);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
