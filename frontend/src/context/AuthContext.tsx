import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 4000)
      );
      const profile = await Promise.race([api.getMe(), timeoutPromise]);
      setUser(profile);
    } catch {
      setUser(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const token = localStorage.getItem('slotspot_token');
      if (token) {
        refreshUser();
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const switchDemoUser = async (email: string) => {
    // Default demo password is password123
    await login(email, 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchDemoUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
