'use client';

import { apiService, AuthResponse, User } from '@/lib/api';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');
        
        if (storedUser && token) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          apiService.setToken(token);
          // Also set cookie if not already set (for server-side access)
          if (!document.cookie.includes('accessToken=')) {
            const isSecure = window.location.protocol === 'https:';
            document.cookie = `accessToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
          }
        } else {
          // No token found, redirect to login if not on auth page
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/auth')) {
            router.push('/auth/sign-in');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // On error, redirect to login
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth')) {
          router.push('/auth/sign-in');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await apiService.login({ email, password });
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store tokens
        if (response.data.token) {
          localStorage.setItem('accessToken', response.data.token);
          apiService.setToken(response.data.token);
          // Also store in cookie for middleware and server-side access
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          document.cookie = `accessToken=${response.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        router.push('/');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      apiService.setToken(null);
      // Clear cookie
      document.cookie = 'accessToken=; path=/; max-age=0';
      router.push('/auth/sign-in');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

