import { useState, useEffect } from 'react';
import { isAuthenticated } from '@/utils/auth';

/**
 * Hook to get current authentication status
 * Returns null during loading to prevent hydration issues
 */
export const useAuthStatus = () => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (isMounted) {
          setIsAuth(authenticated);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMounted) {
          setIsAuth(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isAuthenticated: isAuth, isLoading };
};
