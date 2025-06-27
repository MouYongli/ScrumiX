/**
 * Authentication utility functions for Keycloak integration
 */

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_verified: boolean;
  provider: string;
}

/**
 * Get the current user from localStorage
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Get the current Keycloak access token
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('keycloak_access_token');
};

/**
 * Get the current Keycloak refresh token
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('keycloak_refresh_token');
};

/**
 * Check if the current token is expired
 */
export const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const expiresAt = localStorage.getItem('token_expires_at');
  if (!expiresAt) return true;
  
  return Date.now() >= parseInt(expiresAt);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  const token = getAccessToken();
  const isExpired = isTokenExpired();
  
  return !!(user && token && !isExpired);
};

/**
 * Get authentication provider
 */
export const getAuthProvider = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_provider');
};

/**
 * Logout user by clearing all stored data
 */
export const logout = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('user');
  localStorage.removeItem('keycloak_access_token');
  localStorage.removeItem('keycloak_refresh_token');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('auth_provider');
  localStorage.removeItem('oauth_state');
};

/**
 * Make an authenticated API request
 */
export const authenticatedFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('No access token available');
  }
  
  if (isTokenExpired()) {
    throw new Error('Token expired');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Refresh the Keycloak token (if needed in the future)
 */
export const refreshToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    // This would need to be implemented if you want to refresh tokens
    // For now, we'll just redirect to login when tokens expire
    console.log('Token refresh not implemented - redirecting to login');
    logout();
    window.location.href = '/auth/login';
    return false;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    logout();
    return false;
  }
}; 