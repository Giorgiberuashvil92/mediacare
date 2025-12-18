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
      // Skip if we're on auth pages - no need to check or redirect
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/auth')) {
        setIsLoading(false);
        return;
      }

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
          // No token found, redirect to login
          router.push('/auth/sign-in');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const login = async (email: string, password: string) => {
    console.log('🔐 [Auth] Starting login...');
    try {
      const response: AuthResponse = await apiService.login({ email, password });
      console.log('🔐 [Auth] Login response:', response.success);
      
      if (response.success && response.data.user) {
        console.log('🔐 [Auth] Setting user data...');
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store tokens
        if (response.data.token) {
          console.log('🔐 [Auth] Storing token...');
          localStorage.setItem('accessToken', response.data.token);
          apiService.setToken(response.data.token);
          // Also store in cookie for middleware and server-side access
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          document.cookie = `accessToken=${response.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
          console.log('🔐 [Auth] Cookie set, isSecure:', isSecure);
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        console.log('🔐 [Auth] Redirecting to /...');
        router.push('/');
      } else {
        console.log('🔐 [Auth] Login failed - no user in response');
        throw new Error('Login failed - invalid response');
      }
    } catch (error: any) {
      console.error('🔐 [Auth] Login error:', error);
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

