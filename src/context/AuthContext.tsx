import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../api/types';
import { api, setAuthToken, getAuthToken, ApiError } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isNetworkError: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<UserProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    setIsLoading(true);
    try {
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setError(`Access Denied: Account with role "${profile.role}" does not have administrator privileges.`);
        setIsNetworkError(false);
        return null;
      }
      setUser(profile);
      setError(null);
      setIsNetworkError(false);
      return profile;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        // Authoritative token expiration or invalid session
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setError(null);
        setIsNetworkError(false);
      } else if (err instanceof ApiError && err.status === 403) {
        // Authoritative access denial
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setError(err.message || 'Access Denied: Administrator privileges required.');
        setIsNetworkError(false);
      } else {
        // Network error (status 0) or 5xx server glitch:
        // PRESERVE the token so the session is not destroyed by a temporary connection drop
        setIsNetworkError(true);
        setError(err?.message || 'Unable to connect to backend server. Retrying may resolve the issue.');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentToken = getAuthToken();
    if (currentToken) {
      setToken(currentToken);
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    setIsNetworkError(false);
    try {
      const authResp = await api.auth.login(email, password);
      setToken(authResp.accessToken);

      // Verify backend authoritative role
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        throw new ApiError(
          403,
          'ACCESS_DENIED',
          `Access Denied: Account with role "${profile.role}" does not have administrator privileges.`
        );
      }

      setUser(profile);
      return profile;
    } catch (err: any) {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      const msg = err instanceof ApiError ? err.message : 'Authentication failed. Please verify credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.auth.logout();
    } finally {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setError(null);
      setIsNetworkError(false);
    }
  };

  const value = {
    user,
    token,
    isLoading,
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
