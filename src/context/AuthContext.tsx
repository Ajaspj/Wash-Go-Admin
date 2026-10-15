import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../api/types';
import { api, setAuthToken, getAuthToken, ApiError } from '../api/client';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'AUTHENTICATING';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  status: AuthStatus;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  isNetworkError: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<UserProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialToken = getAuthToken();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(initialToken);
  const [status, setStatus] = useState<AuthStatus>(initialToken ? 'INITIALIZING' : 'UNAUTHENTICATED');
  const [isInitializing, setIsInitializing] = useState<boolean>(!!initialToken);
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    setStatus((prev) => (prev === 'AUTHENTICATING' ? 'AUTHENTICATING' : 'INITIALIZING'));
    setIsNetworkError(false);

    try {
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setStatus('UNAUTHENTICATED');
        setError(`Access Denied: Account with role "${profile.role}" does not have administrator privileges.`);
        setIsNetworkError(false);
        return null;
      }

      setUser(profile);
      setToken(getAuthToken());
      setStatus('AUTHENTICATED');
      setError(null);
      setIsNetworkError(false);
      return profile;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        // Authoritative token expiration or invalid session
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setStatus('UNAUTHENTICATED');
        setError(null);
        setIsNetworkError(false);
      } else if (err instanceof ApiError && err.status === 403) {
        // Authoritative access denial
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setStatus('UNAUTHENTICATED');
        setError(err.message || 'Access Denied: Administrator privileges required.');
        setIsNetworkError(false);
      } else {
        // Network timeout (status 0) or server connection failure:
        // PRESERVE the token in storage so the session is not destroyed by a temporary connection drop
        setStatus('UNAUTHENTICATED');
        setIsNetworkError(true);
        setError(err?.message || 'Unable to connect to backend server. Retrying may resolve the issue.');
      }
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const currentToken = getAuthToken();
    if (currentToken) {
      setToken(currentToken);
      fetchProfile();
    } else {
      setToken(null);
      setUser(null);
      setStatus('UNAUTHENTICATED');
      setIsInitializing(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setStatus('AUTHENTICATING');
    setError(null);
    setIsNetworkError(false);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const authResp = await api.auth.login(cleanEmail, password);
      setAuthToken(authResp.accessToken);
      setToken(authResp.accessToken);

      // Verify backend authoritative role
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setStatus('UNAUTHENTICATED');
        throw new ApiError(
          403,
          'ACCESS_DENIED',
          `Access Denied: Account with role "${profile.role}" does not have administrator privileges.`
        );
      }

      setUser(profile);
      setStatus('AUTHENTICATED');
      setError(null);
      setIsNetworkError(false);
      return profile;
    } catch (err: any) {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setStatus('UNAUTHENTICATED');
      const msg = err instanceof ApiError ? err.message : (err?.message || 'Authentication failed. Please verify credentials.');
      setError(msg);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network failures on logout
    } finally {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setStatus('UNAUTHENTICATED');
      setError(null);
      setIsNetworkError(false);
      setIsInitializing(false);
    }
  };

  const isAuthenticated = status === 'AUTHENTICATED' && !!user && user.role === 'ADMIN';
  const isLoading = status === 'INITIALIZING' || status === 'AUTHENTICATING';

  const value: AuthContextType = {
    user,
    token,
    status,
    isLoading,
    isInitializing,
    isAuthenticated,
    isNetworkError,
    error,
    login,
    logout,
    retryAuth: fetchProfile,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
