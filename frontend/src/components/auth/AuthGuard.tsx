'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAuthenticatedSync, getCurrentUser, logout, User } from '../../utils/auth';

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
    const checkAuth = async () => {
      try {
        // First do a quick sync check using local data
        if (isAuthenticatedSync()) {
          const currentUser = getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsLoading(false);
            
            // Then verify with server in background
            const isValid = await isAuthenticated();
            if (!isValid) {
              // Server says token is invalid, redirect to login
              await logout();
              router.push('/auth/login');
            }
            return;
          }
        }
        
        // No local user data or sync check failed, verify with server
        const isValid = await isAuthenticated();
        if (isValid) {
          const currentUser = getCurrentUser();
          setUser(currentUser);
          setIsLoading(false);
        } else {
          // Not authenticated, clear any stale data and redirect
          await logout();
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        await logout();
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
 * Hook to get current authenticated user with server verification
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Quick sync check first
        if (isAuthenticatedSync()) {
          const currentUser = getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setLoading(false);
            
            // Verify with server in background
            const isValid = await isAuthenticated();
            if (!isValid) {
              setUser(null);
            } else {
              // Update user data from server
              const updatedUser = getCurrentUser();
              setUser(updatedUser);
            }
            return;
          }
        }
        
        // No local data, check with server
        const isValid = await isAuthenticated();
        if (isValid) {
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
      if (e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      setUser(null);
      window.location.href = '/auth/login';
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout: handleLogout
  };
};

/**
 * Hook for components that need to ensure authentication
 * Automatically redirects to login if not authenticated
 */
export const useRequireAuth = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  return { user, loading };
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