'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser, logout, type User } from '@/utils/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component that protects routes and ensures user is authenticated
 * Redirects to login page if user is not authenticated or token is expired
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = <div>Loading...</div> 
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (isAuthenticated()) {
          const currentUser = getCurrentUser();
          setUser(currentUser);
          setIsLoading(false);
        } else {
          // Clear any stale data and redirect to login
          logout();
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        logout();
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
};

/**
 * Hook to get current authenticated user
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (isAuthenticated()) {
          const currentUser = getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Optional: Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'keycloak_access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/auth/login';
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout: handleLogout
  };
};

/**
 * Component to display user info and logout button
 */
export const UserInfo: React.FC = () => {
  const { user, logout: handleLogout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {user.avatar_url && (
        <img 
          src={user.avatar_url} 
          alt={user.full_name || user.email}
          className="w-10 h-10 rounded-full"
        />
      )}
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {user.full_name || user.username || 'User'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {user.email}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          via {user.provider}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}; 