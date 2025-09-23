'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAuthenticatedSync, getCurrentUser, logout, User } from '../../utils/auth';

// Global singleton for auth management
class AuthManager {
  private static instance: AuthManager;
  private intervalId: NodeJS.Timeout | null = null;
  private lastAuthCheck: number = 0;
  private subscribers: Set<(user: User | null, loading: boolean) => void> = new Set();
  private currentUser: User | null = null;
  private isLoading: boolean = true;
  private AUTH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  
  private constructor() {
    this.startPeriodicCheck();
    
    // Add cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });
    }
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      console.log('[AuthManager] Creating new singleton instance');
      AuthManager.instance = new AuthManager();
    } else {
      console.log('[AuthManager] Reusing existing singleton instance');
    }
    return AuthManager.instance;
  }

  public subscribe(callback: (user: User | null, loading: boolean) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.currentUser, this.isLoading);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      callback(this.currentUser, this.isLoading);
    });
  }

  private async checkAuth(forceCheck = false): Promise<void> {
    try {
      const now = Date.now();
      
      // Skip server check if we checked recently (unless forced)
      if (!forceCheck && now - this.lastAuthCheck < this.AUTH_CHECK_INTERVAL) {
        // Quick sync check first
        if (isAuthenticatedSync()) {
          const currentUser = getCurrentUser();
          if (currentUser) {
            this.currentUser = currentUser;
            this.isLoading = false;
            this.notifySubscribers();
            return;
          }
        }
      }
      
      // Quick sync check first
      if (isAuthenticatedSync()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
          this.currentUser = currentUser;
          this.isLoading = false;
          this.notifySubscribers();
          
          // Then verify with server in background (but respect interval)
          if (forceCheck || now - this.lastAuthCheck >= this.AUTH_CHECK_INTERVAL) {
            const isValid = await isAuthenticated();
            if (!isValid) {
              this.currentUser = null;
              this.notifySubscribers();
            } else {
              // Update user data from server
              const updatedUser = getCurrentUser();
              this.currentUser = updatedUser;
              this.lastAuthCheck = now;
              this.notifySubscribers();
            }
          }
          return;
        }
      }
      
      // No local data, check with server
      const isValid = await isAuthenticated();
      if (isValid) {
        const currentUser = getCurrentUser();
        this.currentUser = currentUser;
        this.lastAuthCheck = now;
      } else {
        this.currentUser = null;
      }
      this.isLoading = false;
      this.notifySubscribers();
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.currentUser = null;
      this.isLoading = false;
      this.notifySubscribers();
    }
  }

  private startPeriodicCheck(): void {
    // Initial check
    this.checkAuth();
    
    // Set up periodic auth check (every 30 minutes)
    this.intervalId = setInterval(() => {
      console.log('[AuthManager] 30-minute interval triggered - performing auth check');
      this.checkAuth(true); // Force check every 30 minutes
    }, this.AUTH_CHECK_INTERVAL);
  }

  public async forceCheck(): Promise<void> {
    await this.checkAuth(true);
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

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
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // First do a quick sync check using local data
        if (isAuthenticatedSync()) {
          const currentUser = getCurrentUser();
          if (currentUser && isMounted) {
            setUser(currentUser);
            setIsLoading(false);
            
            // Then verify with server in background
            const isValid = await isAuthenticated();
            if (isMounted && !isValid) {
              // Server says token is invalid, redirect to login
              await logout();
              router.push('/auth/login');
            }
            return;
          }
        }
        
        // No local user data or sync check failed, verify with server
        const isValid = await isAuthenticated();
        if (isMounted) {
          if (isValid) {
            const currentUser = getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);
          } else {
            // Not authenticated, clear any stale data and redirect
            await logout();
            router.push('/auth/login');
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        if (isMounted) {
          await logout();
          router.push('/auth/login');
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]); // Only depend on router

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
 * Uses singleton pattern to ensure only one auth interval runs globally
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authManager = AuthManager.getInstance();
    
    // Subscribe to auth updates
    const unsubscribe = authManager.subscribe((user, loading) => {
      setUser(user);
      setLoading(loading);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []); // Empty dependency array - no dependencies that change!

  const handleLogout = async () => {
    console.log('[AuthGuard] Starting logout process...');
    try {
      await logout();
      console.log('[AuthGuard] Logout API call completed');
      // The auth manager will handle the state update
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('[AuthGuard] Logout failed:', error);
      // Force logout even if API call fails - clear local data and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_provider');
        localStorage.removeItem('oauth_state');
        // Also clear any mock auth tokens
        localStorage.removeItem('mock_auth_token');
        localStorage.removeItem('mock_auth_expires');
        localStorage.removeItem('mock_refresh_token');
        localStorage.removeItem('mock_refresh_expires');
      }
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
        {user.provider && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            via {user.provider}
          </p>
        )}
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