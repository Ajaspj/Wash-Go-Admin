import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../api/types';
import { api, setAuthToken, getAuthToken, ApiError } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setError('Access Denied: Your account does not have administrator privileges.');
        return null;
      }
      setUser(profile);
      setError(null);
      return profile;
    } catch (err: any) {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const authResp = await api.auth.login(email, password);
      setToken(authResp.accessToken);

      // Verify backend authoritative role
      const profile = await api.auth.me();
      if (profile.role !== 'ADMIN') {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        throw new ApiError(403, 'ACCESS_DENIED', 'Access Denied: Only administrators may access this portal.');
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
    }
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    logout,
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
